import { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";

const ISLAS = ["Todas","Tenerife","Gran Canaria","Lanzarote","Fuerteventura","La Palma","La Gomera","El Hierro","La Graciosa"];
const JORNADAS = ["Todas","Completa","Parcial"];

// ─── helpers ───────────────────────────────────────────────
const fmt = (v) => (v && v !== "NaT" ? v : "—");
const fmtDate = (v) => {
  if (!v || v === "NaT") return "—";
  const d = new Date(v);
  return isNaN(d) ? v : d.toLocaleDateString("es-ES");
};

function Badge({ label, color = "blue" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    gray: "bg-gray-100 text-gray-600",
    purple: "bg-purple-100 text-purple-800",
    red: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors[color] || colors.gray}`}>
      {label}
    </span>
  );
}

function islaColor(isla) {
  const map = {
    Tenerife: "blue", "Gran Canaria": "green", Lanzarote: "yellow",
    Fuerteventura: "purple", "La Palma": "red", "La Gomera": "gray",
    "El Hierro": "gray", "La Graciosa": "gray",
  };
  return map[isla] || "gray";
}

// ─── Upload screen ──────────────────────────────────────────
function UploadScreen({ onData }) {
  const [dragging, setDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => onData(data),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏫</div>
          <h1 className="text-3xl font-bold text-white mb-2">Nombramientos Docentes</h1>
          <p className="text-blue-300 text-sm">Consejería de Educación de Canarias · Otros Cuerpos</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
            ${dragging ? "border-blue-400 bg-blue-900/30" : "border-blue-700 bg-slate-800/50 hover:border-blue-500 hover:bg-slate-800"}`}
          onClick={() => document.getElementById("csv-input").click()}
        >
          <div className="text-4xl mb-3">📂</div>
          <p className="text-white font-semibold mb-1">Arrastra el CSV aquí</p>
          <p className="text-slate-400 text-sm">o haz clic para seleccionarlo</p>
          <input
            id="csv-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>

        <div className="mt-6 bg-slate-800/60 rounded-xl p-4 text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-300 mb-2">Genera el CSV con el script Python:</p>
          <code className="block bg-slate-900 rounded p-2 text-green-400 text-xs">
            python nombramientos_scraper.py --desde 2026-01-01 --hasta 2026-02-27
          </code>
          <p className="mt-2">Luego carga aquí el archivo <code className="text-blue-400">nombramientos.csv</code> generado.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ──────────────────────────────────────────────
function StatsBar({ total, filtered }) {
  return (
    <div className="flex items-center gap-4 text-sm text-slate-500">
      <span><strong className="text-slate-200">{filtered.toLocaleString()}</strong> resultados</span>
      {filtered !== total && <span>de {total.toLocaleString()} total</span>}
    </div>
  );
}

// ─── Main app ───────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [isla, setIsla] = useState("Todas");
  const [jornada, setJornada] = useState("Todas");
  const [especialidad, setEspecialidad] = useState("");
  const [centro, setCentro] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [soloVacante, setSoloVacante] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState("fecha_doc");
  const [sortDir, setSortDir] = useState("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const especialidades = useMemo(() => {
    if (!data) return [];
    const s = new Set(data.map(r => r.especialidad).filter(Boolean));
    return ["", ...Array.from(s).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.apellidos_nombre || "").toLowerCase().includes(q) ||
        (r.centro_destino || "").toLowerCase().includes(q) ||
        (r.municipio || "").toLowerCase().includes(q) ||
        (r.especialidad || "").toLowerCase().includes(q) ||
        (r.sustituido || "").toLowerCase().includes(q)
      );
    }
    if (isla !== "Todas") rows = rows.filter(r => r.isla === isla);
    if (jornada !== "Todas") rows = rows.filter(r => (r.jornada || "").toLowerCase() === jornada.toLowerCase());
    if (especialidad) rows = rows.filter(r => r.especialidad === especialidad);
    if (centro) rows = rows.filter(r => (r.centro_destino || "").toLowerCase().includes(centro.toLowerCase()));
    if (fechaDesde) rows = rows.filter(r => r.fecha_doc >= fechaDesde);
    if (fechaHasta) rows = rows.filter(r => r.fecha_doc <= fechaHasta);
    if (soloVacante) rows = rows.filter(r => !r.sustituido || r.sustituido.trim() === "");

    // Sort
    rows = [...rows].sort((a, b) => {
      let va = a[sortKey] ?? "";
      let vb = b[sortKey] ?? "";
      if (sortKey === "duracion_dias") { va = Number(va) || 0; vb = Number(vb) || 0; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return rows;
  }, [data, search, isla, jornada, especialidad, centro, fechaDesde, fechaHasta, soloVacante, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const resetFilters = useCallback(() => {
    setSearch(""); setIsla("Todas"); setJornada("Todas");
    setEspecialidad(""); setCentro(""); setFechaDesde(""); setFechaHasta("");
    setSoloVacante(false); setPage(1);
  }, []);

  const SortIcon = ({ k }) => sortKey !== k ? "↕" : sortDir === "asc" ? "↑" : "↓";

  if (!data) return <UploadScreen onData={(d) => { setData(d); setPage(1); }} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">🏫 Nombramientos Docentes · Canarias</h1>
          <p className="text-xs text-slate-400">Otros Cuerpos — Consejería de Educación</p>
        </div>
        <button
          onClick={() => setData(null)}
          className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg px-3 py-1.5 hover:border-slate-500 transition"
        >
          📂 Cargar otro CSV
        </button>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-4">
        {/* Filters */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 mb-4 space-y-3">
          <div className="flex gap-3 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-52">
              <input
                type="text"
                placeholder="🔍  Nombre, centro, municipio, especialidad..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            {/* Isla */}
            <select value={isla} onChange={e => { setIsla(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              {ISLAS.map(i => <option key={i}>{i}</option>)}
            </select>
            {/* Jornada */}
            <select value={jornada} onChange={e => { setJornada(e.target.value); setPage(1); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              {JORNADAS.map(j => <option key={j}>{j}</option>)}
            </select>
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            {/* Especialidad */}
            <select value={especialidad} onChange={e => { setEspecialidad(e.target.value); setPage(1); }}
              className="flex-1 min-w-48 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
              <option value="">Todas las especialidades</option>
              {especialidades.slice(1).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {/* Centro */}
            <input
              type="text"
              placeholder="Centro educativo..."
              value={centro}
              onChange={e => { setCentro(e.target.value); setPage(1); }}
              className="flex-1 min-w-40 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {/* Fechas */}
            <div className="flex items-center gap-2">
              <input type="date" value={fechaDesde} onChange={e => { setFechaDesde(e.target.value); setPage(1); }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              <span className="text-slate-500 text-sm">—</span>
              <input type="date" value={fechaHasta} onChange={e => { setFechaHasta(e.target.value); setPage(1); }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            {/* Vacante */}
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
              <input type="checkbox" checked={soloVacante} onChange={e => { setSoloVacante(e.target.checked); setPage(1); }}
                className="w-4 h-4 rounded accent-blue-500" />
              Solo vacantes
            </label>
            {/* Reset */}
            <button onClick={resetFilters}
              className="text-xs text-slate-400 hover:text-white border border-slate-700 rounded-lg px-3 py-2 hover:border-slate-500 transition">
              ✕ Limpiar
            </button>
          </div>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-3">
          <StatsBar total={data.length} filtered={filtered.length} />
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 rounded border border-slate-700 disabled:opacity-30 hover:border-slate-500 transition">‹</button>
              <span>Pág. {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 rounded border border-slate-700 disabled:opacity-30 hover:border-slate-500 transition">›</button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50 text-xs text-slate-400 uppercase tracking-wide">
                  {[
                    ["fecha_doc", "Fecha"],
                    ["apellidos_nombre", "Docente"],
                    ["especialidad", "Especialidad"],
                    ["centro_destino", "Centro"],
                    ["isla", "Isla"],
                    ["jornada", "Jornada"],
                    ["f_inicio", "F. Inicio"],
                    ["f_cese_prev", "F. Cese"],
                    ["duracion_dias", "Días"],
                  ].map(([k, label]) => (
                    <th key={k} onClick={() => handleSort(k)}
                      className="px-4 py-3 text-left cursor-pointer hover:text-white select-none whitespace-nowrap">
                      {label} <span className="ml-1 opacity-60"><SortIcon k={k} /></span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left whitespace-nowrap">Sustituido/a</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginated.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-slate-500">
                    No se encontraron resultados con los filtros actuales.
                  </td></tr>
                ) : (
                  paginated.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">{fmtDate(r.fecha_doc)}</td>
                      <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{fmt(r.apellidos_nombre)}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{fmt(r.especialidad)}</td>
                      <td className="px-4 py-3 text-slate-300 max-w-48 truncate" title={r.centro_destino}>{fmt(r.centro_destino)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.isla ? <Badge label={r.isla} color={islaColor(r.isla)} /> : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.jornada === "Completa"
                          ? <Badge label="Completa" color="green" />
                          : r.jornada === "Parcial"
                          ? <Badge label="Parcial" color="yellow" />
                          : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">{fmtDate(r.f_inicio)}</td>
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">{fmtDate(r.f_cese_prev)}</td>
                      <td className="px-4 py-3 text-center">
                        {r.duracion_dias ? (
                          <span className={`font-semibold ${Number(r.duracion_dias) >= 100 ? "text-blue-400" : Number(r.duracion_dias) >= 30 ? "text-green-400" : "text-slate-300"}`}>
                            {r.duracion_dias}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-44 truncate text-xs" title={r.sustituido}>
                        {fmt(r.sustituido) || <span className="text-blue-400 font-medium">Vacante</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-4 gap-1">
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-xs border transition ${page === p
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                  {p}
                </button>
              );
            })}
            {totalPages > 10 && <span className="text-slate-500 px-2 flex items-center text-xs">... {totalPages}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
