import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAdminAccess } from "@/features/admin/actions"
import { FolderTree, Plus, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server"
import Link from "next/link"

export const metadata = {
  title: "Категории | BazarGo Admin",
}

export default async function AdminCategoriesPage() {
  const t = await getTranslations();
  const authRes = await verifyAdminAccess()
  if (!authRes.authorized) return <div className="text-destructive font-medium p-4">{t("net_dostupa_k_dannomu_1")}</div>;

  const adminClient = createAdminClient()

  // Fetch all categories to build the tree
  const { data: categories, error } = await adminClient
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return <div className="text-destructive p-4">Ошибка загрузки категорий: {error.message}</div>;
  }

  // Build tree
  const roots = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const CategoryNode = ({ category, depth = 0 }: { category: any, depth?: number }) => {
    const children = getChildren(category.id);
    return (
      <>
        <tr className="border-b last:border-0 hover:bg-muted/30">
          <td className="px-4 py-3">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
              {depth > 0 && <span className="text-muted-foreground mr-2">↳</span>}
              <span className="font-medium">{category.name}</span>
            </div>
          </td>
          <td className="px-4 py-3 font-mono text-muted-foreground">{category.slug}</td>
          <td className="px-4 py-3 text-muted-foreground">{category.icon_name || "—"}</td>
          <td className="px-4 py-3 text-right space-x-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Редактирование в разработке">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled title="Удаление в разработке">
              <Trash2 className="w-4 h-4" />
            </Button>
          </td>
        </tr>
        {children.map(child => <CategoryNode key={child.id} category={child} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderTree className="w-6 h-6 text-purple-500" />
          Категории
        </h1>
        <Button disabled title="Добавление в разработке">
          <Plus className="w-4 h-4 mr-2" /> Добавить категорию
        </Button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Иконка</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {roots.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Категории не найдены</td>
                </tr>
              )}
              {roots.map((cat) => (
                <CategoryNode key={cat.id} category={cat} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
