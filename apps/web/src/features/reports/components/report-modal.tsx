"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createReportAction } from "../actions"
import { Flag } from "lucide-react"
import { useTranslations } from "next-intl";

interface ReportModalProps {
  targetId: string;
  targetType: 'LISTING' | 'USER' | 'MESSAGE' | 'STORE';
  trigger?: React.ReactNode;
}

const REPORT_REASONS = [
  "Запрещенный товар",
  "Мошенничество",
  "Спам",
  "Оскорбительное поведение",
  "Нарушение интеллектуальной собственности",
  "Другое"
]

export function ReportModal({ targetId, targetType, trigger }: ReportModalProps) {
    const t = useTranslations();
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REPORT_REASONS[0])
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await createReportAction({ targetId, targetType, reason, description })
      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Ошибка при отправке жалобы")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 text-muted-foreground hover:text-red-500">
            <Flag className="w-4 h-4" /> {t("pozhalovatsya")}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("pozhalovatsya")}</DialogTitle>
          <DialogDescription>
            {t("vasha_zhaloba_budet_anonimno")}</DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center text-green-600 font-medium">
            {t("zhaloba_uspeshno_otpravlena_spasibo")}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded-md">{error}</div>}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("prichina")}</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {REPORT_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dopolnitelnye_detali_neobyazatelno")}</label>
              <Textarea 
                placeholder={t("opishite_problemu_podrobnee")} 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправка..." : "Отправить жалобу"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
