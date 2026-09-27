"use client"

import { useState } from "react"
import { moderateListingAction } from "@/features/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Ban, CheckCircle } from "lucide-react"

type Listing = {
  id: string
  status: string
}

export function ListingActions({ listing }: { listing: Listing }) {
  const [isPending, setIsPending] = useState(false)
  const [reason, setReason] = useState("")
  const [actionType, setActionType] = useState<'BLOCK' | 'ACTIVATE' | null>(null)

  const handleAction = async () => {
    if (!reason.trim()) {
      toast.error("Пожалуйста, укажите причину")
      return
    }

    setIsPending(true)
    try {
      if (actionType === 'BLOCK') {
        await moderateListingAction(listing.id, 'BLOCKED', reason)
        toast.success("Объявление заблокировано")
      } else if (actionType === 'ACTIVATE') {
        await moderateListingAction(listing.id, 'ACTIVE', reason)
        toast.success("Объявление восстановлено")
      }
      setActionType(null)
      setReason("")
    } catch (e: any) {
      toast.error(e.message || "Произошла ошибка")
    } finally {
      setIsPending(false)
    }
  }

  if (actionType) {
    return (
      <div className="flex items-center gap-2 justify-end">
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
        <Button size="sm" className="h-8" variant="ghost" disabled={isPending} onClick={() => {
          setActionType(null)
          setReason("")
        }}>
          Отмена
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {listing.status === 'BLOCKED' ? (
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 text-xs"
          onClick={() => setActionType('ACTIVATE')}
        >
          <CheckCircle className="w-3 h-3 mr-1" /> Разблокировать
        </Button>
      ) : (
        <Button 
          size="sm" 
          variant="destructive" 
          className="h-8 text-xs"
          onClick={() => setActionType('BLOCK')}
        >
          <Ban className="w-3 h-3 mr-1" /> Заблокировать
        </Button>
      )}
    </div>
  )
}
