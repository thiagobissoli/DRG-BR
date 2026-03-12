# Fontes CC/MCC (MS-DRG v41)

A tabela `cc_mcc` do banco DRG-BR é populada a partir do arquivo **msdrg_v41_cc_mcc.json** neste diretório.

## Como gerar o arquivo

```bash
python scripts/fetch_cc_mcc_from_cms.py
```

- Se o site do CMS for acessível, o script tenta extrair códigos do [Manual MS-DRG v41.1](https://www.cms.gov/icd10m/FY2024-version41.1-fullcode-cms/fullcode_cms/P0030.html) (Appendix C / Appendix H).
- Se o acesso falhar (403, SSL, etc.), é gravada uma **amostra embutida** com ~130 MCC e ~155 CC (ICD-10-CM) baseada em documentação pública CMS.

## Estrutura do JSON

```json
{
  "mcc": ["R6521", "N179", "J9601", ...],
  "cc": ["E1165", "I10", "N183", ...]
}
```

Códigos em maiúsculas, **sem ponto** (ex.: `R65.21` → `R6521`). O campo `mdc` na tabela é preenchido com `*` (aplica a todos os MDCs).

## Fontes oficiais CMS

- **Appendix C:** CC/MCC Exclusion List  
- **Appendix H:** Diagnoses Defined as Major Complications or Comorbidities (MCC)  
- Manual: [MS-DRG Classifications and Software](https://www.cms.gov/medicare/payment/prospective-payment-systems/acute-inpatient-pps/ms-drg-classifications-and-software)

Para obter a lista completa, você pode baixar o manual em PDF/HTML no CMS e preencher manualmente o JSON ou adaptar o script com os links exatos das páginas dos apêndices.
