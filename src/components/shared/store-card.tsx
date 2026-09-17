import Link from "next/link"
import { CheckCircle2, Star } from "lucide-react"
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
    avatar: string
    isVerified: boolean
  }
}

export function StoreCard({ store }: StoreCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow border-muted">
      <CardContent className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-muted relative">
            <ImageWithFallback src={store.avatar} alt={store.name} />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/store/${store.id}`} className="hover:text-primary transition-colors flex items-center gap-1.5">
              <h3 className="font-semibold truncate">{store.name}</h3>
              {store.isVerified && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
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
        </div>
        
        <Button variant="outline" className="w-full text-primary hover:text-primary hover:bg-primary/5 border-primary/20">
          Подписаться
        </Button>
      </CardContent>
    </Card>
  )
}
