export type Category = { id: string; name: string; slug: string; parent_id?: string | null; icon_name?: string }

export function buildCategoryTree(categories: Category[], parentId: string | null = null): (Category & { children: any[] })[] {
  return categories
    .filter(c => c.parent_id === parentId)
    .map(c => ({
      ...c,
      children: buildCategoryTree(categories, c.id)
    }))
}

export function getAllDescendantIds(categories: Category[], targetId: string): string[] {
  const children = categories.filter(c => c.parent_id === targetId).map(c => c.id)
  let allIds = [...children]
  for (const childId of children) {
    allIds = [...allIds, ...getAllDescendantIds(categories, childId)]
  }
  return Array.from(new Set(allIds))
}

export function getCategoryBreadcrumbs(categories: Category[], targetSlug: string): Category[] {
  const target = categories.find(c => c.slug === targetSlug)
  if (!target) return []
  
  const path: Category[] = [target]
  let current = target
  while (current.parent_id) {
    const parent = categories.find(c => c.id === current.parent_id)
    if (!parent) break
    path.unshift(parent)
    current = parent
  }
  return path
}
