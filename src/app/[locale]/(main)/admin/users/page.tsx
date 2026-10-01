import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Users as UsersIcon, Search } from "lucide-react"
import { UserActions } from "@/features/admin/components/user-actions"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type UserRow = { id: string, full_name: string | null, role: string, is_banned: boolean, created_at: string };

export const metadata = {
  title: "Управление пользователями | BazarGo Admin",
}

export default async function AdminUsersPage(
  props: {
    searchParams?: Promise<{ q?: string, page?: string, role?: string, status?: string }>
  }
) {
  const t = await getTranslations();
  const searchParams = await props.searchParams
  const query = searchParams?.q || ""
  const currentPage = Math.max(1, parseInt(searchParams?.page || "1", 10))
  const roleFilter = searchParams?.role || ""
  const statusFilter = searchParams?.status || ""
  const pageSize = 20

  const authRes = await verifyAdminAccess('USERS_BAN')
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu_1")}</div>;

  const adminClient = createAdminClient()

  let dbQuery = adminClient
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((currentPage - 1) * pageSize, currentPage * pageSize - 1)

  if (query) {
    dbQuery = dbQuery.or(`full_name.ilike.%${query}%,id.eq.${query.length === 36 ? query : '00000000-0000-0000-0000-000000000000'}`)
  }
  if (roleFilter) {
    dbQuery = dbQuery.eq('role', roleFilter)
  }
  if (statusFilter === 'banned') {
    dbQuery = dbQuery.eq('is_banned', true)
  } else if (statusFilter === 'active') {
    dbQuery = dbQuery.eq('is_banned', false)
  }

  const { data, error, count } = await dbQuery;
  const users = data as unknown as UserRow[]
  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  if (error) {
    return <div className="text-destructive p-4">{t("oshibka_zagruzki_polzovateley")}{error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UsersIcon className="w-6 h-6 text-blue-500" />
          {t("polzovateli")}
        </h1>
        
        <form className="flex gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              name="q" 
              defaultValue={query} 
              placeholder={t("poisk_po_imeni")} 
              className="pl-8"
            />
          </div>
          <select name="role" defaultValue={roleFilter} className="border rounded-md px-3 text-sm">
            <option value="">Все роли</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <select name="status" defaultValue={statusFilter} className="border rounded-md px-3 text-sm">
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="banned">Заблокированные</option>
          </select>
          <Button type="submit" variant="secondary">{t("primenit")}</Button>
        </form>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">{t("imya")}</th>
                <th className="px-4 py-3">{t("rol")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("data_registratsii")}</th>
                <th className="px-4 py-3 text-right">{t("deystviya")}</th>
              </tr>
            </thead>
            <tbody>
              {users?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    {t("polzovateli_ne_naydeny")}</td>
                </tr>
              )}
              {users?.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/users/${user.id}`} className="hover:underline text-primary">
                      {user.full_name || "Без имени"}
                    </Link>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5">{user.id.split('-')[0]}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned ? (
                      <span className="text-red-500 font-medium text-xs">{t("zablokirovan")}</span>
                    ) : (
                      <span className="text-green-500 font-medium text-xs">{t("aktiven")}</span>
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          {currentPage > 1 && (
            <Link href={`?q=${query}&role=${roleFilter}&status=${statusFilter}&page=${currentPage - 1}`}>
              <Button variant="outline" size="sm">{t("nazad") || "Назад"}</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {t("stranitsa")} {currentPage} {t("iz")} {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link href={`?q=${query}&role=${roleFilter}&status=${statusFilter}&page=${currentPage + 1}`}>
              <Button variant="outline" size="sm">{t("vpered") || "Вперед"}</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
