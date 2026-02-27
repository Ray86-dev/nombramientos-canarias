import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🏫 Nombramientos Canarias</h1>
          <p className="text-slate-400">Sistema de información de nombramientos docentes · Consejería de Educación</p>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl font-bold">Consulta los nombramientos diarios</h2>
          <p className="text-xl text-slate-300">
            Accede a la información de nombramientos, sustituciones y vacantes de docentes en las Islas Canarias.
          </p>
        </div>

        {/* CTA Button */}
        <div className="flex gap-4">
          <Link
            href="/nombramientos"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            📊 Ver Nombramientos →
          </Link>
          <a
            href="https://github.com/Ray86-dev/nombramientos-canarias"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            GitHub ↗
          </a>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="font-semibold mb-2">Búsqueda avanzada</h3>
            <p className="text-slate-400 text-sm">Filtra por isla, especialidad, fechas y busca por nombre o centro.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-semibold mb-2">Responsive</h3>
            <p className="text-slate-400 text-sm">Accede desde cualquier dispositivo: móvil, tablet o escritorio.</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">Rápido</h3>
            <p className="text-slate-400 text-sm">Datos actualizados automáticamente con scraping diario.</p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 mt-12 text-sm text-slate-400">
          <p className="mb-2">
            <strong>Nota:</strong> Este proyecto utiliza datos públicos de la Consejería de Educación de Canarias.
          </p>
          <p>
            Para más información sobre el proyecto, visita el{" "}
            <a href="https://github.com/Ray86-dev/nombramientos-canarias" className="text-blue-400 hover:text-blue-300">
              repositorio en GitHub
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
