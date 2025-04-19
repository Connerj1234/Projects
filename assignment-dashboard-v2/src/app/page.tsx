export default function Home() {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 text-white px-4 text-center">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold mb-4">Conner's Productivity Hub</h1>
          <p className="text-lg text-zinc-300 mb-8">
            Assignments, To-Dos, Reminders, and Calendar.
          </p>

          <div className="flex justify-center gap-4">
            <a
              href="/.login"
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
            >
              Log In
            </a>
            <a
              href="/.signup"
              className="px-6 py-3 rounded-xl border border-blue-500 text-blue-400 font-semibold hover:bg-blue-800 transition"
            >
              Sign Up
            </a>
          </div>
        </div>
      </main>
    )
  }
