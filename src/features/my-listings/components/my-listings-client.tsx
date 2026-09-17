"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { updateListingStatus } from "@/app/actions/listings"
import { MoreVertical, Archive, Power, PowerOff, Edit2, CheckCircle2, Plus } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import Link from "next/link"

export function MyListingsClient({ listings }: { listings: any[] }) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const activeListings = listings.filter(l => l.status === "ACTIVE" || l.status === "OUT_OF_STOCK")
  const deactivatedListings = listings.filter(l => l.status === "DEACTIVATED")
  const soldListings = listings.filter(l => l.status === "SOLD")
  const archivedListings = listings.filter(l => l.status === "ARCHIVED")

  const handleStatusChange = async (id: string, status: string) => {
    setIsUpdating(id)
    await updateListingStatus(id, status)
    setIsUpdating(null)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    setIsDeleting(deleteConfirmId)
    await updateListingStatus(deleteConfirmId, "ARCHIVED")
    setIsDeleting(null)
    setDeleteConfirmId(null)
  }

  const ListingCard = ({ listing }: { listing: any }) => {
    const images = listing.listing_images?.sort((a: any, b: any) => a.order_index - b.order_index) || []
    const mainImage = images.length > 0 ? images[0].url : "/placeholder.png"

    return (
      <div className={`flex gap-3 sm:gap-4 p-3 sm:p-4 border rounded-2xl bg-card transition-opacity ${isUpdating === listing.id ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Mobile: 96x96 image, Desktop: 128x128 */}
        <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden bg-muted">
          <img src={mainImage} className="w-full h-full object-cover" alt="" />
        </div>
        
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm sm:text-lg line-clamp-2">{listing.title}</h3>
              {/* Action Menu for Mobile (and Desktop if preferred, but let's keep it clean) */}
              {listing.status !== "ARCHIVED" && listing.status !== "SOLD" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href={`/sell?edit=${listing.id}`}>
                        <Edit2 className="w-4 h-4 mr-2" /> Редактировать
                      </Link>
                    </DropdownMenuItem>
                    {listing.status === "ACTIVE" || listing.status === "OUT_OF_STOCK" ? (
                      <DropdownMenuItem onClick={() => handleStatusChange(listing.id, "DEACTIVATED")}>
                        <PowerOff className="w-4 h-4 mr-2" /> Деактивировать
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => handleStatusChange(listing.id, "ACTIVE")}>
                        <Power className="w-4 h-4 mr-2" /> Активировать
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleStatusChange(listing.id, "SOLD")}>
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Отметить проданным
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirmId(listing.id)}>
                      <Archive className="w-4 h-4 mr-2" /> Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="font-bold whitespace-nowrap text-sm sm:text-lg text-primary">{listing.price.toLocaleString("ru-RU")} сом</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
              {new Date(listing.created_at).toLocaleDateString()} • {listing.city}
            </p>
            {listing.listing_type === "INVENTORY" && (
              <p className="text-xs text-muted-foreground mt-0.5">В наличии: {listing.quantity} шт.</p>
            )}
          </div>

          <div className="flex items-center mt-3">
            {listing.status === "SOLD" && (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-green-600 bg-green-500/10 px-2 py-1 sm:px-2.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" /> Продано
              </span>
            )}
            {listing.status === "ARCHIVED" && (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground bg-muted px-2 py-1 sm:px-2.5 rounded-full">
                <Archive className="w-3 h-3 sm:w-4 sm:h-4" /> В архиве
              </span>
            )}
            {listing.status === "OUT_OF_STOCK" && (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-orange-600 bg-orange-500/10 px-2 py-1 sm:px-2.5 rounded-full">
                Нет в наличии
              </span>
            )}
            {listing.status === "ACTIVE" && (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary bg-primary/10 px-2 py-1 sm:px-2.5 rounded-full">
                Активно
              </span>
            )}
            {listing.status === "DEACTIVATED" && (
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground bg-muted px-2 py-1 sm:px-2.5 rounded-full">
                Деактивировано
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  const EmptyState = ({ title, showCTA = true }: { title: string, showCTA?: boolean }) => (
    <div className="flex flex-col items-center justify-center text-center py-16 border rounded-2xl bg-muted/20 px-4">
      <p className="text-muted-foreground font-medium mb-4">{title}</p>
      {showCTA && (
        <Button asChild>
          <Link href="/sell">
            <Plus className="w-4 h-4 mr-2" />
            Разместить товар
          </Link>
        </Button>
      )}
    </div>
  )

  return (
    <>
      <Tabs defaultValue="all" className="w-full">
        {/* Mobile-friendly tabs wrapper */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar mb-6">
          <TabsList className="inline-flex w-max min-w-full justify-start rounded-none border-b bg-transparent h-auto p-0 gap-6">
            <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm sm:text-base">
              Все <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{listings.length}</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm sm:text-base">
              Активные <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{activeListings.length}</span>
            </TabsTrigger>
            <TabsTrigger value="sold" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm sm:text-base">
              Проданные <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{soldListings.length}</span>
            </TabsTrigger>
            <TabsTrigger value="deactivated" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm sm:text-base">
              Деактивированные <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{deactivatedListings.length}</span>
            </TabsTrigger>
            <TabsTrigger value="archived" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 text-sm sm:text-base">
              Архив <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">{archivedListings.length}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-4 outline-none">
          {listings.length === 0 ? <EmptyState title="У вас пока нет объявлений." /> : listings.map(l => <ListingCard key={l.id} listing={l} />)}
        </TabsContent>
        <TabsContent value="active" className="space-y-4 outline-none">
          {activeListings.length === 0 ? <EmptyState title="У вас пока нет активных объявлений." /> : activeListings.map(l => <ListingCard key={l.id} listing={l} />)}
        </TabsContent>
        <TabsContent value="sold" className="space-y-4 outline-none">
          {soldListings.length === 0 ? <EmptyState title="Проданных товаров пока нет." showCTA={false} /> : soldListings.map(l => <ListingCard key={l.id} listing={l} />)}
        </TabsContent>
        <TabsContent value="deactivated" className="space-y-4 outline-none">
          {deactivatedListings.length === 0 ? <EmptyState title="У вас нет деактивированных объявлений." showCTA={false} /> : deactivatedListings.map(l => <ListingCard key={l.id} listing={l} />)}
        </TabsContent>
        <TabsContent value="archived" className="space-y-4 outline-none">
          {archivedListings.length === 0 ? <EmptyState title="Архив пуст." showCTA={false} /> : archivedListings.map(l => <ListingCard key={l.id} listing={l} />)}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить объявление?</AlertDialogTitle>
            <AlertDialogDescription>
              Оно перестанет отображаться покупателям, но сохранится в вашем архиве.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-2">
            <AlertDialogCancel className="mt-0 w-full sm:w-auto">Отмена</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto" 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={!!isDeleting}
            >
              {isDeleting ? "Удаление..." : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
