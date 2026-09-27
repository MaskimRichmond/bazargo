import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, AlertTriangle, Store, ShoppingCart, Activity } from "lucide-react"

export const metadata = {
  title: "Admin Dashboard | BazarGo",
}

export default async function AdminDashboardPage() {
  const authRes = await verifyAdminAccess()
  if (!authRes.authorized) return null

  const adminClient = createAdminClient()

  // We can run these counts concurrently
  const [
    { count: usersCount },
    { count: listingsCount },
    { count: reportsCount },
    { count: storesCount },
    { count: ordersCount },
  ] = await Promise.all([
    adminClient.from('profiles').select('*', { count: 'exact', head: true }),
    adminClient.from('listings').select('*', { count: 'exact', head: true }),
    adminClient.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    adminClient.from('stores').select('*', { count: 'exact', head: true }),
    adminClient.from('orders').select('*', { count: 'exact', head: true })
  ])

  const stats = [
    { label: "Total Users", value: usersCount || 0, icon: Users, color: "text-blue-500" },
    { label: "Active Listings", value: listingsCount || 0, icon: Package, color: "text-green-500" },
    { label: "Pending Reports", value: reportsCount || 0, icon: AlertTriangle, color: "text-orange-500" },
    { label: "Total Stores", value: storesCount || 0, icon: Store, color: "text-pink-500" },
    { label: "Total Orders", value: ordersCount || 0, icon: ShoppingCart, color: "text-purple-500" }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          Dashboard Overview
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {s.label}
                </CardTitle>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{s.value.toLocaleString('ru-RU')}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
