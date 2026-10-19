"use client"
import { useState, useTransition } from "react"
import { useRouter } from "@/i18n/routing"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PackageSearch, Clock, MapPin, XCircle, CheckCircle2, Trash2, Loader2 } from "lucide-react"
import { closeRequest, cancelRequest, deleteRequest } from "@/app/actions/requests"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

export function MyRequestsClient({ requests }: { requests: any[] }) {
  const t = useTranslations()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const openRequests = requests.filter(r => r.effectiveStatus === "OPEN")
  const closedRequests = requests.filter(r => r.effectiveStatus === "CLOSED" || r.effectiveStatus === "EXPIRED")
  const cancelledRequests = requests.filter(r => r.effectiveStatus === "CANCELLED")

  const handleClose = async () => {
    if (!closeConfirmId) return
    const id = closeConfirmId
    setIsUpdating(id)
    startTransition(async () => {
      try {
        const res = await closeRequest(id)
        if (res?.error) {
          toast.error(res.error)
        } else {
          toast.success("Запрос завершен")
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Ошибка при закрытии запроса")
      } finally {
        setIsUpdating(null)
        setCloseConfirmId(null)
      }
    })
  }

  const handleCancel = async () => {
    if (!cancelConfirmId) return
    const id = cancelConfirmId
    setIsUpdating(id)
    startTransition(async () => {
      try {
        const res = await cancelRequest(id)
        if (res?.error) {
          toast.error(res.error)
        } else {
          toast.success("Запрос отменен")
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Ошибка при отмене запроса")
      } finally {
        setIsUpdating(null)
        setCancelConfirmId(null)
      }
    })
  }

  const handleDelete = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setIsUpdating(id)

    startTransition(async () => {
      try {
        const res = await deleteRequest(id)
        if (res?.error) {
          toast.error(res.error)
          setIsUpdating(null)
        } else {
          setDeleteConfirmId(null)
          setIsUpdating(null)
          toast.success("Запрос успешно удален")
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Ошибка при удалении запроса")
        setIsUpdating(null)
      }
    })
  }

  const renderList = (list: any[]) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-12 px-4 border rounded-3xl bg-muted/10">
          <p className="text-muted-foreground">{t("v_etoy_kategorii_pusto")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {list.map(req => (
          <div key={req.id} className="bg-background border rounded-2xl p-5 relative">
            {isUpdating === req.id && (
              <div className="absolute inset-0 bg-background/50 rounded-2xl flex items-center justify-center z-10 backdrop-blur-[1px]">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase tracking-wider">
                    {req.categories?.name}
                  </span>
                  {req.offersCount > 0 && (
                    <span className="text-xs font-semibold bg-blue-500/10 text-blue-600 px-2 py-1 rounded-md">
                      {req.offersCount} {t("predlozheniy")}</span>
                  )}
                </div>
                <h3 className="text-lg font-bold line-clamp-1 mb-1">
                  <Link href={`/requests/${req.id}`} className="hover:text-primary transition-colors">
                    {req.title}
                  </Link>
                </h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
                  <span>
                    Бюджет:{" "}
                    <strong className="text-emerald-500 font-semibold">
                      {req.total_budget
                        ? `${req.total_budget.toLocaleString("ru-RU")} сом`
                        : req.max_price
                        ? `до ${req.max_price} сом/${req.unit || "шт"}`
                        : req.budget_max
                        ? `до ${req.budget_max} сом`
                        : "По предложению"}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>{new Date(req.created_at).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button asChild variant="outline" className="rounded-xl flex-1 sm:flex-none text-xs h-9">
                    <Link href={`/requests/${req.id}`}>{t("smotret")}</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setDeleteConfirmId(req.id)}
                    className="rounded-xl h-9 w-9 text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-950/30 hover:border-red-500/40 shrink-0"
                    title="Удалить запрос"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {req.effectiveStatus === "OPEN" && (
                  <div className="flex gap-2 w-full">
                    <Button 
                      variant="outline" 
                      onClick={() => setCloseConfirmId(req.id)}
                      className="rounded-xl text-xs h-9 w-full sm:w-auto"
                    >
                      {t("zakryt")}</Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setCancelConfirmId(req.id)}
                      className="rounded-xl text-xs h-9 w-full sm:w-auto text-destructive hover:text-destructive border-destructive/20"
                    >
                      {t("otmenit")}</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="open" className="w-full">
        <TabsList className="w-full justify-start h-12 bg-transparent border-b rounded-none mb-6 overflow-x-auto">
          <TabsTrigger value="open" className="text-base h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            {t("otkrytye")}{openRequests.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-base h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            {t("zavershyonnye")}{closedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="text-base h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">
            {t("otmenyonnye")}{cancelledRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="open" className="mt-0 outline-none">{renderList(openRequests)}</TabsContent>
        <TabsContent value="closed" className="mt-0 outline-none">{renderList(closedRequests)}</TabsContent>
        <TabsContent value="cancelled" className="mt-0 outline-none">{renderList(cancelledRequests)}</TabsContent>
      </Tabs>

      {/* Confirm Close */}
      <AlertDialog open={!!closeConfirmId} onOpenChange={(v) => !v && setCloseConfirmId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("zavershit_zapros")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("vy_nashli_podhodyaschiy_tovar")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("otmena")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose} className="rounded-xl bg-primary">{t("zavershit")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Cancel */}
      <AlertDialog open={!!cancelConfirmId} onOpenChange={(v) => !v && setCancelConfirmId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("otmenit_zapros")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("zapros_budet_otmenyon_i")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("nazad")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="rounded-xl bg-destructive hover:bg-destructive/90">{t("otmenit_zapros_1")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(v) => !v && setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-3xl border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>Удалить запрос?</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Запрос будет безвозвратно удален из биржи RFQ со всеми предложениями.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("otmena")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={Boolean(isUpdating) || isPending}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white font-semibold gap-1.5"
            >
              {isUpdating || isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Удаление...</span>
                </>
              ) : (
                <span>Удалить навсегда</span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
