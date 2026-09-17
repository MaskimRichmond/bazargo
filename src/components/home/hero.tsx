import { Search, MapPin, CheckCircle2, FileQuestion, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { ImageWithFallback } from "@/components/shared/image-with-fallback"

const QUICK_LINKS = ["iPhone 13", "Авто", "Квартиры", "Одежда", "Мебель"]

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background py-10 md:py-16 lg:py-24 border-b">
      {/* Glow Effects */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Side: Content */}
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-foreground leading-[1.1]">
              Покупай. Продавай. <br />
              <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-600">
                Развивайся с BazarGo.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Больше, чем объявления. Это платформа, где ты найдешь нужный товар, проверенных продавцов и возможности для роста твоего бизнеса.
            </p>

            {/* Smart Search */}
            <div className="bg-background rounded-2xl p-2 shadow-lg border border-border/50 flex flex-col sm:flex-row gap-2 max-w-xl mx-auto lg:mx-0">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
                <Input 
                  className="h-12 w-full pl-11 text-base border-none shadow-none focus-visible:ring-0 bg-transparent" 
                  placeholder="Например: iPhone 13 128GB до 30000" 
                />
              </div>
              <Button className="h-12 px-8 text-base font-medium rounded-xl shrink-0">
                Найти
              </Button>
            </div>

            {/* Quick Links */}
            <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-2 md:gap-3 text-sm">
              <span className="text-muted-foreground mr-1 hidden sm:inline-block">Ищут сейчас:</span>
              {QUICK_LINKS.map((link) => (
                <Link 
                  key={link} 
                  href={`/catalog?q=${link.toLowerCase()}`}
                  className="bg-muted text-muted-foreground px-3 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors font-medium outline-none"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side: Visual Composition */}
          <div className="hidden lg:block relative h-[500px]">
            {/* Main Product Card */}
            <Card className="absolute top-10 right-20 w-[280px] shadow-2xl border-muted/50 rotate-[-2deg] hover:rotate-0 transition-transform duration-500 z-20">
              <div className="aspect-[4/3] w-full bg-muted overflow-hidden rounded-t-xl relative">
                <ImageWithFallback 
                  src="/demo/products/nike.jpg" 
                  alt="Nike" 
                  fallbackText="Nike Air Force 1"
                />
              </div>
              <CardContent className="p-4 bg-background rounded-b-xl">
                <h3 className="font-semibold text-sm mb-1 truncate">Кроссовки Nike Air Force 1</h3>
                <div className="font-bold text-lg mb-2">6 500 сом</div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>Бишкек</span>
                </div>
              </CardContent>
            </Card>

            {/* Mini Store Card */}
            <Card className="absolute bottom-12 right-0 w-[240px] shadow-xl border-muted/50 rotate-[3deg] hover:rotate-0 transition-transform duration-500 z-30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full relative overflow-hidden shrink-0">
                  <ImageWithFallback 
                    src="/demo/stores/techstore.jpg" 
                    alt="Store" 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-semibold text-sm truncate">TechStore</h4>
                    <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground">Надежный продавец</div>
                </div>
              </CardContent>
            </Card>

            {/* Request Preview Card */}
            <Card className="absolute top-32 right-80 w-[260px] shadow-xl border-muted/50 rotate-[-5deg] hover:rotate-0 transition-transform duration-500 z-10 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-orange-500/10 rounded-md text-orange-600">
                    <FileQuestion className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Запрос</span>
                </div>
                <h4 className="font-semibold text-sm mb-1">Ищу MacBook Pro M2</h4>
                <p className="text-xs text-muted-foreground">до 90 000 сом • Готов купить сегодня</p>
              </CardContent>
            </Card>

            {/* Floating Dots / Accents */}
            <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-primary rounded-full blur-sm" />
            <div className="absolute bottom-1/4 right-1/4 w-2 h-2 bg-emerald-400 rounded-full blur-[1px]" />
            <div className="absolute top-1/4 right-1/3 w-4 h-4 bg-blue-400 rounded-full blur-md opacity-50" />
          </div>

        </div>
      </div>
    </section>
  )
}
