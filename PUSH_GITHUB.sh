#!/bin/bash
# Execute na pasta do projeto para enviar o código ao GitHub.
# Requer autenticação (token ou SSH).

set -e
cd "$(dirname "$0")"

if ! git remote get-url origin &>/dev/null; then
  git remote add origin https://github.com/thiagobissoli/DRG-BR.git
fi

echo "Enviando para https://github.com/thiagobissoli/DRG-BR.git ..."
git push -u origin main
echo "Concluído."
