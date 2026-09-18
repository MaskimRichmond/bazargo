"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GlobalSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  button?: boolean;
}

export function GlobalSearch({ className, inputClassName, placeholder = "Поиск по миллионам товаров...", button = false }: GlobalSearchProps) {
  const [q, setQ] = useState("")
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(q.trim())}`)
    } else {
      router.push(`/catalog`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("relative flex w-full gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder={placeholder} 
          className={cn("w-full pl-9 h-10 transition-colors", inputClassName)} 
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {button && (
        <Button type="submit" className="h-12 px-8 text-base font-medium rounded-xl shrink-0">
          Найти
        </Button>
      )}
    </form>
  )
}
