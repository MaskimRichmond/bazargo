"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { POPULAR_PRODUCTS } from "@/lib/mock-data"
import { ProductCard } from "@/components/shared/product-card"
import { Button } from "@/components/ui/button"

const TABS = ["Все", "Смартфоны", "Ноутбуки", "Авто", "Одежда", "Для дома"]

export function PopularProducts() {
  const [activeTab, setActiveTab] = React.useState("Все")

  const filteredProducts = React.useMemo(() => {
    if (activeTab === "Все") return POPULAR_PRODUCTS;
    return POPULAR_PRODUCTS.filter(p => p.category === activeTab);
  }, [activeTab]);

  return (
    <section className="py-12 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-bold">Популярные товары</h2>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {TABS.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab)}
                className="rounded-full shrink-0 h-8"
              >
                {tab}
              </Button>
            ))}
          </div>

          <Link href="/catalog" className="hidden lg:flex items-center text-sm font-medium text-primary hover:underline">
            Смотреть все <ArrowRight className="ml-1 w-4 h-4" />
          </Link>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-background rounded-3xl border border-dashed">
            <p className="text-muted-foreground font-medium mb-4">В этой категории пока нет популярных товаров</p>
            <Button variant="outline" onClick={() => setActiveTab("Все")} className="rounded-full">
              Показать все
            </Button>
          </div>
        )}
        
        <div className="mt-8 flex justify-center lg:hidden">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/catalog">Показать еще</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
