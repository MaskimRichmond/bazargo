import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"

export const metadata = {
  title: "Страница не найдена | BazarGo"
}

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center min-h-[70vh]">
      <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
        <ShoppingBag className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Страница не найдена</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-md">
        Похоже, этой страницы не существует или она была удалена. 
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <Link href="/catalog">В каталог</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-xl font-semibold">
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  )
}
