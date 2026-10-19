import React from "react"
import Link from "next/link"

export function BazaarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 2.5L20.5 7.2V16.8L12 21.5L3.5 16.8V7.2L12 2.5Z"
        stroke="#10B981"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 2.5V12M12 12L20.5 7.2M12 12L3.5 7.2"
        stroke="#10B981"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 12V21.5"
        stroke="#10B981"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.5" fill="#10B981" />
    </svg>
  )
}

export function BazaarLogo({
  href = "/",
  size = "header",
  className = ""
}: {
  showVersion?: boolean
  href?: string
  size?: "default" | "header" | "footer" | "sm" | "lg"
  className?: string
}) {
  const isFooter = size === "footer" || size === "lg"
  const isSmall = size === "sm"

  const boxSize = isFooter 
    ? "w-10 h-10 rounded-xl" 
    : isSmall 
    ? "w-7 h-7 rounded-lg" 
    : "w-8 h-8 rounded-lg"

  const iconSize = isFooter ? "w-6 h-6" : isSmall ? "w-4 h-4" : "w-5 h-5"
  const textSize = isFooter ? "text-2xl" : isSmall ? "text-base" : "text-xl"

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 outline-none group select-none ${className}`}>
      <div className={`${boxSize} bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 p-1 group-hover:border-emerald-500/50 transition-colors`}>
        <BazaarIcon className={`${iconSize} group-hover:scale-105 transition-transform`} />
      </div>

      <div className={`flex items-center tracking-tight font-bold ${textSize} leading-none`}>
        <span className="text-zinc-900 dark:text-white">Bazaar</span>
        <span className="text-emerald-600 dark:text-emerald-400">OS</span>
      </div>
    </Link>
  )
}
