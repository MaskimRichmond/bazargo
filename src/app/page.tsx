import { Hero } from "@/components/home/hero"
import { QuickActions } from "@/components/home/quick-actions"
import { Categories } from "@/components/home/categories"
import { PopularProducts } from "@/components/home/popular-products"
import { RequestBanner } from "@/components/home/request-banner"
import { TrendingStores } from "@/components/home/trending-stores"
import { PromoSection } from "@/components/home/promo-section"
import { TrustSection } from "@/components/home/trust-section"

export default function Home() {
  return (
    <main>
      <Hero />
      <QuickActions />
      <Categories />
      <PopularProducts />
      <RequestBanner />
      <TrendingStores />
      <PromoSection />
      <TrustSection />
    </main>
  )
}
