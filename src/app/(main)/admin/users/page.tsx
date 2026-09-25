import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const resolvedParams = await searchParams
  const page = parseInt(resolvedParams.page || "1", 10) || 1
  const limit = 20
  const offset = (page - 1) * limit

  const supabase = await createClient()
  
  const { data: users, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage platform users, roles, and bans.</p>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Joined</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users?.map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-medium">
                    {u.full_name} <br/>
                    <span className="text-xs text-muted-foreground font-normal">{u.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    {u.is_banned ? (
                      <span className="px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs font-medium">BANNED</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-medium">ACTIVE</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* Admin Actions will go here (Client Component required for interactivity) */}
                    <Button variant="outline" size="sm">Manage</Button>
                  </td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Basic Pagination Placeholder */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" disabled={page <= 1}>Previous</Button>
        <Button variant="outline" disabled={!count || page * limit >= count}>Next</Button>
      </div>
    </div>
  )
}
