# Instalar dependencias (una vez)
pip install pdfplumber requests pandas

# Uso
python nombramientos_scraper.py --desde 2026-01-01 --hasta 2026-02-27
python nombramientos_scraper.py --desde 2025-09-01 --hasta 2026-02-27 --salida cursoentero.csv --verbose