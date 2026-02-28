"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

// ─── tipos ─────────────────────────────────────────────────────────────
interface Nombramiento {
  fecha_doc: string;
  especialidad: string;
  isla: string;
  jornada: string;
  duracion_dias: string;
  sustituido: string;
  [key: string]: string;
}

interface StatsPanelProps {
  data: Nombramiento[];       // datos filtrados
  totalData: Nombramiento[];  // datos sin filtrar (para contexto)
}

// ─── helpers ───────────────────────────────────────────────────────────
function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  // Get Monday of the week
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

function fmtWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  if (isNaN(d.getTime())) return weekStart;
  const day = d.getDate();
  const month = d.toLocaleDateString("es-ES", { month: "short" });
  return `${day} ${month}`;
}

// ─── KPI Card ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#141414] border border-[#222222] p-4 flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">{label}</span>
      <span className="font-mono text-xl text-[#f5f5f5] tabular-nums">{value}</span>
      {sub && <span className="font-mono text-[10px] text-[#444444]">{sub}</span>}
    </div>
  );
}

// ─── Tooltip personalizado ─────────────────────────────────────────────
function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-[#333333] px-3 py-2 font-mono text-xs">
      <p className="text-[#f5f5f5] mb-1">{d.name}</p>
      <p className="text-[#888888]">{d.count} nombramientos</p>
    </div>
  );
}

function CustomAreaTooltip({ active, payload, label }: any) {
  if (!active || !payload?.[0]) return null;
  return (
    <div className="bg-[#1a1a1a] border border-[#333333] px-3 py-2 font-mono text-xs">
      <p className="text-[#888888] mb-1">Sem. {label}</p>
      <p className="text-[#f5f5f5]">{payload[0].value} nombramientos</p>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────
export default function StatsPanel({ data, totalData }: StatsPanelProps) {
  // ── KPIs ──
  const kpis = useMemo(() => {
    const total = data.length;
    const especialidades = new Set(data.map((r) => r.especialidad).filter(Boolean)).size;

    const duraciones = data
      .map((r) => Number(r.duracion_dias))
      .filter((n) => !isNaN(n) && n > 0);
    const durMedia = duraciones.length
      ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length)
      : 0;

    const vacantes = data.filter(
      (r) => !r.sustituido || r.sustituido.trim() === "" || r.sustituido === "nan"
    ).length;
    const pctVacantes = total > 0 ? Math.round((vacantes / total) * 100) : 0;

    return { total, especialidades, durMedia, pctVacantes, vacantes };
  }, [data]);

  // ── Top 15 especialidades ──
  const topEspecialidades = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      if (r.especialidad && r.especialidad !== "nan") {
        counts[r.especialidad] = (counts[r.especialidad] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [data]);

  // ── Timeline semanal ──
  const timeline = useMemo(() => {
    const weeks: Record<string, number> = {};
    data.forEach((r) => {
      const w = getISOWeek(r.fecha_doc);
      if (w) weeks[w] = (weeks[w] || 0) + 1;
    });
    return Object.entries(weeks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({
        week: fmtWeekLabel(week),
        count,
      }));
  }, [data]);

  const isFiltered = data.length !== totalData.length;

  return (
    <section className="bg-[#111111] border border-[#222222] p-4 space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="font-sans text-xs font-semibold text-[#f5f5f5] uppercase tracking-widest">
          Estadísticas
        </h2>
        {isFiltered && (
          <span className="font-mono text-[10px] text-[#555555] bg-[#1a1a1a] border border-[#222222] px-2 py-0.5">
            Filtros aplicados · {data.length.toLocaleString()} de {totalData.length.toLocaleString()}
          </span>
        )}
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Nombramientos"
          value={kpis.total.toLocaleString()}
          sub={isFiltered ? `de ${totalData.length.toLocaleString()} totales` : undefined}
        />
        <KpiCard label="Especialidades" value={kpis.especialidades} />
        <KpiCard label="Duración media" value={`${kpis.durMedia} días`} />
        <KpiCard
          label="Vacantes"
          value={`${kpis.pctVacantes}%`}
          sub={`${kpis.vacantes} de ${kpis.total}`}
        />
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Barras: Top especialidades */}
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#555555] mb-3">
            Top 15 especialidades
          </h3>
          {topEspecialidades.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart
                data={topEspecialidades}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#555555", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#222222" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={180}
                  tick={{ fill: "#888888", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "#1a1a1a" }} />
                <Bar dataKey="count" fill="#f5f5f5" radius={[0, 2, 2, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="font-mono text-xs text-[#444444] py-8 text-center">Sin datos</p>
          )}
        </div>

        {/* Área: Timeline semanal */}
        <div className="bg-[#0e0e0e] border border-[#1a1a1a] p-4">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-[#555555] mb-3">
            Nombramientos por semana
          </h3>
          {timeline.length > 1 ? (
            <ResponsiveContainer width="100%" height={380}>
              <AreaChart
                data={timeline}
                margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="gradArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f5f5f5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f5f5f5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis
                  dataKey="week"
                  tick={{ fill: "#555555", fontSize: 9, fontFamily: "monospace" }}
                  axisLine={{ stroke: "#222222" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fill: "#555555", fontSize: 10, fontFamily: "monospace" }}
                  axisLine={false}
                  tickLine={false}
                  width={35}
                />
                <Tooltip content={<CustomAreaTooltip />} cursor={{ stroke: "#333333" }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#f5f5f5"
                  strokeWidth={1.5}
                  fill="url(#gradArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="font-mono text-xs text-[#444444] py-8 text-center">
              {timeline.length === 1
                ? `Semana única: ${timeline[0].count} nombramientos`
                : "Sin datos temporales"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
