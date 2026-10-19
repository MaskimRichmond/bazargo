import { StoreCard } from "@/components/shared/store-card"
import { createClient } from "@/lib/supabase/server"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function TrendingStores() {
    const t = await getTranslations();
  const supabase = await createClient()
  
  const { data: stores } = await supabase
    .from("stores")
    .select("*, categories(name)")
    .eq("status", "APPROVED")
    .order("created_at", { ascending: false })
    .limit(4)

  if (!stores || stores.length === 0) return null

  // Format to match StoreCard expectations (some mapping might be needed)
  const formattedStores = stores.map((store: any) => ({
    id: store.id,
    name: store.name,
    category: store.categories?.name || "Магазин",
    rating: 0,
    reviews: 0,
    avatar: store.logo_url || null,
    isVerified: store.is_verified,
    slug: store.slug
  }))

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8">{t("magaziny_v_trende")}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {formattedStores.map((store: any) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </div>
    </section>
  );
}
