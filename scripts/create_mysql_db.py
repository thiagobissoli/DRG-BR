"""
Create MySQL database drg_br if it does not exist.
Run: python scripts/create_mysql_db.py
Uses DATABASE_URL from .env or default root:12345678@localhost
"""
import os
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
if str(root) not in __import__("sys").path:
    __import__("sys").path.insert(0, str(root))

from dotenv import load_dotenv
load_dotenv(root / ".env")

url = os.environ.get("DATABASE_URL", "mysql+pymysql://root:12345678@localhost:3306/drg_br")
m = re.match(r"mysql\+pymysql://([^:]+):([^@]+)@([^/]+)/(.*)", url)
if not m:
    print("DATABASE_URL not in expected format (mysql+pymysql://user:pass@host/dbname)")
    exit(1)
user, password, host, dbname = m.groups()
import pymysql
conn = pymysql.connect(host=host.split(":")[0], user=user, password=password, port=int(host.split(":")[1]) if ":" in host else 3306)
conn.cursor().execute(f"CREATE DATABASE IF NOT EXISTS `{dbname}`")
conn.commit()
conn.close()
print(f"Database {dbname} ready.")
