import { createFileRoute } from '@tanstack/react-router'
import ReportIssue from '../ReportIssue'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-[#E5EBE3] text-zinc-800 p-6 font-sans">
      {/* Header Section */}
      <header className="mb-8">
        <span className="text-xs tracking-widest text-zinc-500 uppercase font-semibold">
          COLLECTION ALMANAC
        </span>
        <h1 className="text-3xl font-serif font-bold text-zinc-900 mt-1">
          Kaunas Švara
        </h1>
        <p className="text-sm italic text-zinc-600 mt-1">
          Put bins out the night before.
        </p>
      </header>

      {/* Main Content & Report Form Component */}
      <main className="flex-1 max-w-md mx-auto w-full bg-white/60 backdrop-blur-md rounded-2xl p-5 shadow-sm border border-white/40 mb-20">
        <ReportIssue />
      </main>

      {/* Footer Link */}
      <footer className="text-xs text-zinc-400 text-center mb-16">
        grafikai.svara.lt
      </footer>
    </div>
  )
}
