export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-5xl font-bold tracking-tight">Saraswati AI</h1>
      <p className="mt-4 text-gray-400 text-lg">
        Your multi-agent academic research partner.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/auth/login"
          className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 transition"
        >
          Get Started
        </a>
        <a
          href="/dashboard"
          className="rounded-lg border border-gray-700 px-6 py-3 font-semibold hover:bg-gray-800 transition"
        >
          Dashboard
        </a>
      </div>
    </main>
  )
}
