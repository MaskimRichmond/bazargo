import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Users as UsersIcon, Search } from "lucide-react"
import { UserActions } from "@/features/admin/components/user-actions"
import { Input } from "@/components/ui/input"

export const metadata = {
  title: "Управление пользователями | BazarGo Admin",
}

export default async function AdminUsersPage(
  props: {
    searchParams?: Promise<{ q?: string }>
  }
) {
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""

  const authRes = await verifyAdminAccess('USERS_BAN')
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">Нет доступа к данному разделу.</div>

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (query) {
    dbQuery = dbQuery.ilike('full_name', `%${query}%`)
  }

  const { data: users, error } = await dbQuery

  if (error) {
    return <div className="text-destructive p-4">Ошибка загрузки пользователей: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-blue-500" />
          Пользователи
        </h1>
        
        <form className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            name="q" 
            defaultValue={query} 
            placeholder="Поиск по имени..." 
            className="pl-8"
          />
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">Имя</th>
                <th className="px-4 py-3">Роль</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дата регистрации</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Пользователи не найдены
                  </td>
                </tr>
              )}
              {users?.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {user.full_name || "Без имени"}
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{user.id.split('-')[0]}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned ? (
                      <span className="text-red-500 font-medium text-xs">Заблокирован</span>
                    ) : (
                      <span className="text-green-500 font-medium text-xs">Активен</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserActions user={user} />
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
