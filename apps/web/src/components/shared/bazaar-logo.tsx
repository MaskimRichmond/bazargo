import React from "react"
import Link from "next/link"

export function BazaarIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top Facet */}
      <path
        d="M12 2.5L21 7.5L12 12.5L3 7.5L12 2.5Z"
        className="fill-emerald-500/25 stroke-emerald-500"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Left Facet */}
      <path
        d="M3 7.5L12 12.5V21.5L3 16.5V7.5Z"
        className="fill-zinc-900/40 dark:fill-zinc-900/80 stroke-zinc-700 dark:stroke-zinc-600"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Right Facet */}
      <path
        d="M21 7.5L12 12.5V21.5L21 16.5V7.5Z"
        className="fill-emerald-950/20 dark:fill-emerald-950/40 stroke-emerald-600/80"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Inner Precision Grid / Logistics Node */}
      <circle cx="12" cy="12.5" r="1.25" className="fill-emerald-400" />
      <path
        d="M7.5 5L16.5 10"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeOpacity="0.3"
        strokeDasharray="1.5 1.5"
      />
    </svg>
  )
}

export function BazaarLogo({
  showVersion = true,
  href = "/"
}: {
  showVersion?: boolean
  href?: string
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5 outline-none group select-none">
      <div className="w-8 h-8 rounded-lg bg-zinc-900/90 dark:bg-zinc-900 border border-zinc-800 flex items-center justify-center p-1.5 shadow-sm group-hover:border-emerald-500/40 transition-colors">
        <BazaarIcon className="w-full h-full text-foreground group-hover:scale-105 transition-transform" />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-extrabold text-lg tracking-tight text-foreground">
          Bazaar
        </span>
        <span className="px-1.5 py-0.5 rounded text-[11px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 tracking-wide font-mono">
          OS
        </span>
        {showVersion && (
          <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 font-medium ml-0.5">
            v2.0
          </span>
        )}
      </div>
    </Link>
  )
}
