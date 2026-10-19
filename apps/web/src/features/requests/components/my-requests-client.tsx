"use client"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PackageSearch, Clock, MapPin, XCircle, CheckCircle2 } from "lucide-react"
import { closeRequest, cancelRequest } from "@/app/actions/requests"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useTranslations } from "next-intl";

export function MyRequestsClient({ requests }: { requests: any[] }) {
    const t = useTranslations();
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  const openRequests = requests.filter(r => r.effectiveStatus === "OPEN")
  const closedRequests = requests.filter(r => r.effectiveStatus === "CLOSED" || r.effectiveStatus === "EXPIRED")
  const cancelledRequests = requests.filter(r => r.effectiveStatus === "CANCELLED")

  const handleClose = async () => {
    if (!closeConfirmId) return
    setIsUpdating(closeConfirmId)
    await closeRequest(closeConfirmId)
    setIsUpdating(null)
    setCloseConfirmId(null)
  }

  const handleCancel = async () => {
    if (!cancelConfirmId) return
    setIsUpdating(cancelConfirmId)
    await cancelRequest(cancelConfirmId)
    setIsUpdating(null)
    setCancelConfirmId(null)
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
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{t("byudzhet")}{req.budget_max ? `до ${req.budget_max}` : "Не указан"}</span>
                  <span>•</span>
                  <span>{new Date(req.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                <Button asChild variant="outline" className="rounded-xl w-full sm:w-auto text-xs h-9">
                  <Link href={`/requests/${req.id}`}>{t("smotret")}</Link>
                </Button>
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
    </>
  );
}
