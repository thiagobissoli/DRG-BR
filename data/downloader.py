"""
Download automático de bases: SIH-SUS, CID-10, SIGTAP, CC/MCC.
"""
import json
import logging
import re
import sys
from pathlib import Path
from typing import List, Optional

from data.database import DRGDatabase

logger = logging.getLogger(__name__)


class DataDownloader:
    """
    Orquestra download de todas as fontes e popula o SQLite.
    Fallback: PySUS -> FTP DATASUS -> dados embutidos.
    """

    def __init__(self, db: DRGDatabase, cache_dir: str = "data/cache"):
        self.db = db
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def download_all(
        self,
        states: Optional[List[str]] = None,
        years: Optional[List[int]] = None,
        months: Optional[List[int]] = None,
        force: bool = False,
    ):
        self.db.init_schema()
        states = states or ['ES']
        years = years or [2022, 2023]
        months = months or list(range(1, 13))

        # 1. CID-10
        try:
            self._download_cid10(force)
        except Exception as e:
            logger.warning(f"CID-10: {e}")

        # 2. SIGTAP
        try:
            self._download_sigtap(force)
        except Exception as e:
            logger.warning(f"SIGTAP: {e}")

        # 3. CC/MCC
        try:
            self._download_cc_mcc(force)
        except Exception as e:
            logger.warning(f"CC/MCC: {e}")

        # 4. SIH-SUS
        try:
            self._download_sih(states, years, months, force)
        except Exception as e:
            logger.warning(f"SIH-SUS: {e}")

        logger.info("Download concluído")

    def _download_cid10(self, force: bool):
        conn = self.db._get_conn()
        cur = conn.execute("SELECT COUNT(*) FROM cid10")
        if cur.fetchone()[0] > 0 and not force:
            logger.info("CID-10 já presente no banco")
            return
        # Inserir alguns códigos exemplo para permitir treino sintético
        exemplos = [
            ('A00', 'Cólera'), ('I21', 'IAM'), ('I210', 'IAM parede anterior'),
            ('J18', 'Pneumonia'), ('J189', 'Pneumonia não especificada'),
            ('K80', 'Colelitíase'), ('K802', 'Cálculo c/ colecistite'),
        ]
        conn.executemany(
            "INSERT OR IGNORE INTO cid10 (codigo, descricao) VALUES (?, ?)",
            exemplos,
        )
        conn.commit()
        logger.info(f"CID-10: {len(exemplos)} códigos inseridos (exemplo)")

    def _download_sigtap(self, force: bool):
        conn = self.db._get_conn()
        cur = conn.execute("SELECT COUNT(*) FROM sigtap")
        if cur.fetchone()[0] > 0 and not force:
            logger.info("SIGTAP já presente no banco")
            return
        exemplos = [
            ('0406020043', 'Procedimento exemplo 1', '04'),
            ('0407010025', 'Procedimento exemplo 2', '04'),
            ('0303010088', 'Procedimento exemplo 3', '03'),
        ]
        conn.executemany(
            "INSERT OR IGNORE INTO sigtap (codigo, descricao, grupo) VALUES (?, ?, ?)",
            exemplos,
        )
        conn.commit()
        logger.info(f"SIGTAP: {len(exemplos)} códigos inseridos (exemplo)")

    def _download_cc_mcc(self, force: bool):
        conn = self.db._get_conn()
        cur = conn.execute("SELECT COUNT(*) FROM cc_mcc")
        if cur.fetchone()[0] > 0 and not force:
            logger.info("CC/MCC já presente no banco")
            return
        # Carregar de data/cc_mcc_sources/msdrg_v41_cc_mcc.json (gerado por scripts/fetch_cc_mcc_from_cms.py)
        root = Path(__file__).resolve().parent.parent
        json_path = root / "data" / "cc_mcc_sources" / "msdrg_v41_cc_mcc.json"
        if not json_path.exists():
            try:
                import subprocess
                subprocess.run(
                    [sys.executable, str(root / "scripts" / "fetch_cc_mcc_from_cms.py")],
                    cwd=str(root),
                    check=False,
                    capture_output=True,
                    timeout=60,
                )
            except Exception as e:
                logger.debug(f"Script fetch_cc_mcc: {e}")
        if not json_path.exists():
            logger.warning("CC/MCC: arquivo msdrg_v41_cc_mcc.json não encontrado. Execute: python scripts/fetch_cc_mcc_from_cms.py")
            return
        try:
            import json as _json
            with open(json_path, "r", encoding="utf-8") as f:
                data = _json.load(f)
        except Exception as e:
            logger.warning(f"CC/MCC: erro ao ler {json_path}: {e}")
            return
        mdc_all = "*"
        inserted = 0
        for codigo in data.get("mcc", []):
            if codigo and len(str(codigo).strip()) >= 3:
                try:
                    conn.execute(
                        "INSERT OR IGNORE INTO cc_mcc (mdc, tipo, codigo) VALUES (?, ?, ?)",
                        (mdc_all, "MCC", str(codigo).upper().strip().replace(".", "")[:7]),
                    )
                    inserted += 1
                except Exception:
                    pass
        for codigo in data.get("cc", []):
            if codigo and len(str(codigo).strip()) >= 3:
                try:
                    conn.execute(
                        "INSERT OR IGNORE INTO cc_mcc (mdc, tipo, codigo) VALUES (?, ?, ?)",
                        (mdc_all, "CC", str(codigo).upper().strip().replace(".", "")[:7]),
                    )
                    inserted += 1
                except Exception:
                    pass
        conn.commit()
        logger.info(f"CC/MCC: {inserted} códigos inseridos a partir de {json_path.name}")

    def _download_sih(self, states: List[str], years: List[int], months: List[int], force: bool):
        try:
            from pysus.online_data.SIH import download as sih_download
        except ImportError:
            logger.warning("PySUS não instalado. SIH-SUS não baixado. pip install pysus")
            return
        conn = self.db._get_conn()
        try:
            # PySUS 1.x: download(states, years, months, groups, data_dir)
            # RD = AIH Reduzida (internações)
            downloaded = sih_download(
                states=states,
                years=years,
                months=months,
                groups="RD",
                data_dir=str(self.cache_dir),
            )
        except Exception as e:
            logger.warning(f"SIH-SUS download falhou: {e}")
            return
        if not downloaded:
            logger.warning("SIH-SUS: nenhum arquivo retornado (verifique UF/ano/mês no FTP DATASUS)")
            return
        # Mapeamento SIH-RD (Parquet) → sih_internacoes:
        #   DIAG_PRINC→cid_principal, PROC_REA→procedimento, NASC/IDADE→idade, SEXO→sexo,
        #   DIAS_PERM→dias_internacao, VAL_TOT→valor_sus, UTI_MES_TO/UTI_MES_*→dias_uti,
        #   INFEHOSP (preenchido)→evento_adverso, dias_uti>0→intervencao_uti, MORTE→obito.
        # valor_suplementar não existe no SIH (apenas SUS); fica 0.
        total = 0
        for parquet_file in downloaded:
            try:
                df = parquet_file.to_dataframe()
            except Exception as e:
                logger.debug(f"Erro ao ler Parquet: {e}")
                continue
            if df is None or len(df) == 0:
                continue
            # Normalizar nomes de colunas (layout SIH-RD pode vir em maiúsculas)
            cols = {c.upper(): c for c in df.columns}
            def _col(row, *nomes):
                for n in nomes:
                    key = n.upper()
                    if key in cols and cols[key] in row.index:
                        val = row[cols[key]]
                        if val is not None and (isinstance(val, str) or str(val).strip() != ""):
                            return val
                return None
            # Colunas de diagnósticos secundários: DIAG_SECUN_1, DIAG_SECUN_2, DIAG_SEC_1, etc.
            diag_sec_cols = []
            for col_upper, col_orig in cols.items():
                if re.match(r"DIAG_SEC(UN)?_\d+", col_upper) or (col_upper.startswith("DIAG_SEC") and "_" in col_upper and col_upper != "DIAG_PRINC"):
                    diag_sec_cols.append((col_upper, col_orig))
            diag_sec_cols.sort(key=lambda x: x[0])
            if total == 0:
                logger.info(f"SIH-RD colunas disponíveis: {list(df.columns)[:15]}...")
                if diag_sec_cols:
                    logger.info(f"CIDs secundários: {[c[0] for c in diag_sec_cols]}")
            for _, row in df.iterrows():
                try:
                    cid = str(_col(row, "DIAG_PRINC", "DIAG_PRINCIPAL") or "")[:6].strip()
                    if not cid or cid == "nan":
                        continue
                    proc = str(_col(row, "PROC_REA", "PA_PROC_ID", "PROCEDIMENTO") or "")[:10].strip()
                    # Idade: NASC (data) ou idade direta
                    nasc = _col(row, "NASC", "DT_NASC")
                    if nasc is not None:
                        try:
                            from datetime import datetime
                            s = str(nasc).replace("-", "")[:8]
                            ano_nasc = int(s[:4]) if len(s) >= 4 else 2000
                            idade = max(0, min(120, datetime.now().year - ano_nasc))
                        except Exception:
                            idade = 50
                    else:
                        idade = 50
                    sexo = 0
                    sx = _col(row, "SEXO", "CS_SEXO")
                    if sx is not None and str(sx).strip():
                        sexo = 1 if str(sx).strip() in ("2", "F", "FEM", "Feminino") else 0
                    dias = _col(row, "DIAS_PERM", "QT_DIARIAS", "DIAS_PERMANENCIA")
                    try:
                        dias = int(float(dias)) if dias is not None else 0
                    except (TypeError, ValueError):
                        dias = 0
                    # UTI: total de dias (UTI_MES_TO ou soma UTI_MES_IN/AN/AL/TO)
                    dias_uti = 0
                    for uti_col in ("UTI_MES_TO", "UTI_MES_IN", "UTI_MES_AN", "UTI_MES_AL"):
                        v = _col(row, uti_col)
                        if v is not None:
                            try:
                                dias_uti += int(float(str(v).strip()))
                            except (TypeError, ValueError):
                                pass
                    if dias_uti <= 0 and _col(row, "VAL_UTI"):
                        try:
                            if float(str(_col(row, "VAL_UTI")).strip()) > 0:
                                dias_uti = 1
                        except (TypeError, ValueError):
                            pass
                    valor_sus = None
                    vt = _col(row, "VAL_TOT", "VAL_TOT")
                    if vt is not None and str(vt).strip():
                        try:
                            valor_sus = float(str(vt).strip().replace(",", "."))
                        except (TypeError, ValueError):
                            pass
                    valor_sus = valor_sus if valor_sus is not None else 0.0
                    valor_suplementar = 0.0
                    obito = 0
                    mort = _col(row, "MORTE", "OBITO", "DTOBITO")
                    if mort is not None and str(mort).strip() in ("1", "S", "Sim"):
                        obito = 1
                    evento_adverso = 0
                    inf = _col(row, "INFEHOSP")
                    if inf is not None and str(inf).strip() and str(inf).strip() not in ("0", " "):
                        evento_adverso = 1
                    intervencao_uti = 1 if dias_uti > 0 else 0
                    ano = _col(row, "ANO_CMPT", "PA_ANO", "ANO")
                    mes = _col(row, "MES_CMPT", "PA_MES", "MES")
                    uf_raw = str(_col(row, "UF_ZI", "RES_UF", "UF") or (states[0] if states else "ES")).strip()
                    # DATASUS usa código IBGE (ex.: 32); converter para sigla (ES)
                    IBGE_TO_UF = {
                        '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
                        '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE', '29': 'BA',
                        '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR', '42': 'SC', '43': 'RS',
                        '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
                    }
                    uf = IBGE_TO_UF.get(uf_raw) if uf_raw.isdigit() else uf_raw.upper()[:2]
                    if not uf:
                        uf = (states[0] if states else "ES").upper()[:2]
                    try:
                        ano = int(ano) if ano is not None else 2024
                        mes = int(mes) if mes is not None else 1
                    except (TypeError, ValueError):
                        ano, mes = 2024, 1
                    # CIDs secundários: coletar de DIAG_SECUN_* / DIAG_SEC_*, normalizar, excluir principal
                    cids_sec_list = []
                    if diag_sec_cols:
                        seen = set()
                        cid_principal_norm = (cid or "").upper().replace(".", "").strip()[:7]
                        for col_upper, col_orig in diag_sec_cols:
                            val = row.get(col_orig) if col_orig in row.index else None
                            if val is None or (isinstance(val, str) and not val.strip()):
                                continue
                            code = str(val).upper().replace(".", "").strip()[:7]
                            if not code or code == "nan" or len(code) < 2:
                                continue
                            if code == cid_principal_norm or code in seen:
                                continue
                            seen.add(code)
                            cids_sec_list.append(code)
                    cids_secundarios_json = json.dumps(cids_sec_list, ensure_ascii=True)
                    conn.execute("""
                        INSERT INTO sih_internacoes
                        (uf, ano, mes, cid_principal, cids_secundarios, procedimento, idade, sexo, dias_internacao, dias_uti,
                         obito, valor_sus, valor_suplementar, evento_adverso, intervencao_uti)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (uf, ano, mes, cid, cids_secundarios_json, proc or "", idade, sexo, max(0, dias), max(0, dias_uti),
                          obito, valor_sus, valor_suplementar, evento_adverso, intervencao_uti))
                    total += 1
                except Exception as e:
                    logger.debug(f"Linha SIH: {e}")
                    continue
            conn.commit()
        if total > 0:
            logger.info(f"SIH-SUS: {total:,} internações inseridas no banco")
        else:
            logger.warning("SIH-SUS: nenhum registro inserido (verifique colunas do Parquet)")
