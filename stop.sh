#!/usr/bin/env bash
# Para backend e frontend da plataforma DRG-BR.
# Uso: ./stop.sh
set -e
cd "$(dirname "$0")"

DIR="$(pwd)"
PID_BACKEND="$DIR/.drg-br-backend.pid"
PID_FRONTEND="$DIR/.drg-br-frontend.pid"

stop_pid() {
  local name="$1"
  local path="$2"
  if [ -f "$path" ]; then
    local pid
    pid=$(cat "$path")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
      echo "Enviado SIGTERM ao $name (PID $pid)"
    fi
    rm -f "$path"
  fi
}

# Para pelos PIDs gravados
stop_pid "backend"  "$PID_BACKEND"
stop_pid "frontend" "$PID_FRONTEND"

# Aguarda um pouco antes de forçar
sleep 2

# Mata processos nas portas do backend e frontend (Vite usa 5173 por padrão)
for port in 5001 5173 3000; do
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti ":$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      for pid in $pids; do
        kill -TERM "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
        echo "Parado processo na porta $port (PID $pid)"
      done
    fi
  fi
done

echo "DRG-BR parado."
