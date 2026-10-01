"use client"

import { Share } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl";

interface ShareButtonProps {
  title: string
  text?: string
  className?: string
}

export function ShareButton({ title, text, className }: ShareButtonProps) {
    const t = useTranslations();
  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url,
        })
      } catch (error) {
        // user aborted or another error, don't show toast for abort
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(url)
        }
      }
    } else {
      copyToClipboard(url)
    }
  }

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success("Ссылка скопирована")
      })
      .catch(() => {
        toast.error("Не удалось скопировать ссылку")
      })
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleShare}
      className={className}
      aria-label={t("podelitsya")}
    >
      <Share className="w-5 h-5" />
    </Button>
  );
}
