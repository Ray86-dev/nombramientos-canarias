"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Papa from "papaparse";
import StatsPanel from "./components/StatsPanel";

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
const maskName = (v: string): string => {
  if (!v || v === "nan") return "—";
  const MASK = "*****";
  // Formato con coma: "GARCIA PEREZ, Maria"
  if (v.includes(",")) {
    const [apellidos, nombre] = v.split(",", 2);
    const masked = apellidos.trim().replace(/\S+/g, () => MASK);
    return `${masked}, ${nombre.trim()}`;
  }
  // Formato sin coma: "GARCIA PEREZ MARIA" — última palabra = nombre de pila
  const parts = v.trim().split(/\s+/);
  if (parts.length === 1) return v;
  const nombre = parts[parts.length - 1];
  const masked = parts.slice(0, -1).map(() => MASK).join(" ");
  return `${masked} ${nombre}`;
};

// ─── componentes pequeños ──────────────────────────────────────────────
function IslaTag({ isla }: { isla: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 font-mono text-xs text-[#888888] bg-[#1a1a1a] border border-[#2a2a2a]">
      {isla}
    </span>
  );
}

function JornadaTag({ jornada }: { jornada: string }) {
  return jornada === "Completa" ? (
    <span className="font-mono text-xs text-[#f5f5f5]">● Completa</span>
  ) : jornada === "Parcial" ? (
    <span className="font-mono text-xs text-[#888888]">○ Parcial</span>
  ) : (
    <span className="font-mono text-xs text-[#444444]">—</span>
  );
}

function Select({
  value, onChange, options, placeholder,
}: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="font-mono bg-[#141414] border border-[#222222] text-[#f5f5f5] text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#444444] focus:border-[#444444] transition-opacity duration-150 cursor-pointer"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── página principal ──────────────────────────────────────────────────
export default function Home() {
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
  const [soloUltimos, setSoloUltimos] = useState(false);

  // stats
  const [showStats, setShowStats] = useState(false);

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

  const fechaMax = useMemo(() =>
    data.reduce((max, r) => (r.fecha_doc > max ? r.fecha_doc : max), ""),
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
    if (soloUltimos && fechaMax) rows = rows.filter((r) => r.fecha_doc === fechaMax);

    return [...rows].sort((a, b) => {
      let va: string | number = a[sortKey] ?? "";
      let vb: string | number = b[sortKey] ?? "";
      if (sortKey === "duracion_dias") { va = Number(va) || 0; vb = Number(vb) || 0; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, search, isla, jornada, especialidad, fechaDesde, fechaHasta, soloVacante, soloUltimos, fechaMax, sortKey, sortDir]);

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
    setSoloVacante(false); setSoloUltimos(false); setPage(1);
  }, []);

  // ── estados de carga / error ──
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="font-mono text-[#888888] text-xs flex items-center gap-3 tracking-wide">
        <svg className="animate-spin h-4 w-4 text-[#444444]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Cargando nombramientos...
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8">
      <div className="bg-[#141414] border border-[#222222] p-6 max-w-md text-center">
        <h2 className="font-sans text-sm font-semibold text-[#f5f5f5] mb-2 uppercase tracking-widest">Error al cargar los datos</h2>
        <p className="font-mono text-xs text-[#888888] mt-2">{error}</p>
        <p className="font-mono text-xs text-[#444444] mt-3">
          Asegúrate de que el GitHub Action ha generado el archivo{" "}
          <code className="text-[#888888]">public/data/nombramientos.csv</code>
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
    <main className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-mono">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#222222]">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <h1 className="font-sans text-sm font-semibold text-[#f5f5f5] leading-tight tracking-tight">
              Nombramientos Diarios · Secundaria y Otros Cuerpos
            </h1>
            <p className="font-mono text-xs text-[#888888] mt-0.5">
              Consejería de Educación de Canarias
              {meta && (
                <span className="ml-2 text-[#444444]">
                  · Actualizado {fmtDate(meta.ultima_actualizacion)} · {meta.total_registros.toLocaleString()} registros
                </span>
              )}
            </p>
          </div>
          <a
            href="https://www.gobiernodecanarias.org/educacion/web/personal/docente/oferta/interinos-sustitutos/nombramientos_diarios/otros_cuerpos/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-[#888888] hover:text-[#f5f5f5] border border-[#333333] hover:border-[#444444] px-3 py-1.5 transition-opacity duration-150 shrink-0"
          >
            Fuente oficial ↗
          </a>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* ── Filtros ── */}
        <section className="bg-[#111111] border border-[#222222] p-4 space-y-3">
          {/* Fila 1 */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Nombre, centro, municipio, especialidad, sustituido/a..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="flex-1 min-w-60 font-mono bg-[#141414] border border-[#222222] text-[#f5f5f5] placeholder-[#444444] text-xs px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#444444] focus:border-[#444444] transition-opacity duration-150"
            />
            <Select value={isla} onChange={(v) => { setIsla(v); setPage(1); }} options={ISLAS} />
            <Select value={jornada} onChange={(v) => { setJornada(v); setPage(1); }} options={JORNADAS} />
          </div>

          {/* Fila 2 */}
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={especialidad}
              onChange={(e) => { setEspecialidad(e.target.value); setPage(1); }}
              className="flex-1 min-w-52 font-mono bg-[#141414] border border-[#222222] text-[#f5f5f5] text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#444444] transition-opacity duration-150 cursor-pointer"
            >
              <option value="">Todas las especialidades</option>
              {especialidades.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>

            <div className="flex items-center gap-2 text-sm text-[#888888]">
              <span className="font-mono text-xs text-[#888888] tracking-wide">Fecha doc.</span>
              <input type="date" value={fechaDesde} min="2025-09-01" onChange={(e) => { setFechaDesde(e.target.value); setPage(1); }}
                className="font-mono bg-[#141414] border border-[#222222] text-[#f5f5f5] text-xs px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#444444] transition-opacity duration-150 cursor-pointer" />
              <span className="text-[#444444]">—</span>
              <input type="date" value={fechaHasta} min="2025-09-01" onChange={(e) => { setFechaHasta(e.target.value); setPage(1); }}
                className="font-mono bg-[#141414] border border-[#222222] text-[#f5f5f5] text-xs px-2 py-2 focus:outline-none focus:ring-1 focus:ring-[#444444] transition-opacity duration-150 cursor-pointer" />
            </div>

            <label className="flex items-center gap-2 font-mono text-xs text-[#888888] cursor-pointer select-none">
              <input type="checkbox" checked={soloVacante} onChange={(e) => { setSoloVacante(e.target.checked); setPage(1); }}
                className="w-3.5 h-3.5 accent-[#f5f5f5] cursor-pointer" />
              Solo vacantes
            </label>

            <button
              onClick={() => { setSoloUltimos((v) => !v); setPage(1); }}
              disabled={!fechaMax}
              className={`font-mono text-xs px-3 py-2 border transition-opacity duration-150 disabled:opacity-30 ${soloUltimos
                  ? "bg-[#f5f5f5] border-[#f5f5f5] text-[#0a0a0a]"
                  : "text-[#888888] hover:text-[#f5f5f5] border-[#333333] hover:border-[#444444]"
                }`}>
              Últimos{soloUltimos && fechaMax ? ` · ${fmtDate(fechaMax)}` : ""}
            </button>

            <button onClick={resetFilters}
              className="font-mono text-xs text-[#888888] hover:text-[#f5f5f5] border border-[#333333] hover:border-[#444444] px-3 py-2 transition-opacity duration-150">
              ✕ Limpiar filtros
            </button>

            <button
              onClick={() => setShowStats((v) => !v)}
              className={`font-mono text-xs px-3 py-2 border transition-opacity duration-150 ${showStats
                  ? "bg-[#f5f5f5] border-[#f5f5f5] text-[#0a0a0a]"
                  : "text-[#888888] hover:text-[#f5f5f5] border-[#333333] hover:border-[#444444]"
                }`}
            >
              📊 Estadísticas
            </button>
          </div>

          <p className="font-mono text-xs text-[#444444] pt-1">
            Histórico disponible desde el 1 de septiembre de 2025 · curso 2025–2026
          </p>
        </section>

        {/* ── Panel de estadísticas ── */}
        {showStats && <StatsPanel data={filtered} totalData={data} />}

        {/* ── Barra de resultados + paginación ── */}
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-[#888888]">
            <span className="text-[#f5f5f5]">{filtered.length.toLocaleString()}</span> resultados
            {filtered.length !== data.length && <span className="ml-1 text-[#444444]">de {data.length.toLocaleString()}</span>}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#888888]">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="font-mono px-2 py-1 border border-[#333333] disabled:opacity-30 hover:border-[#444444] hover:text-[#f5f5f5] transition-opacity duration-150 text-xs">‹</button>
              <span className="font-mono text-xs text-[#888888]">Pág. {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="font-mono px-2 py-1 border border-[#333333] disabled:opacity-30 hover:border-[#444444] hover:text-[#f5f5f5] transition-opacity duration-150 text-xs">›</button>
            </div>
          )}
        </div>

        {/* ── Tabla ── */}
        <section className="bg-[#111111] border border-[#222222] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-[#222222] bg-[#141414] text-xs uppercase tracking-widest text-[#444444]">
                  {colHeaders.map(([key, label]) => (
                    <th key={key} onClick={() => handleSort(key)}
                      className="px-4 py-3 text-left cursor-pointer hover:text-[#f5f5f5] select-none whitespace-nowrap group transition-opacity duration-150">
                      {label}
                      <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[#444444]">
                        {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                      {sortKey === key && (
                        <span className="ml-1 text-[#f5f5f5]">{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest whitespace-nowrap text-[#444444]">Sustituido/a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-[#444444] text-xs tracking-wide">
                      No hay resultados con los filtros actuales.
                    </td>
                  </tr>
                ) : (
                  paginated.map((r, i) => (
                    <tr key={i} className="hover:bg-[#1f1f1f] transition-colors duration-150">
                      <td className="px-4 py-3 text-[#444444] text-xs whitespace-nowrap tabular-nums">{fmtDate(r.fecha_doc)}</td>
                      <td className="px-4 py-3 text-[#f5f5f5] whitespace-nowrap">{maskName(r.apellidos_nombre)}</td>
                      <td className="px-4 py-3 text-[#888888] whitespace-nowrap">{fmt(r.especialidad)}</td>
                      <td className="px-4 py-3 text-[#888888] max-w-52 truncate" title={r.centro_destino}>
                        {fmt(r.centro_destino)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.isla && r.isla !== "nan" ? <IslaTag isla={r.isla} /> : <span className="text-[#444444]">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><JornadaTag jornada={r.jornada} /></td>
                      <td className="px-4 py-3 text-[#888888] whitespace-nowrap tabular-nums">{fmtDate(r.f_inicio)}</td>
                      <td className="px-4 py-3 text-[#888888] whitespace-nowrap tabular-nums">{fmtDate(r.f_cese_prev)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap tabular-nums">
                        {r.duracion_dias && r.duracion_dias !== "nan" ? (
                          <span className={`tabular-nums ${Number(r.duracion_dias) >= 100 ? "text-[#f5f5f5]"
                              : Number(r.duracion_dias) >= 30 ? "text-[#888888]"
                                : "text-[#444444]"
                            }`}>
                            {r.duracion_dias}
                          </span>
                        ) : <span className="text-[#444444]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[#888888] text-xs max-w-44 truncate" title={r.sustituido}>
                        {r.sustituido && r.sustituido !== "nan" && r.sustituido.trim() !== ""
                          ? r.sustituido
                          : <span className="text-[#f5f5f5]">Vacante</span>}
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
          <div className="flex justify-center gap-1 pb-8 pt-2">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="font-mono px-3 py-1.5 border border-[#333333] text-xs text-[#888888] disabled:opacity-30 hover:border-[#444444] hover:text-[#f5f5f5] transition-opacity duration-150">
              «
            </button>
            {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`font-mono w-8 h-8 border text-xs transition-opacity duration-150 ${page === p
                      ? "bg-[#f5f5f5] border-[#f5f5f5] text-[#0a0a0a] font-medium"
                      : "border-[#333333] text-[#888888] hover:border-[#444444] hover:text-[#f5f5f5]"
                    }`}>
                  {p}
                </button>
              );
            })}
            {totalPages > 9 && <span className="flex items-center font-mono text-[#444444] text-xs px-1">···</span>}
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="font-mono px-3 py-1.5 border border-[#333333] text-xs text-[#888888] disabled:opacity-30 hover:border-[#444444] hover:text-[#f5f5f5] transition-opacity duration-150">
              »
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
