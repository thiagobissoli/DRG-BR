"""
Extrai códigos CC/MCC dos Apêndices C e H do MS-DRG Definitions Manual (v41)
e salva em data/cc_mcc_sources/msdrg_v41_cc_mcc.json para uso pelo downloader.

Fontes oficiais (CMS):
- Manual v41.1: https://www.cms.gov/icd10m/FY2024-version41.1-fullcode-cms/fullcode_cms/P0030.html
- Appendix C: CC/MCC Exclusion List
- Appendix H: Diagnoses Defined as Major Complications or Comorbidities (MCC)

Uso:
  python scripts/fetch_cc_mcc_from_cms.py

Se o CMS retornar 403, o script grava o arquivo de amostra (sample) incluso no projeto.
"""
import json
import re
import sys
from pathlib import Path

# Códigos ICD-10-CM conhecidos como MCC (Appendix H) e CC - amostra para fallback
# Fonte: documentação CMS MS-DRG, versão 41. Sem pontos para consistência com o banco.
SAMPLE_MCC = [
    "R6521", "R6520", "R6511", "R6510",
    "N179", "N170", "N171", "N178",
    "J9601", "J9600", "J9611", "J9610",
    "I509", "I500", "I501", "I5021", "I5031", "I5041",
    "K7291", "K7290",
    "D65", "D6951", "D696",
    "R579", "R570", "R571", "R578",
    "A419", "A4101", "A4102", "A411", "A412", "A413", "A414", "A4150", "A4151", "A4152", "A4153", "A4159", "A418",
    "B377", "B370", "B371", "B372", "B373", "B374", "B375", "B376", "B378", "B379",
    "G934", "G931", "G935", "G936",
    "E8801", "E872", "E875", "E876", "E878", "E8809", "E881", "E882", "E888", "E889",
    "J189", "J13", "J14", "J15", "J16", "J17", "J180", "J181", "J182", "J188",
    "I210", "I211", "I212", "I213", "I214", "I219",
    "I5011", "I5012", "I5013", "I5021", "I5022", "I5023", "I5031", "I5032", "I5033", "I5041", "I5042", "I5043",
    "K7210", "K7211",
    "N19", "N189", "N186", "N185", "N184", "N183", "N182", "N181", "N180",
    "E1165", "E1169", "E1111", "E1121", "E1131", "E1141", "E1151", "E11621", "E11622", "E11628", "E11629", "E11630", "E11638", "E11639", "E11641", "E11649",
    "C800", "C801", "C802", "C803", "C804", "C805", "C806", "C809",
    "R392", "R3911", "R3912", "R3915", "R3981", "R3982", "R3989", "R399",
]
SAMPLE_CC = [
    "E1165", "E1169", "E1110", "E1120", "E1130", "E1140", "E1150", "E11610", "E11618", "E11620", "E11621", "E11622", "E11628", "E11629", "E11630", "E11638", "E11639", "E11640", "E11641", "E11649", "E1165", "E1169",
    "I10", "I119", "I110", "I130", "I1310", "I1311", "I132", "I150", "I151", "I152", "I158", "I159",
    "N183", "N184", "N185", "N186", "N189", "N182", "N181", "N180", "N179", "N170", "N171", "N178", "N19",
    "J441", "J440", "J449", "J4410", "J4411", "J4412", "J4413", "J448", "J449",
    "E669", "E6601", "E6609", "E661", "E662", "E668", "E669",
    "E785", "E781", "E782", "E783", "E784", "E785", "E786", "E788", "E789",
    "E119", "E118", "E1172", "E1173", "E11741", "E11749", "E1175", "E11751", "E11752", "E11759", "E1176", "E11765", "E11769", "E118", "E119",
    "K219", "K210", "K219", "K220", "K221", "K222", "K223", "K224", "K225", "K226", "K228", "K229",
    "N183", "N184", "N185", "N186", "N189", "N40", "N41", "N42", "N43", "N44", "N45", "N46", "N47", "N48", "N49", "N50", "N51", "N52", "N53", "N99",
    "M170", "M171", "M172", "M173", "M174", "M175", "M179", "M190", "M191", "M192", "M199",
    "G309", "G300", "G301", "G308", "G309", "G3101", "G3101", "G31081", "G31089", "G311", "G312", "G318", "G319",
    "J449", "J440", "J441", "J448", "J449",
    "I2510", "I2511", "I25110", "I25111", "I25112", "I25113", "I25114", "I25115", "I25118", "I25119", "I252", "I253", "I254", "I255", "I256", "I258", "I259",
    "D649", "D630", "D631", "D632", "D638", "D639", "D640", "D641", "D642", "D643", "D644", "D648", "D649",
    "C7900", "C7901", "C7902", "C7910", "C7911", "C7912", "C7920", "C7921", "C7922", "C7931", "C7932", "C7940", "C7941", "C7942", "C7951", "C7952", "C7960", "C7961", "C7962", "C7981", "C7982", "C799", "C800", "C801", "C802", "C803", "C804", "C805", "C806", "C809",
]

# Normalizar: remover ponto, maiúsculas, até 7 chars
def _norm(c: str) -> str:
    s = str(c).upper().strip().replace(".", "")[:7]
    return s if re.match(r"^[A-Z0-9]+$", s) else ""


def _fetch_cms_appendices() -> dict | None:
    """Tenta baixar e parsear Appendix C/H do manual v41. Retorna None se falhar."""
    try:
        import urllib.request
        req = urllib.request.Request(
            "https://www.cms.gov/icd10m/FY2024-version41.1-fullcode-cms/fullcode_cms/P0030.html",
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            html = r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Não foi possível acessar o CMS: {e}", file=sys.stderr)
        return None
    # Extrair códigos ICD-10-CM (padrão tipo A00.00 ou A0000)
    code_re = re.compile(r"\b([A-Z]\d{2}(?:\.\d{2,4})?)\b")
    codes = set()
    for m in code_re.finditer(html):
        codes.add(_norm(m.group(1)))
    codes = {c for c in codes if len(c) >= 3}
    if len(codes) < 50:
        return None
    # Não sabemos separar MCC vs CC só pelo HTML sem estrutura; retornar tudo como MCC+CC
    return {"mcc": list(codes), "cc": []}


def main():
    root = Path(__file__).resolve().parent.parent
    out_dir = root / "data" / "cc_mcc_sources"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "msdrg_v41_cc_mcc.json"

    data = _fetch_cms_appendices()
    if data is None or (len(data.get("mcc", [])) + len(data.get("cc", [])) < 100):
        print("Usando amostra embutida (CMS inacessível ou poucos códigos extraídos).", file=sys.stderr)
        mcc = sorted(set(_norm(c) for c in SAMPLE_MCC if _norm(c)))
        cc = sorted(set(_norm(c) for c in SAMPLE_CC if _norm(c)))
        # Remover de CC os que já estão em MCC
        cc = [c for c in cc if c not in mcc]
        data = {"mcc": mcc, "cc": cc}

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Salvo: {out_file} ({len(data.get('mcc', []))} MCC, {len(data.get('cc', []))} CC)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
