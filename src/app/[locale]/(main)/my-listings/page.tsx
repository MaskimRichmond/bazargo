import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { MyListingsClient } from "@/features/my-listings/components/my-listings-client"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export const metadata = {
  title: "Мои объявления | BazarGo",
}

export default async function MyListingsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
    const t = await getTranslations();
  const searchParams = await props.searchParams;
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/my-listings")
  }

  const page = parseInt(searchParams.page || "1", 10)
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from("listings")
    .select(`
      *,
      listing_images(url, order_index)
    `, { count: "exact" })
    .eq("seller_id", session.user.id)
    .order("created_at", { ascending: false })

  const status = searchParams.status || "all"
  if (status !== "all") {
    query = query.eq("status", status.toUpperCase())
  }

  query = query.range(from, to)

  const { data: listings, count, error } = await query

  if (error) {
    console.error("Failed to fetch my listings:", error)
  }
  
  const totalPages = count ? Math.ceil(count / limit) : 1

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("moi_obyavleniya")}</h1>
        <a href="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block">
          {t("vernutsya_v_profil")}</a>
      </div>
      <MyListingsClient listings={listings || []} status={status} page={page} totalPages={totalPages} totalCount={count || 0} />
    </div>
  );
}
