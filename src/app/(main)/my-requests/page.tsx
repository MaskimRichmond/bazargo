import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PackageSearch, Clock, Edit2 } from "lucide-react"
import { MyRequestsClient } from "@/features/requests/components/my-requests-client"

export const metadata = {
  title: "Мои запросы | BazarGo"
}

export default async function MyRequestsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/my-requests")
  }

  // Fetch requests
  const { data: requests } = await supabase
    .from("requests")
    .select(`
      *,
      categories(name)
    `)
    .eq("buyer_id", session.user.id)
    .order("created_at", { ascending: false })

  // To get offer counts, we can run a separate query
  let offerCounts: Record<string, number> = {}
  if (requests && requests.length > 0) {
    const requestIds = requests.map((r: any) => r.id)
    const { data: offers } = await supabase
      .from("request_offers")
      .select("request_id")
      .in("request_id", requestIds)
    
    if (offers) {
      offers.forEach((o: any) => {
        offerCounts[o.request_id] = (offerCounts[o.request_id] || 0) + 1
      })
    }
  }

  const mappedRequests = requests?.map((r: any) => {
    const isExpired = new Date(r.expires_at) < new Date()
    return {
      ...r,
      effectiveStatus: (isExpired && r.status === "OPEN") ? "EXPIRED" : r.status,
      offersCount: offerCounts[r.id] || 0
    }
  }) || []

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Мои запросы</h1>
        <Button asChild className="rounded-xl">
          <Link href="/requests/create">Создать запрос</Link>
        </Button>
      </div>

      {!mappedRequests || mappedRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <PackageSearch className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Вы ещё не создавали запросы</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Не нашли то, что искали? Создайте запрос и получайте предложения от продавцов.
          </p>
          <Button asChild size="lg" className="rounded-xl font-semibold">
            <Link href="/requests/create">Создать запрос</Link>
          </Button>
        </div>
      ) : (
        <MyRequestsClient requests={mappedRequests} />
      )}
    </div>
  )
}
