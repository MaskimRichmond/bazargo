import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PackageSearch, Clock, MapPin, Tag } from "lucide-react"

export const metadata = {
  title: "Нужен товар? | BazarGo"
}

export default async function RequestsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient()

  let query = supabase
    .from("requests")
    .select("*, categories(name), profiles(full_name)")
    .eq("status", "OPEN")
    // Filter out expired ones using PostgREST directly or just let it read
    .gte("expires_at", new Date().toISOString())

  if (searchParams.category) {
    query = query.eq("category_id", searchParams.category)
  }
  if (searchParams.q) {
    // Simple ilike for now
    query = query.ilike("title", `%${searchParams.q}%`)
  }

  // Basic sorting
  const sort = searchParams.sort || "newest"
  if (sort === "newest") {
    query = query.order("created_at", { ascending: false })
  } else if (sort === "budget_desc") {
    query = query.order("budget_max", { ascending: false })
  }

  const { data: requests } = await query

  const conditionMap: Record<string, string> = {
    "ANY": "Любое",
    "NEW": "Новое",
    "USED_LIKE_NEW": "Как новое",
    "USED_GOOD": "Хорошее (Б/у)"
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="bg-primary/5 rounded-3xl p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-primary/10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Нужен товар?</h1>
          <p className="text-muted-foreground text-lg max-w-lg">
            Не нашли подходящий вариант? Создайте запрос — продавцы смогут предложить свои товары.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-xl font-semibold h-12 px-8 shrink-0">
          <Link href="/requests/create">Создать запрос</Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0 space-y-6 hidden md:block">
          <div>
            <h3 className="font-semibold mb-3">Фильтры</h3>
            <p className="text-sm text-muted-foreground mb-4">Выберите категорию или используйте поиск.</p>
            <Button asChild variant="outline" className="w-full justify-start rounded-xl">
              <Link href="/requests">Сбросить фильтры</Link>
            </Button>
          </div>
        </aside>
        
        <div className="flex-1 space-y-4">
          {!requests || requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
                <PackageSearch className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Пока нет открытых запросов</h2>
              <p className="text-muted-foreground mb-8 max-w-sm">
                Станьте первым, кто опубликует запрос, и получите лучшие предложения.
              </p>
              <Button asChild size="lg" className="rounded-xl font-semibold">
                <Link href="/requests/create">Создать запрос</Link>
              </Button>
            </div>
          ) : (
            requests.map((req: any) => (
              <div key={req.id} className="bg-background border rounded-2xl p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase tracking-wider">
                        {req.categories?.name}
                      </span>
                      {req.condition && req.condition !== "ANY" && (
                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-md">
                          {conditionMap[req.condition]}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold line-clamp-2">
                      <Link href={`/requests/${req.id}`} className="hover:text-primary transition-colors">
                        {req.title}
                      </Link>
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {req.city}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                    {req.budget_max ? (
                      <div className="text-lg font-bold text-green-600 dark:text-green-500">
                        до {req.budget_max.toLocaleString("ru-RU")} 
                        <span className="text-sm ml-1">сом</span>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-muted-foreground">Бюджет не указан</div>
                    )}
                    <Button asChild className="rounded-xl w-full md:w-auto">
                      <Link href={`/requests/${req.id}`}>Подробнее</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
