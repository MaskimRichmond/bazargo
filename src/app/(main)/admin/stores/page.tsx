import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Store, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

type StoreRow = { id: string, name: string, status: string, created_at: string, owner: { full_name: string | null } | null };

export const metadata = {
  title: "Магазины | BazarGo Admin",
}

export default async function AdminStoresPage(
  props: {
    searchParams?: Promise<{ q?: string }>
  }
) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const authRes = await verifyAdminAccess()
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">Нет доступа к данному разделу.</div>

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('stores')
    .select(`
      id,
      name,
      status,
      created_at,
      owner:profiles!owner_id ( id, full_name )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (query) {
    dbQuery = dbQuery.ilike('name', `%${query}%`)
  }

  const { data, error } = await dbQuery;
  const stores = data as unknown as StoreRow[]

  if (error) {
    return <div className="text-destructive p-4">Ошибка загрузки магазинов: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Store className="w-6 h-6 text-pink-500" />
          Магазины (Только чтение)
        </h1>
        
        <form className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            name="q" 
            defaultValue={query} 
            placeholder="Поиск по названию..." 
            className="pl-8"
          />
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Владелец</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дата создания</th>
              </tr>
            </thead>
            <tbody>
              {stores?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Магазины не найдены
                  </td>
                </tr>
              )}
              {stores?.map((store: StoreRow) => (
                <tr key={store.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {store.name}
                    <div className="text-[10px] text-muted-foreground font-mono mt-1">{store.id.split('-')[0]}...</div>
                  </td>
                  <td className="px-4 py-3 truncate max-w-[150px]">
                    {store.owner?.full_name || "Неизвестен"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-medium uppercase ${
                      store.status === 'ACTIVE' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      store.status === 'BLOCKED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {store.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(store.created_at).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
