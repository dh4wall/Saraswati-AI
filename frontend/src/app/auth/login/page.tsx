export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-gray-400 text-sm">Sign in to Saraswati AI</p>
        {/* Auth form will be added with full UI */}
        <p className="mt-8 text-center text-gray-500 text-sm">
          Auth UI coming soon — Supabase is wired up.
        </p>
      </div>
    </main>
  )
}
