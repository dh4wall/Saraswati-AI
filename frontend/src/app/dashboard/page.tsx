export default function DashboardPage() {
  return (
    <main className="flex min-h-screen bg-gray-950 text-white">
      <aside className="w-64 border-r border-gray-800 bg-gray-900 p-6">
        <h2 className="text-lg font-bold">Saraswati AI</h2>
        <nav className="mt-8 space-y-2">
          <a href="/dashboard" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-800">
            🏠 Home
          </a>
          <a href="/dashboard/projects" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-800">
            📁 Projects
          </a>
          <a href="/dashboard/canvas" className="block rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-800">
            🖊️ Canvas
          </a>
        </nav>
      </aside>
      <section className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Dashboard coming soon.</p>
      </section>
    </main>
  )
}
