import { createClient } from "@/lib/supabase/server"
import { ShieldCheck, Users, AlertTriangle, Package } from "lucide-react"

export default async function AdminDashboard() {
  const supabase = await createClient()

  // For a real dashboard, we would run these concurrently with Promise.all
  // and use exact counts without pulling data.
  const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })
  const { count: listingsCount } = await supabase.from("listings").select("*", { count: "exact", head: true })
  const { count: reportsCount } = await supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "OPEN")
  const { count: storesCount } = await supabase.from("stores").select("*", { count: "exact", head: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of BazarGo platform metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{usersCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 text-green-500 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Listings</p>
              <p className="text-2xl font-bold">{listingsCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
              <p className="text-2xl font-bold">{reportsCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stores</p>
              <p className="text-2xl font-bold">{storesCount || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
