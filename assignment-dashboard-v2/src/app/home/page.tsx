import Link from "next/link";

export default function HomePage() {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-4">Welcome to Your Productivity Hub</h1>
        <p className="text-lg">Access your assignments, to-dos, and calendar from here.</p>
        <div className="flex flex-col gap-4"></div>
        <Link href="/dashboard">
            <button className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
                Go to Dashboard
            </button>
        </Link>
      </div>
    )
  }
