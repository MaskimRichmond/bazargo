"use client"

import { useState } from "react"
import { resolveReportAction } from "@/features/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { useTranslations } from "next-intl";

type Report = {
  id: string
  status: string
}

export function ReportActions({ report }: { report: Report }) {
    const t = useTranslations();
  const [isPending, setIsPending] = useState(false)
  const [notes, setNotes] = useState("")
  const [actionType, setActionType] = useState<'RESOLVED' | 'REJECTED' | null>(null)

  const handleAction = async () => {
    if (!notes.trim()) {
      toast.error("Пожалуйста, укажите примечание к резолюции")
      return
    }

    setIsPending(true)
    try {
      if (actionType === 'RESOLVED') {
        await resolveReportAction(report.id, 'RESOLVED', notes)
        toast.success("Жалоба удовлетворена")
      } else if (actionType === 'REJECTED') {
        await resolveReportAction(report.id, 'REJECTED', notes)
        toast.success("Жалоба отклонена")
      }
      setActionType(null)
      setNotes("")
    } catch (e: any) {
      toast.error(e.message || "Произошла ошибка")
    } finally {
      setIsPending(false)
    }
  }

  if (report.status === 'RESOLVED' || report.status === 'REJECTED') {
    return (
      <span className="text-xs text-muted-foreground">
        {t("obrabotano")}</span>
    );
  }

  if (actionType) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <Input 
          size={1} 
          className="w-32 h-8 text-xs" 
          placeholder={t("primechanie")} 
          value={notes} 
          onChange={(e) => setNotes(e.target.value)}
          disabled={isPending}
        />
        <Button size="sm" className="h-8" variant="default" disabled={isPending} onClick={handleAction}>
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
        </Button>
        <Button size="sm" className="h-8" variant="ghost" disabled={isPending} onClick={() => {
          setActionType(null)
          setNotes("")
        }}>
          {t("otmena")}</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 text-xs text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
        onClick={() => setActionType('RESOLVED')}
      >
        <CheckCircle className="w-3 h-3 mr-1" /> {t("prinyat")}</Button>
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 text-xs text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
        onClick={() => setActionType('REJECTED')}
      >
        <XCircle className="w-3 h-3 mr-1" /> {t("otklonit")}</Button>
    </div>
  );
}
