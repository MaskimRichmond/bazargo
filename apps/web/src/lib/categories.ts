export type Category = {
  id: string
  name: string
  slug: string
  parent_id?: string | null
  icon_name?: string
}

export const BAZAAR_B2B_CATEGORIES = [
  { id: "packaging", slug: "packaging", tag: "packaging", name: "Упаковка, коробки и тара", label: "Упаковка, коробки и тара" },
  { id: "cups", slug: "cups", tag: "cups", name: "Стаканы, крышки и посуда", label: "Стаканы, крышки и посуда" },
  { id: "syrups", slug: "syrups", tag: "syrups", name: "Кофе, чай, сиропы и бар", label: "Кофе, чай, сиропы и бар" },
  { id: "food", slug: "food", tag: "food", name: "Продукты и сырье HoReCa", label: "Продукты и сырье HoReCa" },
  { id: "cleaning", slug: "cleaning", tag: "cleaning", name: "Хозтовары и бытовая химия", label: "Хозтовары и бытовая химия" },
  { id: "textiles", slug: "textiles", tag: "textiles", name: "Текстиль, форма и расходники", label: "Текстиль, форма и расходники" },
  { id: "printing", slug: "printing", tag: "printing", name: "Полиграфия и брендирование", label: "Полиграфия и брендирование" },
  { id: "equipment", slug: "equipment", tag: "equipment", name: "Торговое и пищевое оборудование", label: "Торговое и пищевое оборудование" },
] as const

export function buildCategoryTree(categories: Category[], parentId: string | null = null, visited = new Set<string>()): (Category & { children: any[] })[] {
  if (parentId && visited.has(parentId)) return []
  if (parentId) visited.add(parentId)

  return categories
    .filter(c => c.parent_id === parentId)
    .map(c => ({
      ...c,
      children: buildCategoryTree(categories, c.id, new Set(visited))
    }))
}

export function getAllDescendantIds(categories: Category[], targetId: string, visited = new Set<string>()): string[] {
  if (visited.has(targetId)) return []
  visited.add(targetId)

  const children = categories.filter(c => c.parent_id === targetId).map(c => c.id)
  let allIds = [...children]
  for (const childId of children) {
    allIds = [...allIds, ...getAllDescendantIds(categories, childId, visited)]
  }
  return Array.from(new Set(allIds))
}

export function getCategoryBreadcrumbs(categories: Category[], targetSlug: string): Category[] {
  const target = categories.find(c => c.slug === targetSlug)
  if (!target) return []
  
  const path: Category[] = [target]
  let current = target
  const visited = new Set<string>([target.id])

  while (current.parent_id) {
    if (visited.has(current.parent_id)) break
    const parent = categories.find(c => c.id === current.parent_id)
    if (!parent) break
    visited.add(parent.id)
    path.unshift(parent)
    current = parent
  }
  return path
}
