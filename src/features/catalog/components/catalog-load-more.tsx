"use client"

import { useState } from "react"
import { fetchNextCatalogPage } from "@/app/[locale]/(main)/catalog/actions"
import { ProductCard } from "@/components/shared/product-card"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

interface CatalogLoadMoreProps {
  initialPage: number;
  searchParams: any;
  totalCount: number;
  categories: any[];
}

export function CatalogLoadMore({ initialPage, searchParams, totalCount, categories }: CatalogLoadMoreProps) {
  const t = useTranslations()
  const [page, setPage] = useState(initialPage)
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const to = page * 20 - 1
  const hasMore = totalCount > to + 1
  
  const handleLoadMore = async () => {
    setLoading(true)
    try {
      const nextListings = await fetchNextCatalogPage(searchParams, categories, page + 1)
      setListings(prev => [...prev, ...nextListings])
      setPage(p => p + 1)
    } catch (error) {
      console.error("Failed to load more:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!hasMore && listings.length === 0) return null
  
  return (
    <>
      {listings.length > 0 && (
         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
           {listings.map((l: any) => <ProductCard key={l.id} product={l} />)}
         </div>
      )}

      {hasMore && (
         <div className="mt-8 text-center">
            <Button onClick={handleLoadMore} disabled={loading} variant="outline" className="min-w-[200px]">
              {loading ? t("zagruzka_1") : t("zagruzit_eschyo")}
            </Button>
         </div>
      )}
    </>
  );
}
