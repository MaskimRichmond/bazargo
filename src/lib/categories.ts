export type Category = { id: string; name: string; slug: string; parent_id?: string | null; icon_name?: string }

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
