"use client";

/**
 * Página de Nombramientos Diarios — EduCanarias.app
 *
 * Lee el CSV estático desde /public/data/nombramientos.csv
 * y muestra un buscador con filtros avanzados.
 *
 * Coloca este archivo en:  app/nombramientos/page.tsx
 * (o pages/nombramientos.tsx si usas Pages Router)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";

// ─── tipos ─────────────────────────────────────────────────────────────
interface Nombramiento {
  fecha_doc: string;
  orden: string;
  apellidos_nombre: string;
  dni: string;
  especialidad: string;
  centro_destino: string;
  municipio: string;
  isla: string;
  provincia: string;
  jornada: string;
  f_inicio: string;
  f_cese_prev: string;
  duracion_dias: string;
  sustituido: string;
  oferta_web: string;
  periodo_practicas: string;
  horas_lectivas: string;
  horas_compl: string;
  p_singular: string;
  observaciones: string;
  [key: string]: string;
}

interface Metadata {
  ultima_actualizacion: string;
  total_registros: number;
  fecha_min: string;
  fecha_max: string;
  islas: string[];
  especialidades: string[];
}

// ─── constantes ────────────────────────────────────────────────────────
const ISLAS = ["Todas", "Tenerife", "Gran Canaria", "Lanzarote", "Fuerteventura", "La Palma", "La Gomera", "El Hierro"];
const JORNADAS = ["Todas", "Completa", "Parcial"];
const PAGE_SIZE = 25;

// ─── helpers ───────────────────────────────────────────────────────────
const fmtDate = (v: string) => {
  if (!v || v === "NaT") return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("es-ES");
};
const fmt = (v: string) => (!v || v === "nan" ? "—" : v);

const ISLA_STYLES: Record<string, string> = {
  Tenerife: "bg-sky-500/20 text-sky-300 ring-sky-500/30",
  "Gran Canaria": "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30",
  Lanzarote: "bg-amber-500/20 text-amber-300 ring-amber-500/30",
  Fuerteventura: "bg-orange-500/20 text-orange-300 ring-orange-500/30",
  "La Palma": "bg-violet-500/20 text-violet-300 ring-violet-500/30",
  "La Gomera": "bg-rose-500/20 text-rose-300 ring-rose-500/30",
  "El Hierro": "bg-teal-500/20 text-teal-300 ring-teal-500/30",
};

// ─── componentes pequeños ──────────────────────────────────────────────
function IslaTag({ isla }: { isla: string }) {
  const style = ISLA_STYLES[isla] || "bg-slate-500/20 text-slate-300 ring-slate-500/30";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${style}`}>
      {isla}
    </span>
  );
}

function JornadaTag({ jornada }: { jornada: string }) {
  return jornada === "Completa" ? (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      Completa
    </span>
  ) : jornada === "Parcial" ? (
    <span className="inline-flex items-center gap-1 text-xs text-amber-400">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      Parcial
    </span>
  ) : (
    <span className="text-slate-500 text-xs">—</span>
  );
}

function Select({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── página principal ──────────────────────────────────────────────────
export default function NombramientosPage() {
  const [data, setData] = useState<Nombramiento[]>([]);
  const [meta, setMeta] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [search, setSearch] = useState("");
  const [isla, setIsla] = useState("Todas");
  const [jornada, setJornada] = useState("Todas");
  const [especialidad, setEspecialidad] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [soloVacante, setSoloVacante] = useState(false);

  // sort
  const [sortKey, setSortKey] = useState("fecha_doc");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // paginación
  const [page, setPage] = useState(1);

  // ── carga de datos ──
  useEffect(() => {
    Promise.all([
      fetch("/data/nombramientos.csv").then((r) => {
        if (!r.ok) throw new Error("CSV no encontrado");
        return r.text();
      }),
      fetch("/data/metadata.json").then((r) => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([csv, metadata]) => {
        const { data: rows } = Papa.parse<Nombramiento>(csv, { header: true, skipEmptyLines: true });
        setData(rows);
        setMeta(metadata);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const especialidades = useMemo(() =>
    Array.from(new Set(data.map((r) => r.especialidad).filter(Boolean))).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        (r.apellidos_nombre || "").toLowerCase().includes(q) ||
        (r.centro_destino || "").toLowerCase().includes(q) ||
        (r.municipio || "").toLowerCase().includes(q) ||
        (r.especialidad || "").toLowerCase().includes(q) ||
        (r.sustituido || "").toLowerCase().includes(q)
      );
    }
    if (isla !== "Todas") rows = rows.filter((r) => r.isla === isla);
    if (jornada !== "Todas") rows = rows.filter((r) => r.jornada?.toLowerCase() === jornada.toLowerCase());
    if (especialidad) rows = rows.filter((r) => r.especialidad === especialidad);
    if (fechaDesde) rows = rows.filter((r) => r.fecha_doc >= fechaDesde);
    if (fechaHasta) rows = rows.filter((r) => r.fecha_doc <= fechaHasta);
    if (soloVacante) rows = rows.filter((r) => !r.sustituido || r.sustituido.trim() === "" || r.sustituido === "nan");

    return [...rows].sort((a, b) => {
      let va: string | number = a[sortKey] ?? "";
      let vb: string | number = b[sortKey] ?? "";
      if (sortKey === "duracion_dias") { va = Number(va) || 0; vb = Number(vb) || 0; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, search, isla, jornada, especialidad, fechaDesde, fechaHasta, soloVacante, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  };

  const resetFilters = useCallback(() => {
    setSearch(""); setIsla("Todas"); setJornada("Todas");
    setEspecialidad(""); setFechaDesde(""); setFechaHasta("");
    setSoloVacante(false); setPage(1);
  }, []);

  // ── estados de carga / error ──
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400 text-sm flex items-center gap-3">
        <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Cargando nombramientos...
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <div className="bg-red-950/50 border border-red-800 rounded-xl p-6 max-w-md text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-red-300 font-semibold mb-2">Error al cargar los datos</h2>
        <p className="text-red-400 text-sm">{error}</p>
        <p className="text-slate-500 text-xs mt-3">
          Asegúrate de que el GitHub Action ha generado el archivo{" "}
          <code className="text-slate-400">public/data/nombramientos.csv</code>
        </p>
      </div>
    </div>
  );

  // ── render principal ──
  const colHeaders: [string, string][] = [
    ["fecha_doc", "Fecha doc."],
    ["apellidos_nombre", "Docente"],
    ["especialidad", "Especialidad"],
    ["centro_destino", "Centro"],
    ["isla", "Isla"],
    ["jornada", "Jornada"],
    ["f_inicio", "F. Inicio"],
    ["f_cese_prev", "F. Cese"],
    ["duracion_dias", "Días"],
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white leading-tight">
              Nombramientos Diarios · Secundaria y Otros Cuerpos
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Consejería de Educación de Canarias
              {meta && (
                <span className="ml-2 text-slate-500">
                  · Actualizado {fmtDate(meta.ultima_actualizacion)} · {meta.total_registros.toLocaleString()} registros
                </span>
              )}
            </p>
          </div>
          <a
            href="https://www.gobiernodecanarias.org/educacion/web/personal/docente/oferta/interinos-sustitutos/nombramientos_diarios/otros_cuerpos/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg px-3 py-1.5 hover:border-slate-500 transition shrink-0"
          >
            Fuente oficial ↗
          </a>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* ── Filtros ── */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
          {/* Fila 1 */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="🔍  Nombre, centro, municipio, especialidad, sustituido/a..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 min-w-60 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <Select value={isla} onChange={(v) => { setIsla(v); setPage(1); }} options={ISLAS} />
            <Select value={jornada} onChange={(v) => { setJornada(v); setPage(1); }} options={JORNADAS} />
          </div>

          {/* Fila 2 */}
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={especialidad}
              onChange={(e) => { setEspecialidad(e.target.value); setPage(1); }}
              className="flex-1 min-w-52 bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            >
              <option value="">Todas las especialidades</option>
              {especialidades.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="text-xs">Fecha doc.</span>
              <input type="date" value={fechaDesde} onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />
              <span>—</span>
              <input type="date" value={fechaHasta} onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 transition" />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <input type="checkbox" checked={soloVacante} onChange={(e) => { setSoloVacante(e.target.checked); setPage(1); }}
                className="w-4 h-4 rounded accent-blue-500" />
              Solo vacantes
            </label>

            <button onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg px-3 py-2 transition">
              ✕ Limpiar filtros
            </button>
          </div>
        </section>

        {/* ── Barra de resultados + paginación ── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-slate-200">{filtered.length.toLocaleString()}</span> resultados
            {filtered.length !== data.length && <span className="ml-1">de {data.length.toLocaleString()}</span>}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 rounded border border-slate-700 disabled:opacity-30 hover:border-slate-500 transition text-xs">‹</button>
              <span className="text-xs">Pág. {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 rounded border border-slate-700 disabled:opacity-30 hover:border-slate-500 transition text-xs">›</button>
            </div>
          )}
        </div>

        {/* ── Tabla ── */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/60 text-xs uppercase tracking-wide text-slate-400">
                  {colHeaders.map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)}
                      className="px-4 py-3 text-left cursor-pointer hover:text-white select-none whitespace-nowrap group transition">
                      {label}
                      <span className="ml-1 opacity-0 group-hover:opacity-100 transition text-slate-500">
                        {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                      {sortKey === key && (
                        <span className="ml-1 text-blue-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wide whitespace-nowrap">Sustituido/a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-slate-500 text-sm">
                      <div className="text-3xl mb-2">🔍</div>
                      No hay resultados con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginated.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(r.fecha_doc)}</td>
                      <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{fmt(r.apellidos_nombre)}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmt(r.especialidad)}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-52 truncate" title={r.centro_destino}>
                        {fmt(r.centro_destino)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.isla && r.isla !== "nan" ? <IslaTag isla={r.isla} /> : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><JornadaTag jornada={r.jornada} /></td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">{fmtDate(r.f_inicio)}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">{fmtDate(r.f_cese_prev)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {r.duracion_dias && r.duracion_dias !== "nan" ? (
                          <span className={`font-semibold tabular-nums ${
                            Number(r.duracion_dias) >= 100 ? "text-blue-400"
                            : Number(r.duracion_dias) >= 30 ? "text-emerald-400"
                            : "text-slate-300"
                          }`}>
                            {r.duracion_dias}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs max-w-44 truncate" title={r.sustituido}>
                        {r.sustituido && r.sustituido !== "nan" && r.sustituido.trim() !== ""
                          ? r.sustituido
                          : <span className="text-blue-400 font-medium">Vacante</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Paginación inferior ── */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-1 pb-4">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-3 py-1.5 rounded border border-slate-700 text-xs text-slate-400 disabled:opacity-30 hover:border-slate-500 transition">
              «
            </button>
            {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded border text-xs transition ${
                    page === p
                      ? "bg-blue-600 border-blue-500 text-white font-medium"
                      : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}>
                  {p}
                </button>
              );
            })}
            {totalPages > 9 && <span className="flex items-center text-slate-500 text-xs px-1">···</span>}
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-3 py-1.5 rounded border border-slate-700 text-xs text-slate-400 disabled:opacity-30 hover:border-slate-500 transition">
              »
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
