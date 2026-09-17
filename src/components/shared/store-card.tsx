import Link from "next/link"
import { CheckCircle2, Star, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { ImageWithFallback } from "@/components/shared/image-with-fallback"

interface StoreCardProps {
  store: {
    id: string
    name: string
    category: string
    rating: number
    reviews: number
    image?: string
    avatar?: string
    isVerified: boolean
    itemsCount?: number
    slug?: string
  }
}

export function StoreCard({ store }: StoreCardProps) {
  const imgSrc = store.image || store.avatar || ""
  const href = `/store/${store.slug || store.id}`

  return (
    <Card className="hover:shadow-md transition-shadow border-muted">
      <CardContent className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-muted relative">
            <ImageWithFallback src={imgSrc} alt={store.name} />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={href} className="hover:text-primary transition-colors flex items-center gap-1.5">
              <h3 className="font-semibold truncate">{store.name}</h3>
              {store.isVerified && <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />}
            </Link>
            <p className="text-sm text-muted-foreground truncate">{store.category}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{store.rating}</span>
            <span className="text-muted-foreground text-sm">({store.reviews})</span>
          </div>
          {store.itemsCount !== undefined && (
            <div className="flex items-center gap-1 text-muted-foreground text-sm">
              <Package className="w-4 h-4" />
              <span>{store.itemsCount} тов.</span>
            </div>
          )}
        </div>
        
        <Button asChild variant="outline" className="w-full text-primary hover:text-primary hover:bg-primary/5 border-primary/20 rounded-xl">
          <Link href={href}>В магазин</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
