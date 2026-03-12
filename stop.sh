#!/usr/bin/env bash
# Para o backend da plataforma DRG-BR.
# Uso: ./stop.sh
set -e
cd "$(dirname "$0")"

DIR="$(pwd)"
PID_BACKEND="$DIR/.drg-br-backend.pid"

if [ -f "$PID_BACKEND" ]; then
  pid=$(cat "$PID_BACKEND")
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM "$pid" 2>/dev/null || true
    echo "Enviado SIGTERM ao backend (PID $pid)"
  fi
  rm -f "$PID_BACKEND"
fi
sleep 2
if command -v lsof >/dev/null 2>&1; then
  pids=$(lsof -ti :5001 2>/dev/null || true)
  if [ -n "$pids" ]; then
    for pid in $pids; do
      kill -TERM "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
      echo "Parado processo na porta 5001 (PID $pid)"
    done
  fi
fi
echo "DRG-BR parado."
