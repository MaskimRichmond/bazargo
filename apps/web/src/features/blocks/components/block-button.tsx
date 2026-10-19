"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { blockUserAction, unblockUserAction } from "../actions"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl";

interface BlockButtonProps {
  userId: string;
  isInitiallyBlocked: boolean;
  variant?: "outline" | "ghost" | "default" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
}

export function BlockButton({ userId, isInitiallyBlocked, variant = "outline", size = "sm" }: BlockButtonProps) {
    const t = useTranslations();
  const [isBlocked, setIsBlocked] = useState(isInitiallyBlocked)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleToggleBlock = async () => {
    if (!confirm(isBlocked ? "Разблокировать пользователя?" : "Заблокировать пользователя? Вы не сможете обмениваться сообщениями.")) return;
    
    setLoading(true)
    try {
      if (isBlocked) {
        await unblockUserAction(userId)
        setIsBlocked(false)
      } else {
        await blockUserAction(userId)
        setIsBlocked(true)
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message || "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant={isBlocked ? "secondary" : variant} 
      size={size} 
      onClick={handleToggleBlock} 
      disabled={loading}
      className={isBlocked ? "text-green-600" : "text-destructive hover:text-destructive"}
    >
      {isBlocked ? (
        <><ShieldCheck className="w-4 h-4 mr-2" /> {t("razblokirovat")}</>
      ) : (
        <><ShieldAlert className="w-4 h-4 mr-2" /> {t("zablokirovat")}</>
      )}
    </Button>
  );
}
