#!/usr/bin/env bash
# Inicia o backend (Flask) da plataforma DRG-BR. O frontend estático é servido pelo próprio Flask.
# Uso: ./start.sh   (para parar: ./stop.sh)
set -e
cd "$(dirname "$0")"

DIR="$(pwd)"
PID_BACKEND="$DIR/.drg-br-backend.pid"

if [ -f "$PID_BACKEND" ]; then
  pid=$(cat "$PID_BACKEND")
  if kill -0 "$pid" 2>/dev/null; then
    echo "Backend já está em execução (PID $pid). Use ./stop.sh antes."
    exit 1
  fi
fi
rm -f "$PID_BACKEND"

if [ -d "$DIR/venv" ]; then
  source "$DIR/venv/bin/activate"
fi

export PORT=5001
python run.py &
echo $! > "$PID_BACKEND"
echo "Backend iniciando (PID $(cat "$PID_BACKEND"))..."
sleep 2
if command -v lsof >/dev/null 2>&1; then
  backend_pid=$(lsof -ti :5001 2>/dev/null | head -1)
  if [ -n "$backend_pid" ]; then
    echo "$backend_pid" > "$PID_BACKEND"
  fi
fi

echo ""
echo "Aplicação: http://localhost:5001   (API + interface web)"
echo "Para parar: ./stop.sh"
echo ""
