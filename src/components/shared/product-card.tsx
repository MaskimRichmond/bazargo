import Link from "next/link"
import { Heart, MapPin, CheckCircle2, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ImageWithFallback } from "@/components/shared/image-with-fallback"

interface ProductCardProps {
  product: {
    id: string
    title: string
    price: number
    city: string
    time: string
    condition: string
    seller: { name: string; rating: number; reviews: number }
    image: string
    isVerified: boolean
  }
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 border-border/50 flex flex-col h-full relative outline-none focus-within:ring-2 focus-within:ring-primary rounded-2xl">
      <button 
        className="absolute top-3 right-3 z-10 bg-background/80 backdrop-blur-md hover:bg-background rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 outline-none shadow-sm"
        aria-label="Добавить в избранное"
      >
        <Heart className="w-4 h-4 text-foreground" />
      </button>
      
      <Link href={`/product/${product.id}`} className="block relative aspect-square sm:aspect-[4/3] bg-muted overflow-hidden outline-none">
        <ImageWithFallback 
          src={product.image} 
          alt={product.title}
          fallbackText={product.title}
          className="group-hover:scale-105 transition-transform duration-500"
        />
        {product.isVerified && (
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
            <CheckCircle2 className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-semibold">Проверен</span>
          </div>
        )}
      </Link>
      
      <CardContent className="p-3 sm:p-4 flex flex-col flex-1 bg-card">
        <Link href={`/product/${product.id}`} className="hover:text-primary transition-colors block mb-1 outline-none">
          <h3 className="font-semibold text-sm sm:text-base line-clamp-2 leading-tight" title={product.title}>
            {product.title}
          </h3>
        </Link>
        
        <div className="font-bold text-lg sm:text-xl mb-3 text-foreground">
          {new Intl.NumberFormat("ru-RU").format(product.price)} <span className="text-sm font-normal text-muted-foreground">сом</span>
        </div>

        <div className="mt-auto space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{product.city}</span>
            <span className="shrink-0">•</span>
            <span className="shrink-0 truncate">{product.time}</span>
          </div>
          
          <div className="pt-2.5 border-t border-border/50 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium">{product.condition}</span>
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-foreground">{product.seller.rating}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
