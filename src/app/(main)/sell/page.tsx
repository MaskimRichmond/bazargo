import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SellFlow } from "@/features/sell/components/sell-flow"

export const metadata = {
  title: "Разместить объявление | BazarGo",
}

export default async function SellPage(props: { searchParams: Promise<{ edit?: string }> }) {
  const searchParams = await props.searchParams;
  const editId = searchParams.edit;

  const supabase = await createClient()

  if (!supabase) {
    return (
      <div className="container mx-auto p-8 text-center mt-20">
        <h1 className="text-2xl font-bold mb-4">Ошибка конфигурации</h1>
        <p className="text-muted-foreground">Не заданы ключи Supabase. Публикация недоступна.</p>
      </div>
    )
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/sell")
  }

  // Fetch categories
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, parent_id")
    .order("name")

  if (error) {
    console.error("Failed to load categories:", error.message)
    return (
      <div className="container mx-auto p-8 text-center mt-20 space-y-4">
        <h1 className="text-2xl font-bold">Не удалось загрузить данные</h1>
        <p className="text-muted-foreground">Произошла техническая ошибка при загрузке категорий.</p>
        <p className="text-sm text-destructive">{error.message}</p>
        <a href="/sell" className="text-primary hover:underline font-medium inline-block mt-2">Попробуйте ещё раз</a>
      </div>
    )
  }

  // Fetch user store
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("owner_id", session.user.id)
    .eq("status", "APPROVED")
    .maybeSingle()

  if (!categories || categories.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto p-8 text-center mt-20 space-y-6">
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 inline-block">
          <h2 className="text-xl font-bold mb-2">Отсутствуют категории товаров</h2>
          <p className="text-sm font-medium mb-4">
            Похоже, миграция базы данных не была применена. Без категорий размещение объявлений невозможно.
          </p>
          <div className="text-left text-sm bg-background p-4 rounded-md border text-foreground overflow-auto">
            <p className="font-semibold mb-2">Как исправить:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Убедитесь, что база данных запущена.</li>
              <li>Проверьте, что актуальные Supabase migrations применены (выполните команду <code>npx supabase db push</code>).</li>
              <li>Обновите эту страницу.</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  let initialData = null;
  if (editId) {
    const { data: listing } = await supabase
      .from("listings")
      .select("*")
      .eq("id", editId)
      .eq("seller_id", session.user.id)
      .single()

    if (listing) {
      initialData = {
        id: listing.id,
        type: listing.listing_type,
        title: listing.title,
        categoryId: listing.category_id,
        price: listing.price,
        condition: listing.condition,
        description: listing.description,
        quantity: listing.quantity,
        city: listing.city,
        deliveryMethods: listing.delivery_methods,
        showPhone: listing.show_phone,
        images: [] // images are not loaded as File objects
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SellFlow categories={categories} initialData={initialData} />
    </div>
  )
}
