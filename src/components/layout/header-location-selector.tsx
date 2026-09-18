"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { MapPin } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { REGIONS } from "@/lib/regions"

export function HeaderLocationSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [selectedLocation, setSelectedLocation] = useState<string>("Все регионы")

  useEffect(() => {
    // Priority: URL query param > Cookie > LocalStorage
    const urlRegion = searchParams.get("region")
    
    // Read cookie directly on client
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`
      const parts = value.split(`; ${name}=`)
      if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || "")
      return null
    }

    const cookieRegion = getCookie("bazargo_region")
    const storageRegion = localStorage.getItem("user_location")

    let activeRegion = "Все регионы"
    
    if (urlRegion) {
      activeRegion = urlRegion === "all" ? "Все регионы" : urlRegion
    } else if (cookieRegion) {
      activeRegion = cookieRegion === "all" ? "Все регионы" : cookieRegion
    } else if (storageRegion) {
      activeRegion = storageRegion === "all" ? "Все регионы" : storageRegion
    }

    if (activeRegion !== "Все регионы" && !REGIONS.includes(activeRegion as any)) {
      activeRegion = "Все регионы"
    }

    setSelectedLocation(activeRegion)
    
    // Sync state back to storage if it was from URL
    if (urlRegion) {
      document.cookie = `bazargo_region=${encodeURIComponent(urlRegion)}; path=/; max-age=31536000`
      localStorage.setItem("user_location", urlRegion)
    }
  }, [searchParams])

  const handleSelect = (region: string) => {
    const value = region === "Все регионы" ? "all" : region
    
    setSelectedLocation(region)
    document.cookie = `bazargo_region=${encodeURIComponent(value)}; path=/; max-age=31536000`
    localStorage.setItem("user_location", value)
    
    if (pathname === "/catalog" || pathname === "/requests") {
      const current = new URLSearchParams(Array.from(searchParams.entries()))
      if (value === "all") {
        current.delete("region")
      } else {
        current.set("region", value)
      }
      current.delete("page")
      router.push(`${pathname}?${current.toString()}`)
    } else {
      router.refresh()
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
        <DropdownMenuItem 
          onClick={() => handleSelect("Все регионы")}
          className={selectedLocation === "Все регионы" ? "bg-primary/10 text-primary font-medium" : ""}
        >
          Все регионы
        </DropdownMenuItem>
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
