"use client"
import { useState } from "react"
import { moderateListingAction } from "@/features/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Ban, CheckCircle, XCircle } from "lucide-react"
import { useTranslations } from "next-intl";

type Listing = {
  id: string
  status: string
}

export function ListingActions({ listing }: { listing: Listing }) {
  const t = useTranslations();
  const [isPending, setIsPending] = useState(false)
  const [reason, setReason] = useState("")
  const [actionType, setActionType] = useState<'BLOCK' | 'ACTIVATE' | 'REJECT' | null>(null)

  const handleAction = async () => {
    if ((actionType === 'BLOCK' || actionType === 'REJECT') && !reason.trim()) {
      toast.error("Пожалуйста, укажите причину")
      return
    }

    setIsPending(true)
    try {
      if (actionType === 'BLOCK') {
        await moderateListingAction(listing.id, 'BLOCKED', reason || 'Заблокировано модератором')
        toast.success("Объявление заблокировано")
      } else if (actionType === 'ACTIVATE') {
        await moderateListingAction(listing.id, 'ACTIVE', reason || 'Одобрено модератором')
        toast.success("Объявление активировано/одобрено")
      } else if (actionType === 'REJECT') {
        await moderateListingAction(listing.id, 'REJECTED', reason)
        toast.success("Объявление отклонено")
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
        {(actionType === 'BLOCK' || actionType === 'REJECT') && (
          <Input 
            size={1} 
            className="w-32 h-8 text-xs" 
            placeholder={t("prichina")} 
            value={reason} 
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
          />
        )}
        <Button size="sm" className="h-8" variant="default" disabled={isPending} onClick={handleAction}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
        </Button>
        <Button size="sm" className="h-8" variant="ghost" disabled={isPending} onClick={() => {
          setActionType(null)
          setReason("")
        }}>
          {t("otmena")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {listing.status === 'PENDING' ? (
        <>
          <Button 
            size="sm" 
            variant="default" 
            className="h-8 text-xs bg-green-600 hover:bg-green-700"
            onClick={() => setActionType('ACTIVATE')}
          >
            <CheckCircle className="w-3 h-3 mr-1" /> Одобрить
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            className="h-8 text-xs"
            onClick={() => setActionType('REJECT')}
          >
            <XCircle className="w-3 h-3 mr-1" /> Отклонить
          </Button>
        </>
      ) : listing.status === 'BLOCKED' || listing.status === 'REJECTED' ? (
        <Button 
          size="sm" 
          variant="outline" 
          className="h-8 text-xs"
          onClick={() => setActionType('ACTIVATE')}
        >
          <CheckCircle className="w-3 h-3 mr-1" /> {t("razblokirovat")}
        </Button>
      ) : (
        <Button 
          size="sm" 
          variant="destructive" 
          className="h-8 text-xs"
          onClick={() => setActionType('BLOCK')}
        >
          <Ban className="w-3 h-3 mr-1" /> {t("zablokirovat")}
        </Button>
      )}
    </div>
  );
}
