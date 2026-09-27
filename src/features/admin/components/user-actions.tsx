"use client"

import { useState } from "react"
import { blockUserAction, unblockUserAction } from "@/features/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, ShieldOff, ShieldAlert } from "lucide-react"

type Profile = {
  id: string
  full_name: string | null
  role: string
  is_banned: boolean
}

export function UserActions({ user }: { user: Profile }) {
  const [isPending, setIsPending] = useState(false)
  const [reason, setReason] = useState("")
  const [showReason, setShowReason] = useState(false)

  const handleAction = async () => {
    if (!reason.trim()) {
      toast.error("Пожалуйста, укажите причину")
      return
    }

    setIsPending(true)
    try {
      if (user.is_banned) {
        await unblockUserAction(user.id, reason)
        toast.success("Пользователь разблокирован")
      } else {
        await blockUserAction(user.id, reason)
        toast.success("Пользователь заблокирован")
      }
      setShowReason(false)
      setReason("")
    } catch (e: any) {
      toast.error(e.message || "Произошла ошибка")
    } finally {
      setIsPending(false)
    }
  }

  if (showReason) {
    return (
      <div className="flex items-center gap-2">
        <Input 
          size={1} 
          className="w-32 h-8 text-xs" 
          placeholder="Причина..." 
          value={reason} 
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
        />
        <Button size="sm" className="h-8" variant="default" disabled={isPending} onClick={handleAction}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
        </Button>
        <Button size="sm" className="h-8" variant="ghost" disabled={isPending} onClick={() => setShowReason(false)}>
          Отмена
        </Button>
      </div>
    )
  }

  if (user.role === 'SUPER_ADMIN') {
    return <span className="text-xs text-muted-foreground">Неизменяемый</span>
  }

  return (
    <Button 
      size="sm" 
      variant={user.is_banned ? "outline" : "destructive"} 
      className="h-8 text-xs"
      onClick={() => setShowReason(true)}
    >
      {user.is_banned ? (
        <><ShieldOff className="w-3 h-3 mr-1" /> Разблокировать</>
      ) : (
        <><ShieldAlert className="w-3 h-3 mr-1" /> Заблокировать</>
      )}
    </Button>
  )
}
