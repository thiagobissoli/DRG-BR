#!/usr/bin/env bash
# Para backend e frontend da plataforma DRG-BR.
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
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "Parado $name (PID $pid)"
    fi
    rm -f "$path"
  fi
}

stop_pid "backend"  "$PID_BACKEND"
stop_pid "frontend" "$PID_FRONTEND"

# Mata processos nas portas 5001 e 3000 (caso tenham ficado órfãos)
for port in 5001 3000; do
  if command -v lsof >/dev/null 2>&1; then
    pid=$(lsof -ti ":$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
      kill $pid 2>/dev/null || true
      echo "Parado processo na porta $port (PID $pid)"
    fi
  fi
done

echo "DRG-BR parado."
