import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BazaarLogo } from "@/components/shared/bazaar-logo"
import { FileQuestion, Sparkles, ArrowRight, Layers } from "lucide-react"

export const metadata = {
  title: "404 — Страница не найдена | BazaarOS",
  description: "Запрашиваемый ресурс или коммерческая заявка не найдена."
}

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center min-h-[70vh] space-y-6">
      <div className="mb-2">
        <BazaarLogo />
      </div>

      <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
        <FileQuestion className="w-8 h-8" />
      </div>

      <div className="space-y-2 max-w-md">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 font-mono text-xs font-semibold">
          ERROR 404 • RESOURCE_NOT_FOUND
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Страница не найдена
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Возможно, коммерческий запрос был закрыт, перемещен или указан неверный адрес.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full max-w-sm sm:max-w-none justify-center">
        <Button asChild size="lg" className="w-full sm:w-auto rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-500 text-white gap-2 shadow-lg shadow-emerald-950/40">
          <Link href="/requests">
            <Layers className="w-4 h-4" />
            <span>Вернуться в панель закупок</span>
          </Link>
        </Button>

        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto rounded-xl font-semibold border-zinc-800 bg-[#11131A] text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2">
          <Link href="/requests/create">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Создать AI-запрос</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
