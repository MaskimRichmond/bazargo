import { TRENDING_STORES } from "@/lib/mock-data"
import { StoreCard } from "@/components/shared/store-card"

export function TrendingStores() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8">Магазины в тренде</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {TRENDING_STORES.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      </div>
    </section>
  )
}
