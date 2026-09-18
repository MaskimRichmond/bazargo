import Link from "next/link"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { PackageSearch, Clock, MapPin, User } from "lucide-react"
import { RequestsFiltersWidget } from "@/features/requests/components/requests-filters-widget"
import { RequestsSortWidget } from "@/features/requests/components/requests-sort-widget"

export const metadata = {
  title: "Запросы | BazarGo"
}

async function RequestsList({ searchParams, categories }: { searchParams: { [key: string]: string | undefined }, categories: { id: string, name: string, slug: string, parent_id?: string | null }[] }) {
  const supabase = await createClient()

  let query = supabase
    .from("requests")
    .select("*, categories(id, name, slug), profiles(full_name)", { count: "exact" })
    
  // Status Filter
  const status = searchParams.status || "OPEN"
  if (status === "OPEN") {
    query = query.eq("status", "OPEN").gte("expires_at", new Date().toISOString())
  } else if (status === "ALL") {
    // Show all, no status filter
  }

  // Category Filter
  if (searchParams.category) {
    const targetCat = categories.find(c => c.slug === searchParams.category)
    if (targetCat) {
      // Find children of this category
      const children = categories.filter(c => c.parent_id === targetCat.id)
      const targetIds = [targetCat.id, ...children.map(c => c.id)]
      query = query.in("category_id", targetIds)
    } else {
      query = query.eq("categories.slug", searchParams.category)
    }
  }

  // Region Filter
  if (searchParams.region && searchParams.region !== "all") {
    query = query.eq("region", searchParams.region)
  }

  // Search Query
  if (searchParams.q) {
    const q = searchParams.q.replace(/,/g, ' ')
    // Search in title OR description
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
  }

  // Budget Filters
  if (searchParams.budgetMin) {
    query = query.gte("budget_max", parseFloat(searchParams.budgetMin))
  }
  if (searchParams.budgetMax) {
    query = query.lte("budget_max", parseFloat(searchParams.budgetMax))
  }

  // Sorting
  const sort = searchParams.sort || "newest"
  if (sort === "newest") query = query.order("created_at", { ascending: false })
  else if (sort === "oldest") query = query.order("created_at", { ascending: true })
  else if (sort === "budget_desc") query = query.order("budget_max", { ascending: false, nullsFirst: false })
  else if (sort === "budget_asc") query = query.order("budget_max", { ascending: true, nullsFirst: false })

  // Pagination
  const page = parseInt(searchParams.page || "1")
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data: requests, error, count } = await query

  if (error) {
    return (
      <div className="p-8 text-center text-destructive bg-destructive/10 rounded-xl">
        Не удалось загрузить запросы. <br/>
        <span className="text-xs">{error.message}</span>
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4 mt-8">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <PackageSearch className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">По вашему запросу ничего не найдено</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">
          Пока никто не ищет такой товар. Попробуйте изменить фильтры или создать запрос.
        </p>
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <Link href="/requests/create">Создать запрос</Link>
        </Button>
      </div>
    )
  }

  const conditionMap: Record<string, string> = {
    "ANY": "Любое",
    "NEW": "Новое",
    "USED_LIKE_NEW": "Как новое",
    "USED_GOOD": "Хорошее (Б/у)"
  }

  let breadcrumbs: string[] = []
  if (searchParams.category) {
    const targetCat = categories.find(c => c.slug === searchParams.category)
    if (targetCat) {
      if (targetCat.parent_id) {
        const parentCat = categories.find(c => c.id === targetCat.parent_id)
        if (parentCat) breadcrumbs.push(parentCat.name)
      }
      breadcrumbs.push(targetCat.name)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            Запросы {breadcrumbs.length > 0 && <span className="text-foreground">/ {breadcrumbs.join(" / ")}</span>}
          </p>
          <p className="text-sm font-medium">Найдено {count} запросов</p>
        </div>
        <RequestsSortWidget sort={sort} />
      </div>

      <div className="space-y-4">
        {requests.map((req: {
          id: string,
          title: string,
          description: string | null,
          city: string,
          created_at: string,
          status: string,
          condition: string | null,
          budget_max: number | null,
          categories: { name: string } | null,
          profiles: { full_name: string } | null
        }) => (
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
                  {req.status !== 'OPEN' && (
                    <span className="text-xs font-semibold bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase tracking-wider">
                      {req.status === 'CLOSED' ? 'Завершён' : req.status === 'CANCELLED' ? 'Отменён' : req.status}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold line-clamp-2">
                  <Link href={`/requests/${req.id}`} className="hover:text-primary transition-colors">
                    {req.title}
                  </Link>
                </h3>
                {req.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {req.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {req.city}</span>
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {new Date(req.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><User className="w-4 h-4"/> {req.profiles?.full_name}</span>
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
                  <Link href={`/requests/${req.id}`}>Предложить товар</Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(count && count > to + 1) ? (
        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <a href={`/requests?${new URLSearchParams({...searchParams, page: String(page + 1)}).toString()}`}>
              Загрузить ещё
            </a>
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default async function RequestsPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient()
  const { data: categories } = await supabase.from("categories").select("id, name, slug, parent_id").order("name")

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="bg-primary/5 rounded-3xl p-8 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-primary/10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Запросы</h1>
          <p className="text-muted-foreground text-lg max-w-lg">
            Найдите людей, которым нужен ваш товар. Выберите подходящий запрос и предложите свой товар.
          </p>
        </div>
        <Button asChild size="lg" className="rounded-xl font-semibold h-12 px-8 shrink-0">
          <Link href="/requests/create">Создать запрос</Link>
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <Suspense fallback={<div className="w-64 shrink-0 hidden md:block" />}>
          <RequestsFiltersWidget categories={categories || []} />
        </Suspense>
        
        <div className="flex-1 min-w-0">
          <Suspense fallback={
            <div className="space-y-4 mt-8">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          }>
            <RequestsList searchParams={searchParams} categories={categories || []} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
