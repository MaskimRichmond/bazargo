import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"

export const metadata = {
  title: "Безопасность | BazarGo"
}

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Безопасность</h1>
        <p className="text-lg text-muted-foreground">Как безопасно покупать и продавать на BazarGo</p>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold">
        <p>
          Это заглушка для страницы "Безопасность". Реальный текст будет добавлен позже.
        </p>
        <h3>Раздел 1</h3>
        <p>
          Здесь будет подробное описание, условия или другая важная информация для пользователей платформы BazarGo.
        </p>
        <h3>Раздел 2</h3>
        <p>
          Платформа BazarGo активно развивается, и мы стремимся сделать процесс покупки и продажи максимально удобным и безопасным.
        </p>
      </div>
    </div>
  )
}
