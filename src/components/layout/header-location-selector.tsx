"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { MapPin } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const REGIONS = [
  "Бишкек",
  "Баткенская область",
  "Джалал-Абадская область",
  "Иссык-Кульская область",
  "Нарынская область",
  "Ошская область",
  "Таласская область",
  "Чуйская область"
]

export function HeaderLocationSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Try to get from URL first (if in catalog/requests), else fallback to localStorage
  const urlCity = searchParams.get("city")
  const [selectedLocation, setSelectedLocation] = useState<string>("Бишкек")

  useEffect(() => {
    // If URL has a city, sync it to local state & storage
    if (urlCity) {
      setSelectedLocation(urlCity)
      localStorage.setItem("user_location", urlCity)
    } else {
      // If URL doesn't have it, try to load from storage
      const stored = localStorage.getItem("user_location")
      if (stored && REGIONS.includes(stored)) {
        setSelectedLocation(stored)
      }
    }
  }, [urlCity])

  const handleSelect = (region: string) => {
    setSelectedLocation(region)
    localStorage.setItem("user_location", region)
    
    // If we are currently on a page that supports city filtering (catalog or requests), apply it
    if (pathname === "/catalog" || pathname === "/requests") {
      const current = new URLSearchParams(Array.from(searchParams.entries()))
      current.set("city", region)
      current.delete("page")
      router.push(`${pathname}?${current.toString()}`)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="font-medium">{selectedLocation}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {REGIONS.map(region => (
          <DropdownMenuItem 
            key={region} 
            onClick={() => handleSelect(region)}
            className={selectedLocation === region ? "bg-primary/10 text-primary font-medium" : ""}
          >
            {region}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
