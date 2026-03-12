"""
DRG-BR: Pipeline Principal.

Fluxo completo:
1. Download automático de TODAS as bases → SQLite
2. Processamento a partir do SQLite
3. Feature engineering
4. Treinamento (Neural + GBM + Ensemble)
5. Avaliação e salvamento

Uso:
    # Pipeline completo (download + treino)
    python main.py --mode full --states ES --years 2022 2023 2024

    # Só download (popula SQLite)
    python main.py --mode download --states ES --years 2019 2020 2021 2022 2023

    # Só treino (usa SQLite já populado)
    python main.py --mode train

    # Predição
    python main.py --mode predict --model-dir models/

    # Status do banco
    python main.py --mode status
"""
import argparse
import logging
import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split

# Adicionar diretório ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import DATA_CFG, MODEL_CFG
from data.database import DRGDatabase
from data.downloader import DataDownloader
from data.processor import SQLiteDataProcessor
from features.feature_builder import FeatureBuilder
from training.trainer import DRGTrainer
from training.metrics import print_metrics
from inference.predictor import DRGPredictor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s │ %(name)-20s │ %(levelname)-8s │ %(message)s',
    datefmt='%H:%M:%S',
)
logger = logging.getLogger('DRG-BR')

# Banco de dados padrão
DEFAULT_DB_PATH = "data/drg_br.db"


def get_db(args) -> DRGDatabase:
    """Inicializa banco de dados."""
    return DRGDatabase(db_path=args.db_path)


# ====================================================================
# MODO: DOWNLOAD
# ====================================================================

def run_download(args):
    """Baixa todas as bases e popula o SQLite."""
    db = get_db(args)
    downloader = DataDownloader(db=db, cache_dir="data/cache")

    downloader.download_all(
        states=args.states,
        years=args.years,
        months=args.months,
        force=args.force,
    )


# ====================================================================
# MODO: TRAIN
# ====================================================================

def run_train(args):
    """Treina modelo a partir do SQLite."""
    db = get_db(args)

    # Verificar se tem dados
    stats = db.get_stats()
    sih_count = stats.get('sih_internacoes', 0)
    if sih_count == 0:
        logger.error("Banco SQLite sem internações! Execute o download primeiro:")
        logger.error("  python main.py --mode download --states ES --years 2022 2023")
        sys.exit(1)

    logger.info("=" * 70)
    logger.info("  DRG-BR: TREINAMENTO A PARTIR DO SQLite")
    logger.info(f"  Banco: {args.db_path}")
    logger.info(f"  Internações: {sih_count:,}")
    logger.info("=" * 70)

    # 1. Processar dados do SQLite
    processor = SQLiteDataProcessor(db)
    processor.load_cc_mcc_into_classifier()

    df = processor.prepare_training_data(
        uf=args.states[0] if args.states else None,
        anos=args.years if args.years else None,
        limit=args.limit,
    )

    if len(df) == 0:
        logger.error("Nenhum dado para treino. Verifique se sih_internacoes tem registros com cid_principal preenchido e se uf/anos batem com os dados (ex.: UF no banco pode ser código IBGE 32 para ES).")
        sys.exit(1)

    # 2. Split estratificado
    train_df, val_df, test_df = _split_data(df)

    # 3. Feature engineering
    fb = FeatureBuilder()
    fb.fit(train_df)

    train_set = fb.transform(train_df, include_targets=True)
    val_set = fb.transform(val_df, include_targets=True)
    test_set = fb.transform(test_df, include_targets=True)

    logger.info(f"Features numéricas: {train_set.numeric_features.shape[1]}")
    logger.info(f"CID vocab: {fb.cid_proc.vocab_size}")
    logger.info(f"SIGTAP vocab: {fb.sigtap_proc.vocab_size}")

    # 4. Treinamento
    trainer = DRGTrainer(config=MODEL_CFG, device=args.device)

    results = trainer.train_full_pipeline(
        train_set=train_set,
        val_set=val_set,
        test_set=test_set,
        cid_vocab_size=fb.cid_proc.vocab_size,
        sigtap_vocab_size=fb.sigtap_proc.vocab_size,
    )

    # 5. Salvar modelos
    model_dir = Path(args.model_dir)
    trainer.save_models(
        str(model_dir),
        cid_vocab_size=fb.cid_proc.vocab_size,
        sigtap_vocab_size=fb.sigtap_proc.vocab_size,
        n_numeric_features=train_set.numeric_features.shape[1],
    )
    fb.save(str(model_dir / "feature_builder.pkl"))

    # 6. Salvar CC/MCC para uso offline na inferência
    from config.drg_tables import cc_mcc_classifier
    cc_mcc_classifier.save_to_json(str(model_dir / "cc_mcc.json"))

    logger.info("=" * 70)
    logger.info("  TREINAMENTO CONCLUÍDO!")
    logger.info(f"  Modelos salvos em: {model_dir}")
    logger.info("=" * 70)

    return results


def _split_data(df: pd.DataFrame) -> tuple:
    """Split treino/validação/teste (estratificado por MDC quando possível)."""
    from config.drg_tables import get_mdc_from_cid

    cfg = DATA_CFG

    df = df.copy()
    df['_mdc'] = df['cid_principal'].apply(get_mdc_from_cid)

    # Agrupar MDCs raros para stratify funcionar
    mdc_counts = df['_mdc'].value_counts()
    rare_mdcs = mdc_counts[mdc_counts < 10].index
    df.loc[df['_mdc'].isin(rare_mdcs), '_mdc'] = '99'

    # Stratify exige pelo menos 2 amostras por classe; senão faz split simples
    counts_after = df['_mdc'].value_counts()
    use_stratify = (counts_after >= 2).all()
    if not use_stratify:
        logger.warning("Poucos dados por MDC: usando split aleatório (sem estratificação).")

    stratify_1 = df['_mdc'] if use_stratify else None
    train_df, temp_df = train_test_split(
        df, test_size=(1 - cfg.train_ratio),
        stratify=stratify_1, random_state=42, shuffle=True,
    )

    val_ratio_adj = cfg.val_ratio / (cfg.val_ratio + cfg.test_ratio)
    # Segundo split também exige >= 2 por classe no temp_df
    use_stratify_2 = use_stratify and (temp_df['_mdc'].value_counts() >= 2).all()
    stratify_2 = temp_df['_mdc'] if use_stratify_2 else None
    val_df, test_df = train_test_split(
        temp_df, test_size=(1 - val_ratio_adj),
        stratify=stratify_2, random_state=42, shuffle=True,
    )

    for d in [train_df, val_df, test_df]:
        d.drop('_mdc', axis=1, inplace=True)

    logger.info(f"Split: Train={len(train_df):,}  Val={len(val_df):,}  Test={len(test_df):,}")
    return train_df.reset_index(drop=True), val_df.reset_index(drop=True), test_df.reset_index(drop=True)


# ====================================================================
# MODO: FULL (download + train)
# ====================================================================

def run_full(args):
    """Pipeline completo: download → SQLite → treinamento."""
    logger.info("=" * 70)
    logger.info("  DRG-BR: PIPELINE COMPLETO (DOWNLOAD + TREINAMENTO)")
    logger.info("=" * 70)

    # Download
    run_download(args)

    # Treinamento
    run_train(args)


# ====================================================================
# MODO: PREDICT
# ====================================================================

def run_predict(args):
    """Executa predições de exemplo."""
    predictor = DRGPredictor.load(args.model_dir)

    examples = [
        {
            'cid_principal': 'I21.0',
            'cids_secundarios': ['I10', 'E11.9', 'I48'],
            'procedimento_sigtap': '0406020043',
            'idade': 65, 'sexo': 0, 'urgencia': 1,
        },
        {
            'cid_principal': 'K80.2',
            'cids_secundarios': ['E66.9'],
            'procedimento_sigtap': '0407010025',
            'idade': 45, 'sexo': 1, 'urgencia': 0,
        },
        {
            'cid_principal': 'J18.9',
            'cids_secundarios': ['J44.1', 'E11.9', 'I10', 'N18.0'],
            'procedimento_sigtap': '0303010088',
            'idade': 72, 'sexo': 0, 'urgencia': 1,
        },
        {
            'cid_principal': 'A41.9',
            'cids_secundarios': ['J96.0', 'N17.9', 'R65.21', 'D65', 'E11.9'],
            'procedimento_sigtap': '0303170093',
            'idade': 68, 'sexo': 0, 'urgencia': 1,
        },
    ]

    print("\n" + "=" * 70)
    print("  EXEMPLOS DE PREDIÇÃO DRG-BR")
    print("=" * 70)

    for i, ex in enumerate(examples):
        print(f"\n{'─' * 70}")
        print(f"  Caso {i + 1}: CID={ex['cid_principal']}, Proc={ex['procedimento_sigtap']}")
        print(f"  CIDs Sec: {ex['cids_secundarios']}")
        print(f"  Idade={ex['idade']}, Sexo={'M' if ex['sexo'] == 0 else 'F'}, "
              f"{'Urgência' if ex['urgencia'] else 'Eletivo'}")
        print(f"{'─' * 70}")

        result = predictor.predict(**ex)

        print(f"  DRG-BR: {result.get('drg_br_code', 'N/A')}")
        print(f"  MDC: {result.get('mdc', '')} - {result.get('mdc_title', '')}")
        print(f"  Tipo: {'Cirúrgico' if result.get('is_surgical') else 'Clínico'}")
        sev = result.get('severity', 0)
        print(f"  Severidade: {sev} ({'MCC' if sev == 2 else 'CC' if sev == 1 else 'Sem CC'})")

        print(f"\n  Predições:")
        for key, label, fmt in [
            ('los_aritmetico', 'LOS', '{:.1f} dias'),
            ('custo_sus', 'Custo SUS', 'R$ {:,.2f}'),
            ('custo_suplementar', 'Custo Suplementar', 'R$ {:,.2f}'),
            ('prob_obito', 'P(Óbito)', '{:.1%}'),
            ('prob_evento_adverso', 'P(Evento Adverso)', '{:.1%}'),
            ('prob_intervencao_uti', 'P(UTI)', '{:.1%}'),
            ('los_uti_aritmetico', 'LOS UTI', '{:.1f} dias'),
        ]:
            if key in result:
                print(f"    {label:25s} {fmt.format(result[key])}")


# ====================================================================
# MODO: TEST (avalia modelo na base SIH-SUS)
# ====================================================================

def run_test(args):
    """Avalia o modelo em uma amostra da base SIH-SUS e exibe resultados de acerto."""
    import numpy as np
    from config.settings import REGRESSION_TARGETS, CLASSIFICATION_TARGETS

    db = get_db(args)
    processor = SQLiteDataProcessor(db)
    processor.load_cc_mcc_into_classifier()

    # Amostra de teste (não usada no treino): limit ou 5000
    n_test = args.limit or 5000
    df = processor.prepare_training_data(
        uf=args.states[0] if args.states else None,
        anos=args.years if args.years else None,
        limit=n_test + 50000,  # pega mais e depois amostra para evitar viés de ordem
    )
    if len(df) == 0:
        logger.error("Nenhum dado no banco para teste.")
        sys.exit(1)
    # Amostra aleatória para teste
    df = df.sample(n=min(n_test, len(df)), random_state=42).reset_index(drop=True)
    n_test = len(df)
    logger.info(f"Testando em {n_test:,} registros da base SIH-SUS")

    predictor = DRGPredictor.load(args.model_dir)
    pred_los_a, real_los_a = [], []
    pred_obito, real_obito = [], []
    pred_evento, real_evento = [], []
    pred_uti, real_uti = [], []
    pred_custo_sus, real_custo_sus = [], []
    pred_los_uti_a, real_los_uti_a = [], []

    for i in range(n_test):
        row = df.iloc[i]
        cids_sec = row.get('cids_secundarios', [])
        if not isinstance(cids_sec, list):
            cids_sec = []
        try:
            out = predictor.predict(
                cid_principal=row['cid_principal'],
                cids_secundarios=cids_sec,
                procedimento_sigtap=row['procedimento'],
                idade=int(row.get('idade', 50)),
                sexo=int(row.get('sexo', 0)),
                urgencia=int(row.get('urgencia', 1)),
            )
        except Exception as e:
            logger.debug(f"Erro predição linha {i}: {e}")
            continue
        real_los_a.append(float(row['los_aritmetico']))
        pred_los_a.append(float(out.get('los_aritmetico', 0)))
        real_obito.append(int(row.get('obito', 0)))
        pred_obito.append(1 if float(out.get('prob_obito', 0)) >= 0.5 else 0)
        real_evento.append(int(row.get('evento_adverso', 0)))
        pred_evento.append(1 if float(out.get('prob_evento_adverso', 0)) >= 0.5 else 0)
        real_uti.append(int(row.get('intervencao_uti', 0)))
        pred_uti.append(1 if float(out.get('prob_intervencao_uti', 0)) >= 0.5 else 0)
        real_custo_sus.append(float(row.get('custo_sus', 0)))
        pred_custo_sus.append(float(out.get('custo_sus', 0)))
        real_los_uti_a.append(float(row.get('los_uti_aritmetico', 0)))
        pred_los_uti_a.append(float(out.get('los_uti_aritmetico', 0)))

    real_los_a = np.array(real_los_a)
    pred_los_a = np.array(pred_los_a)
    real_obito = np.array(real_obito)
    pred_obito = np.array(pred_obito)
    real_evento = np.array(real_evento)
    pred_evento = np.array(pred_evento)
    real_uti = np.array(real_uti)
    pred_uti = np.array(pred_uti)
    real_custo_sus = np.array(real_custo_sus)
    pred_custo_sus = np.array(pred_custo_sus)
    real_los_uti_a = np.array(real_los_uti_a)
    pred_los_uti_a = np.array(pred_los_uti_a)

    # Métricas
    mae_los = np.mean(np.abs(pred_los_a - real_los_a))
    rmse_los = np.sqrt(np.mean((pred_los_a - real_los_a) ** 2))
    acc_obito = np.mean(pred_obito == real_obito)
    acc_evento = np.mean(pred_evento == real_evento)
    acc_uti = np.mean(pred_uti == real_uti)
    # Custo e LOS UTI só se houver variância nos reais
    mae_custo = np.mean(np.abs(pred_custo_sus - real_custo_sus)) if np.any(real_custo_sus != 0) else float('nan')
    mae_los_uti = np.mean(np.abs(pred_los_uti_a - real_los_uti_a)) if np.any(real_los_uti_a != 0) else float('nan')
    # Recall (dos positivos reais, quantos o modelo identificou)
    pos_obito = real_obito == 1
    recall_obito = np.mean(pred_obito[pos_obito] == 1) if pos_obito.sum() > 0 else float('nan')
    pos_evento = real_evento == 1
    recall_evento = np.mean(pred_evento[pos_evento] == 1) if pos_evento.sum() > 0 else float('nan')
    pos_uti = real_uti == 1
    recall_uti = np.mean(pred_uti[pos_uti] == 1) if pos_uti.sum() > 0 else float('nan')

    # Relatório
    print("\n" + "=" * 70)
    print("  DRG-BR: RESULTADOS DE TESTE NA BASE SIH-SUS")
    print(f"  Amostra: {n_test:,} internações  |  Modelo: {args.model_dir}")
    print("=" * 70)

    print("\n  REGRESSÃO (erro médio)")
    print("  " + "─" * 50)
    print(f"  LOS (dias)          MAE: {mae_los:.2f} dias   RMSE: {rmse_los:.2f} dias")
    if not np.isnan(mae_custo):
        print(f"  Custo SUS (R$)      MAE: R$ {mae_custo:,.2f}")
    else:
        print(f"  Custo SUS (R$)      (reais sem variância no teste)")
    if not np.isnan(mae_los_uti):
        print(f"  LOS UTI (dias)      MAE: {mae_los_uti:.2f} dias")
    else:
        print(f"  LOS UTI (dias)      (reais sem UTI no teste)")

    print("\n  CLASSIFICAÇÃO (acurácia)")
    print("  " + "─" * 50)
    print(f"  Óbito               Acurácia: {acc_obito:.2%}   (Recall óbito: {recall_obito:.2%})" if not np.isnan(recall_obito) else f"  Óbito               Acurácia: {acc_obito:.2%}")
    print(f"  Evento adverso      Acurácia: {acc_evento:.2%}   (Recall evento: {recall_evento:.2%})" if not np.isnan(recall_evento) else f"  Evento adverso      Acurácia: {acc_evento:.2%}")
    print(f"  Intervenção UTI     Acurácia: {acc_uti:.2%}   (Recall UTI: {recall_uti:.2%})" if not np.isnan(recall_uti) else f"  Intervenção UTI     Acurácia: {acc_uti:.2%}")

    print("\n  RESUMO")
    print("  " + "─" * 50)
    print(f"  Total de predições: {n_test:,}")
    print("=" * 70 + "\n")


# ====================================================================
# MODO: STATUS
# ====================================================================

def run_status(args):
    """Mostra status do banco de dados."""
    db = get_db(args)
    stats = db.get_stats()

    print("\n" + "=" * 70)
    print("  DRG-BR: STATUS DO BANCO DE DADOS")
    print(f"  Arquivo: {args.db_path}")
    print("=" * 70)

    for table, count in sorted(stats.items()):
        if table == 'downloads':
            continue
        if isinstance(count, int):
            status = "✓" if count > 0 else "✗"
            print(f"  {status} {table:30s} │ {count:>12,} registros")

    if 'downloads' in stats and stats['downloads']:
        print(f"\n  {'─' * 50}")
        print(f"  Histórico de downloads:")
        for fonte, info in stats['downloads'].items():
            print(f"    {fonte:15s} │ {info['count']} downloads, {info['records']:,} registros")

    print("=" * 70)

    # Verificar prontidão para treino
    sih = stats.get('sih_internacoes', 0)
    cc = stats.get('cc_mcc', 0)

    print()
    if sih > 0 and cc > 0:
        print("  ✓ Banco PRONTO para treinamento.")
        print(f"    Comando: python main.py --mode train")
    elif sih > 0:
        print("  ⚠ Banco tem internações mas falta CC/MCC. Execute download:")
        print(f"    python main.py --mode download --force")
    else:
        print("  ✗ Banco VAZIO. Execute o download primeiro:")
        print(f"    python main.py --mode download --states ES --years 2022 2023")
    print()


# ====================================================================
# MODO: API KEY (gerar chave de API)
# ====================================================================

def run_api_key(args):
    """Gera uma nova chave de API e exibe uma única vez."""
    from api.auth import APIKeyStore
    store = APIKeyStore()
    key = store.generate(name=args.api_key_name or None)
    print("Chave de API gerada. Guarde em local seguro (não será exibida novamente):")
    print(key)


# ====================================================================
# MODO: SERVE (subir a API REST)
# ====================================================================

def run_serve(args):
    """Sobe a API REST DRG-BR (FastAPI + Uvicorn)."""
    import uvicorn
    os.environ.setdefault("DRG_MODEL_DIR", str(Path(args.model_dir).resolve()))
    uvicorn.run(
        "api.main:app",
        host=args.host,
        port=args.port,
        reload=getattr(args, "reload", False),
    )


# ====================================================================
# MAIN
# ====================================================================

def main():
    parser = argparse.ArgumentParser(
        description="DRG-BR: Sistema Preditivo Multi-Target",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  # Pipeline completo (download + treino)
  python main.py --mode full --states ES --years 2022 2023

  # Só download
  python main.py --mode download --states ES --years 2019 2020 2021 2022 2023

  # Só treino (SQLite já populado)
  python main.py --mode train

  # Predição
  python main.py --mode predict

  # Status do banco
  python main.py --mode status
        """,
    )

    parser.add_argument('--mode', choices=['full', 'download', 'train', 'predict', 'test', 'status', 'api-key', 'serve'],
                        default='full',
                        help='Modo de operação')
    parser.add_argument('--db-path', default=DEFAULT_DB_PATH,
                        help=f'Caminho do banco SQLite (default: {DEFAULT_DB_PATH})')
    parser.add_argument('--states', nargs='+', default=['ES'],
                        help='UFs para download SIH-SUS (default: ES)')
    parser.add_argument('--years', nargs='+', type=int, default=None,
                        help='Anos para download (default: 2019-2024)')
    parser.add_argument('--months', nargs='+', type=int, default=None,
                        help='Meses para download (default: todos)')
    parser.add_argument('--force', action='store_true',
                        help='Forçar re-download mesmo se dados já existem')
    parser.add_argument('--limit', type=int, default=None,
                        help='Limitar registros de treino (para teste rápido)')
    parser.add_argument('--model-dir', default='models',
                        help='Diretório dos modelos')
    parser.add_argument('--device', default='auto',
                        help='Device PyTorch (auto/cpu/cuda/mps)')
    parser.add_argument('--epochs', type=int, default=None)
    parser.add_argument('--batch-size', type=int, default=None)
    parser.add_argument('--api-key-name', default=None, help='Nome da chave (modo api-key)')
    parser.add_argument('--host', default='0.0.0.0', help='Host da API (modo serve)')
    parser.add_argument('--port', type=int, default=8000, help='Porta da API (modo serve)')

    args = parser.parse_args()

    # Defaults para years
    if args.years is None:
        if args.mode in ('download', 'full'):
            args.years = [2019, 2020, 2021, 2022, 2023, 2024]
        else:
            args.years = None  # Usar todos do banco

    # Override configs
    if args.epochs:
        MODEL_CFG.epochs = args.epochs
    if args.batch_size:
        MODEL_CFG.batch_size = args.batch_size

    # Executar
    mode_map = {
        'full': run_full,
        'download': run_download,
        'train': run_train,
        'predict': run_predict,
        'test': run_test,
        'status': run_status,
        'api-key': run_api_key,
        'serve': run_serve,
    }

    mode_map[args.mode](args)


if __name__ == '__main__':
    main()
