#!/usr/bin/env python3
"""
Scraper de Nombramientos Diarios - Consejería de Educación de Canarias
Secundaria y Otros Cuerpos (excepto Maestros)

Los PDFs se publican en:
  https://www.gobiernodecanarias.org/educacion/6/dgper/nombradiarios/Docs/NDS{DD}-{MM}-{YY}.PDF

Instalación:
  pip install pdfplumber requests pandas

Uso:
  python nombramientos_scraper.py --desde 2026-01-01 --hasta 2026-02-27
  python nombramientos_scraper.py --desde 2025-09-01 --hasta 2026-02-27 --salida cursoentero.csv --verbose
"""

import argparse, io, re, sys, time
from datetime import date, timedelta
from pathlib import Path
import pandas as pd
import pdfplumber
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_URL = "https://www.gobiernodecanarias.org/educacion/6/dgper/nombradiarios/Docs"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; EduCanariasScraper/1.0)"}
TIMEOUT = 45
DELAY = 1.5

COLUMNAS = [
    "fecha_doc", "orden", "apellidos_nombre", "dni", "especialidad",
    "centro_destino", "municipio", "isla", "provincia", "jornada",
    "f_inicio", "f_cese_prev", "duracion_dias", "sustituido", "oferta_web",
    "periodo_practicas", "horas_lectivas", "horas_compl", "p_singular",
    "observaciones",
]


def make_session():
    s = requests.Session()
    retry = Retry(total=3, backoff_factor=2, status_forcelist=[500, 502, 503, 504])
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.headers.update(HEADERS)
    return s


def pdf_url(d: date) -> str:
    yy = str(d.year)[2:]
    return f"{BASE_URL}/NDS{d.day:02d}-{d.month:02d}-{yy}.PDF"


def download_pdf(session, d: date, verbose: bool):
    url = pdf_url(d)
    try:
        r = session.get(url, timeout=TIMEOUT)
        if r.status_code == 404:
            if verbose:
                print(f"  → Sin PDF para {d} (404)")
            return None
        r.raise_for_status()
        if verbose:
            print(f"  → {len(r.content):,} bytes desde {url}")
        return r.content
    except requests.RequestException as exc:
        print(f"  ⚠ Error descargando {url}: {exc}", file=sys.stderr)
        return None


def _clean(s: str) -> str:
    return " ".join(s.split()).strip()


def _get(pattern: str, text: str, default: str = "") -> str:
    m = re.search(pattern, text, re.DOTALL | re.IGNORECASE)
    return _clean(m.group(1)) if m else default


def _normaliza_sino(valor: str) -> str:
    return "Sí" if valor.lower().startswith("s") else "No"


def parse_pdf(pdf_bytes: bytes, fecha_doc: date, verbose: bool) -> list:
    full_text = ""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            full_text += (page.extract_text(layout=False) or "") + "\n"

    # Each appointment block starts with optional asterisks then "Orden: N"
    blocks = re.split(r"(?=\*{0,4}\s*Orden:\s*\d+\b)", full_text)
    records = []

    for block in blocks:
        block = block.strip()
        if not block:
            continue

        orden = _get(r"Orden:\s*(\d+)", block)
        if not orden:
            continue

        nombre = _get(r"Apellidos y Nombre:\s*(.+?)DNI SUSTITUTO:", block)
        if not nombre:
            continue

        oferta_raw = _get(r"Oferta Web:\s*(S[ií]|No)", block, "No")
        practicas_raw = _get(r"Per[ií]odo en pr[aá]cticas:\s*(S[ií]|No)", block, "No")

        records.append({
            "fecha_doc":         str(fecha_doc),
            "orden":             orden,
            "apellidos_nombre":  nombre,
            "dni":               _get(r"DNI SUSTITUTO:\s*(\*+\d+\*+)", block),
            "especialidad":      _get(r"Especialidad:\s*(.+?)Oferta Web:", block),
            "centro_destino":    _get(r"Ctro\.Destino:\s*(.+?)P\. Singular:", block),
            "municipio":         _get(r"Municipio:\s*(.+?)Jornada:", block),
            "isla":              _get(r"Isla:\s*(.+?)Horas lectivas:", block),
            "provincia":         _get(r"Provincia:\s*(.+?)Duración:", block),
            "jornada":           _get(r"Jornada:\s*(Completa|Parcial)", block),
            "f_inicio":          _get(r"F\.\s*Inicio:\s*(\d{2}/\d{2}/\d{4})", block),
            "f_cese_prev":       _get(r"F\.Cese\s*Prev\.:\s*(\d{2}/\d{2}/\d{4})", block),
            "duracion_dias":     _get(r"Duración:\s*(\d+)", block),
            "sustituido":        _get(r"Sustituido:\s*(.*?)Provincia:", block),
            "oferta_web":        _normaliza_sino(oferta_raw),
            "periodo_practicas": _normaliza_sino(practicas_raw),
            "horas_lectivas":    _get(r"Horas lectivas:\s*([0-9,\.]+)", block),
            "horas_compl":       _get(r"Horas complementarias:\s*([0-9,\.]+)", block),
            "p_singular":        _get(r"P\. Singular:\s*(.+?)Horas complementarias:", block),
            "observaciones":     _get(r"Observaciones:\s*(.+?)(?:\n[ \t]*\n|\Z)", block),
        })

    if verbose:
        print(f"  → {len(records)} nombramientos extraídos")
    return records


def iter_laborables(desde: date, hasta: date):
    d = desde
    while d <= hasta:
        if d.weekday() < 5:  # Monday=0 ... Friday=4
            yield d
        d += timedelta(days=1)


def main():
    parser = argparse.ArgumentParser(
        description="Descarga y parsea PDFs de nombramientos diarios de Canarias"
    )
    parser.add_argument("--desde",   required=True,  help="Fecha inicio YYYY-MM-DD")
    parser.add_argument("--hasta",   required=True,  help="Fecha fin YYYY-MM-DD")
    parser.add_argument(
        "--salida",
        default="public/data/nombramientos_new.csv",
        help="Ruta del CSV de salida",
    )
    parser.add_argument("--verbose", action="store_true", help="Salida detallada")
    args = parser.parse_args()

    desde = date.fromisoformat(args.desde)
    hasta = date.fromisoformat(args.hasta)
    print(f"📥 Rango: {desde} → {hasta}")

    session = make_session()
    all_records = []
    dias_ok = dias_sin = 0

    for d in iter_laborables(desde, hasta):
        if args.verbose:
            print(f"[{d}] Comprobando PDF…")
        pdf_bytes = download_pdf(session, d, args.verbose)
        if pdf_bytes:
            all_records.extend(parse_pdf(pdf_bytes, d, args.verbose))
            dias_ok += 1
        else:
            dias_sin += 1
        time.sleep(DELAY)

    print(f"📊 PDFs: {dias_ok} ok | {dias_sin} sin PDF | {len(all_records)} registros")

    out_path = Path(args.salida)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if all_records:
        df = pd.DataFrame(all_records)[COLUMNAS]
    else:
        print("⚠ No se encontraron registros.")
        df = pd.DataFrame(columns=COLUMNAS)

    df.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"✅ Guardado en {out_path} ({len(df)} filas)")


if __name__ == "__main__":
    main()
