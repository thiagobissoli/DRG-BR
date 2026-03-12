#!/usr/bin/env bash
# Inicia backend (Flask) e frontend (Vite) da plataforma DRG-BR.
set -e
cd "$(dirname "$0")"

DIR="$(pwd)"
PID_BACKEND="$DIR/.drg-br-backend.pid"
PID_FRONTEND="$DIR/.drg-br-frontend.pid"

# Evita iniciar de novo se já houver PIDs gravados
if [ -f "$PID_BACKEND" ] && kill -0 "$(cat "$PID_BACKEND")" 2>/dev/null; then
  echo "Backend já está em execução (PID $(cat "$PID_BACKEND")). Use ./stop.sh antes."
  exit 1
fi
if [ -f "$PID_FRONTEND" ] && kill -0 "$(cat "$PID_FRONTEND")" 2>/dev/null; then
  echo "Frontend já está em execução (PID $(cat "$PID_FRONTEND")). Use ./stop.sh antes."
  exit 1
fi

# Limpa PIDs antigos
rm -f "$PID_BACKEND" "$PID_FRONTEND"

# Ativa venv se existir
if [ -d "$DIR/venv" ]; then
  source "$DIR/venv/bin/activate"
fi

# Backend (Flask, porta 5001 — evita conflito com AirPlay na 5000)
export PORT=5001
python run.py &
echo $! > "$PID_BACKEND"
echo "Backend iniciado (PID $(cat "$PID_BACKEND")), http://localhost:5001"

# Frontend (Vite, porta 3000)
(cd "$DIR/frontend" && npm run dev) &
echo $! > "$PID_FRONTEND"
echo "Frontend iniciado (PID $(cat "$PID_FRONTEND")), http://localhost:3000"

echo ""
echo "Para parar: ./stop.sh"
