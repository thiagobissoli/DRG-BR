"""
Run the DRG-BR Flask platform.
Desenvolvimento: python run.py
Produção: use um servidor WSGI, ex: gunicorn -w 4 -b 0.0.0.0:5001 "run:app"
"""
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    # Em produção não use debug; preferir gunicorn/uvicorn
    use_debug = app.config.get("DEBUG", False)
    app.run(host="0.0.0.0", port=port, debug=use_debug)
