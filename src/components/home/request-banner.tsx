import { FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function RequestBanner() {
  return (
    <section className="py-12 bg-primary text-primary-foreground overflow-hidden relative">
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10 pointer-events-none">
        <FileQuestion className="w-96 h-96" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-8 justify-between">
          <div className="max-w-2xl text-center lg:text-left">
            <h2 className="text-3xl font-bold mb-4">Не нашли то, что нужно?</h2>
            <p className="text-primary-foreground/90 text-lg mb-8">
              Создайте запрос — продавцы сами предложат подходящие варианты. Это быстро и бесплатно.
            </p>
            <Button asChild size="lg" variant="secondary" className="font-semibold px-8 w-full sm:w-auto">
              <Link href="/requests/create">
                Создать запрос
              </Link>
            </Button>
          </div>
          
          <div className="bg-background text-foreground p-6 rounded-2xl shadow-xl max-w-sm w-full rotate-2 hover:rotate-0 transition-transform hidden md:block">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs font-semibold">Ищу товар</span>
            </div>
            <h4 className="font-semibold text-lg mb-2">iPhone 13 128 GB</h4>
            <p className="text-sm text-muted-foreground mb-4 border-b pb-4">
              до 30 000 сом <br />
              Бишкек
            </p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-medium text-sm">А</span>
              </div>
              <span className="text-sm font-medium">Айбек ждёт предложений</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
