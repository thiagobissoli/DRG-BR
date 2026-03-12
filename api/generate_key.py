#!/usr/bin/env python3
"""
Gera uma nova chave de API e exibe uma única vez.
Uso: python -m api.generate_key [--name "Minha aplicação"]
"""
import argparse
from api.auth import APIKeyStore


def main():
    p = argparse.ArgumentParser(description="Gerar chave de API DRG-BR")
    p.add_argument("--name", default="", help="Nome/identificação da chave")
    p.add_argument("--db", default=None, help="Caminho do banco (default: data/api_keys.db)")
    args = p.parse_args()
    store = APIKeyStore(db_path=args.db)
    key = store.generate(name=args.name or None)
    print("Chave de API gerada. Guarde em local seguro (não será exibida novamente):")
    print(key)


if __name__ == "__main__":
    main()
