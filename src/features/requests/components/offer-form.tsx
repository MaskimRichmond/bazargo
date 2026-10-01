"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { offerListing } from "@/app/actions/requests"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useTranslations } from "next-intl";

export function OfferForm({ requestId, sellerListings }: { requestId: string, sellerListings: any[] }) {
    const t = useTranslations();
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [listingId, setListingId] = useState("")
  const [message, setMessage] = useState("")

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listingId) {
      setError("Выберите товар для предложения")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await offerListing(requestId, listingId, message || "Здравствуйте, предлагаю вам этот товар.")
      if (result.error) {
        setError(result.error)
        setIsLoading(false)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  if (sellerListings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">{t("u_vas_net_aktivnyh")}</p>
        <Button asChild className="rounded-xl">
          <Link href="/sell">{t("razmestit_tovar")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label>{t("vyberite_tovar")}</Label>
        <Select value={listingId} onValueChange={setListingId}>
          <SelectTrigger className="h-12 bg-background border-primary/20">
            <SelectValue placeholder={t("vashi_aktivnye_obyavleniya")} />
          </SelectTrigger>
          <SelectContent>
            {sellerListings.map(l => (
              <SelectItem key={l.id} value={l.id}>
                {l.title} — {l.price.toLocaleString("ru-RU")} {t("som")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t("soobschenie_optsionalno")}</Label>
        <Textarea 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          className="bg-background border-primary/20 min-h-[80px]" 
          placeholder={t("napishite_korotkoe_soobschenie_pokupatelyu")} 
        />
      </div>

      <Button type="submit" className="w-full h-12 rounded-xl text-lg font-semibold" disabled={isLoading}>
        {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
        {t("otpravit_predlozhenie")}</Button>
    </form>
  );
}
