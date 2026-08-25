# Nombramientos · Secundaria Canarias

Buscador de los **nombramientos de profesorado interino** de la Consejería de Educación
del Gobierno de Canarias, curso **2025/26**.

**Web:** <https://no-can.vercel.app>

La Consejería publica los nombramientos en PDF, semana a semana, sin buscador y sin
histórico. Esto los convierte en una sola tabla que se puede filtrar, cruzar y mirar
entera de un vistazo.

## Qué hay dentro

- **6.676 nombramientos** entre el 3 de septiembre de 2025 y el 8 de junio de 2026
- **134 especialidades**, **365 centros**, las **7 islas**
- Por cada nombramiento: fecha, número de orden, especialidad, centro, municipio, isla,
  provincia, jornada, fecha de inicio y de cese previsto, duración en días, si sale a
  oferta web, periodo de prácticas, horas lectivas y complementarias, puesto singular y
  observaciones
- Búsqueda instantánea y filtros por especialidad, isla, centro y periodo
- Gráficas de evolución por semana y por especialidad

## Protección de datos

Los DNI aparecen **enmascarados** (`***1234**`) tal y como los publica la propia
Consejería. Los nombres proceden de resoluciones públicas del Gobierno de Canarias.
Este repositorio no añade ningún dato que no estuviera ya publicado oficialmente.

Si apareces en el listado y quieres que se retire tu registro, abre una *issue* y lo
elimino.

## Arquitectura

```
scripts/nombramientos_scraper.py   Extracción de los PDF oficiales (pdfplumber + pandas)
public/data/nombramientos.csv      Dataset consolidado del curso
app/                               Next.js 14 (App Router) + Recharts
```

El frontend no necesita servidor ni base de datos: carga el CSV y trabaja en el navegador.

## Arrancar en local

```bash
npm install
npm run dev          # http://localhost:3000
```

Para regenerar el dataset desde los PDF oficiales:

```bash
pip install -r requirements.txt
python scripts/nombramientos_scraper.py
```

## Licencia

Código bajo MIT. Los datos son de titularidad pública (Gobierno de Canarias).
