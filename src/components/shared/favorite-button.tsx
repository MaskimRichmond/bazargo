"use client"

import { useState } from "react"
import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { toggleFavorite } from "@/app/actions/favorites"

interface FavoriteButtonProps {
  listingId: string
  initialIsFavorite: boolean
  className?: string
  iconClassName?: string
}

export function FavoriteButton({ listingId, initialIsFavorite, className, iconClassName }: FavoriteButtonProps) {
  const router = useRouter()
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading) return
    
    setIsLoading(true)
    
    // Optimistic update
    setIsFavorite(!isFavorite)

    const result = await toggleFavorite(listingId)
    
    if (!result.success) {
      // Rollback
      setIsFavorite(isFavorite)
      
      if (result.error === "AUTH_REQUIRED") {
        router.push(`/login?redirect_to=/product/${listingId}`)
      } else {
        alert(result.error)
      }
    } else {
      if (result.isFavorited !== undefined) {
        setIsFavorite(result.isFavorited)
      }
    }
    
    setIsLoading(false)
  }

  return (
    <button 
      className={`z-10 bg-background/80 backdrop-blur-md hover:bg-background rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all focus-visible:opacity-100 outline-none shadow-sm disabled:opacity-50 ${isFavorite ? "opacity-100" : ""} ${className || ""}`}
      aria-label={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
      onClick={handleClick}
      disabled={isLoading}
    >
      <Heart className={`w-4 h-4 transition-colors ${isFavorite ? "fill-red-500 text-red-500" : "text-foreground"} ${iconClassName || ""}`} />
    </button>
  )
}
