"use client"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CatalogSort({ sort }: { sort: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSortChange = (val: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()))
    current.set("sort", val)
    router.push(`${pathname}?${current.toString()}`)
  }

  return (
    <div className="hidden md:block">
      <Select value={sort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px] bg-background border rounded-xl">
          <SelectValue placeholder="Сортировка" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Сначала новые</SelectItem>
          <SelectItem value="oldest">Сначала старые</SelectItem>
          <SelectItem value="cheapest">Сначала дешевле</SelectItem>
          <SelectItem value="expensive">Сначала дороже</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
