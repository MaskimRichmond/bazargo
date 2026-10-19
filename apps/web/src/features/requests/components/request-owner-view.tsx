"use client"

import { useState, useTransition } from "react"
import { useRouter } from "@/i18n/routing"
import { closeRequest, deleteRequest } from "@/app/actions/requests"
import { AiComparisonEngine, OfferItem } from "./ai-comparison-engine"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  SlidersHorizontal,
  Package,
  Trash2,
  AlertTriangle,
  X
} from "lucide-react"

interface RequestOwnerViewProps {
  requestId: string
  offers: OfferItem[]
  currentUserId?: string | null
  requestTitle: string
  requestQuantity: number
  requestUnit: string
  suggestedMaxPrice?: number | null
  effectiveStatus: string
}

export function RequestOwnerView({
  requestId,
  offers,
  currentUserId,
  requestTitle,
  requestQuantity,
  requestUnit,
  suggestedMaxPrice,
  effectiveStatus
}: RequestOwnerViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isClosing, setIsClosing] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [closeSuccess, setCloseSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = async () => {
    setIsClosing(true)
    setError(null)
    try {
      const res = await closeRequest(requestId)
      if (res.error) {
        setError(res.error)
        toast.error(res.error)
      } else {
        setCloseSuccess(true)
        setShowCloseModal(false)
        toast.success("Сбор КП завершен")
        router.refresh()
      }
    } catch (err: any) {
      const msg = err.message || "Ошибка при закрытии заявки"
      setError(msg)
      toast.error(msg)
    } finally {
      setIsClosing(false)
    }
  }

  const handleDelete = () => {
    setIsDeleting(true)
    setError(null)
    startTransition(async () => {
      try {
        const res = await deleteRequest(requestId)
        if (res.error) {
          setError(res.error)
          toast.error(res.error)
          setIsDeleting(false)
        } else {
          setShowDeleteModal(false)
          toast.success("Запрос успешно удален")
          router.push("/requests")
          router.refresh()
        }
      } catch (err: any) {
        const msg = err.message || "Ошибка при удалении заявки"
        setError(msg)
        toast.error(msg)
        setIsDeleting(false)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Owner Badge & Action Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-white text-sm">Это ваш B2B-запрос на закупку</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                Заказчик
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Вы получаете и сравниваете коммерческие предложения от поставщиков в реальном времени
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Close Request Button */}
          {effectiveStatus === "OPEN" && !closeSuccess && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isClosing}
              onClick={() => setShowCloseModal(true)}
              className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#090A0F] hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Закрыть сбор КП</span>
            </Button>
          )}

          {/* Delete Request Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={() => setShowDeleteModal(true)}
            className="rounded-xl border-red-500/30 bg-white dark:bg-[#090A0F] hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-500/50 text-red-600 dark:text-red-400 text-xs gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить запрос</span>
          </Button>
        </div>
      </div>

      {/* Custom Modal: Confirm Close */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11131A] border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Завершить сбор коммерческих предложений?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Поставщики больше не смогут отправлять новые КП. Текущие предложения останутся доступны для сравнения.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloseModal(false)}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              >
                Отмена
              </Button>
              <Button
                size="sm"
                disabled={isClosing}
                onClick={handleClose}
                className="rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold gap-1.5"
              >
                {isClosing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Закрыть сбор</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal: Confirm Delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#11131A] border border-red-500/30 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 dark:text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Удалить этот коммерческий запрос?</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Это действие необратимо. Запрос будет удален из биржи RFQ со всеми полученными котировками и расчетами.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isDeleting || isPending}
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#090A0F] text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              >
                Отмена
              </Button>
              <Button
                size="sm"
                disabled={isDeleting || isPending}
                onClick={handleDelete}
                className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold gap-1.5"
              >
                {isDeleting || isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Да, удалить запрос</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* AI Comparison Engine (Primary Owner View) */}
      <div className="space-y-4">
        {offers.length === 0 ? (
          <div className="text-center py-16 px-6 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-[#11131A] space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Ожидаем предложения от поставщиков</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Ваш запрос опубликован на бирже BazaarOS. Поставщики рассчитывают себестоимость и логистику.
              </p>
            </div>
          </div>
        ) : (
          <AiComparisonEngine
            offers={offers}
            isOwner={true}
            currentUserId={currentUserId}
            requestTitle={requestTitle}
            requestQuantity={requestQuantity}
            requestUnit={requestUnit}
          />
        )}
      </div>
    </div>
  )
}
