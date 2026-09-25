import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { verifyAdminAccess, moderateListingAction } from "@/features/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

export default async function AdminListingsPage() {
  const isAuthorized = await verifyAdminAccess()
  if (!isAuthorized) redirect("/")

  const supabase = await createClient()
  
  const { data: listings } = await supabase
    .from("listings")
    .select(`id, title, price, status, created_at, profiles(full_name)`)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Управление объявлениями</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID / Название</TableHead>
                <TableHead>Продавец</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Цена</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings?.map((listing: any) => (
                <TableRow key={listing.id}>
                  <TableCell>
                    <div className="font-medium">{listing.title}</div>
                    <div className="text-xs text-muted-foreground">{listing.id}</div>
                  </TableCell>
                  <TableCell>{listing.profiles?.full_name}</TableCell>
                  <TableCell>
                    <Badge variant={listing.status === 'BLOCKED' ? 'destructive' : 'outline'}>{listing.status}</Badge>
                  </TableCell>
                  <TableCell>{listing.price} сом</TableCell>
                  <TableCell>
                    <div className="flex gap-2 items-center">
                      <Link href={`/product/${listing.id}`} target="_blank" className="text-muted-foreground hover:text-primary">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {listing.status !== 'BLOCKED' ? (
                        <form action={async () => {
                          "use server"
                          await moderateListingAction(listing.id, 'BLOCKED', 'Нарушение правил Платформы')
                        }}>
                          <Button size="sm" variant="destructive">Блокировать</Button>
                        </form>
                      ) : (
                        <form action={async () => {
                          "use server"
                          await moderateListingAction(listing.id, 'ACTIVE', 'Восстановлено модератором')
                        }}>
                          <Button size="sm" variant="outline">Восстановить</Button>
                        </form>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
