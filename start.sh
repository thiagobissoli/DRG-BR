#!/usr/bin/env bash
# Inicia backend (Flask) e frontend (Vite) da plataforma DRG-BR.
# Uso: ./start.sh   (para parar: ./stop.sh)
set -e
cd "$(dirname "$0")"

DIR="$(pwd)"
PID_BACKEND="$DIR/.drg-br-backend.pid"
PID_FRONTEND="$DIR/.drg-br-frontend.pid"

# Evita iniciar de novo se já houver processos rodando
if [ -f "$PID_BACKEND" ]; then
  pid=$(cat "$PID_BACKEND")
  if kill -0 "$pid" 2>/dev/null; then
    echo "Backend já está em execução (PID $pid). Use ./stop.sh antes."
    exit 1
  fi
fi
if [ -f "$PID_FRONTEND" ]; then
  pid=$(cat "$PID_FRONTEND")
  if kill -0 "$pid" 2>/dev/null; then
    echo "Frontend já está em execução (PID $pid). Use ./stop.sh antes."
    exit 1
  fi
fi

# Limpa PIDs antigos
rm -f "$PID_BACKEND" "$PID_FRONTEND"

# Ativa venv se existir
if [ -d "$DIR/venv" ]; then
  source "$DIR/venv/bin/activate"
fi

# Backend (Flask, porta 5001)
export PORT=5001
python run.py &
echo $! > "$PID_BACKEND"
echo "Backend iniciando (PID $(cat "$PID_BACKEND"))..."

# Frontend (Vite, porta 5173 por padrão do Vite; ou 3000 se configurado)
(
  cd "$DIR/frontend"
  npm run dev
) &
echo $! > "$PID_FRONTEND"
echo "Frontend iniciando (PID $(cat "$PID_FRONTEND"))..."

# Aguarda os servidores subirem e grava o PID do processo que está na porta (mais confiável)
sleep 3
if command -v lsof >/dev/null 2>&1; then
  backend_pid=$(lsof -ti :5001 2>/dev/null | head -1)
  if [ -n "$backend_pid" ]; then
    echo "$backend_pid" > "$PID_BACKEND"
  fi
  # Vite usa 5173 por padrão; pode estar em 3000 dependendo da config
  frontend_pid=$(lsof -ti :5173 2>/dev/null || lsof -ti :3000 2>/dev/null | head -1)
  if [ -n "$frontend_pid" ]; then
    echo "$frontend_pid" > "$PID_FRONTEND"
  fi
fi

echo ""
echo "Backend:  http://localhost:5001   (PID $(cat "$PID_BACKEND" 2>/dev/null || echo '?'))"
echo "Frontend: http://localhost:3000 ou http://localhost:5173  (PID $(cat "$PID_FRONTEND" 2>/dev/null || echo '?'))"
echo ""
echo "Para parar: ./stop.sh"
echo ""
