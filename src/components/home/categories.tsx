import Link from "next/link"
import * as Icons from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export async function Categories() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, icon_name")
    .order("name")

  if (!categories || categories.length === 0) return null

  // Ensure popular categories show first or sort them, but let's just use what we get
  // Or we can manually reorder based on some priority if needed.
  // For MVP, just map through them.
  
  return (
    <section className="py-8 md:py-12 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-foreground tracking-tight">Популярные категории</h2>
        
        {/* Mobile: Horizontal scroll, Desktop: Grid */}
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 lg:grid-cols-8 gap-3 md:gap-4 snap-x snap-mandatory scrollbar-none md:overflow-visible no-scrollbar">
          {categories.map((category: any) => {
            const IconName = category.icon_name || "HelpCircle"
            const Icon = (Icons as any)[IconName] || Icons.HelpCircle

            return (
              <Link 
                key={category.id} 
                href={`/catalog?category=${category.slug}`}
                className="snap-start shrink-0 w-[100px] md:w-auto flex flex-col items-center justify-start p-3 md:p-4 rounded-2xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-md transition-all group outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="bg-muted group-hover:bg-primary/10 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center mb-3 transition-colors">
                  <Icon className="w-6 h-6 text-foreground group-hover:text-primary transition-colors stroke-[1.5]" />
                </div>
                <span className="text-[11px] md:text-sm text-center font-medium line-clamp-2 leading-tight">
                  {category.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
