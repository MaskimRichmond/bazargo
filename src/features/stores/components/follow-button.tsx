"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { toggleFollowStore } from "@/app/actions/stores"
import { Loader2, UserPlus, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"

export function FollowButton({ storeId, initialIsFollowing }: { storeId: string, initialIsFollowing: boolean }) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations()

  const handleFollow = async () => {
    setIsLoading(true)
    try {
      const res = await toggleFollowStore(storeId)
      if (res.error) {
        if (res.error === "Необходима авторизация") {
          router.push(`/login?redirect_to=/`)
        } else {
          console.error(res.error)
        }
      } else {
        setIsFollowing(res.isFollowing!)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleFollow}
      disabled={isLoading}
      variant={isFollowing ? "outline" : "default"}
      className="rounded-xl font-semibold min-w-[140px]"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : isFollowing ? (
        <UserCheck className="w-4 h-4 mr-2" />
      ) : (
        <UserPlus className="w-4 h-4 mr-2" />
      )}
      {isFollowing ? t("vy_podpisany") : t("podpisatsya")}
    </Button>
  );
}
