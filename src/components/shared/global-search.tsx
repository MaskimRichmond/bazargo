"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GlobalSearchProps {
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  button?: boolean;
}

const RECENT_SEARCHES_KEY = "bazargo_recent_searches"

function GlobalSearchInner({ className, inputClassName, placeholder = "Поиск по миллионам товаров...", button = false }: GlobalSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQ = searchParams.get("q") || ""
  
  const [q, setQ] = useState(initialQ)
  const [isFocused, setIsFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const containerRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    setQ(searchParams.get("q") || "")
  }, [searchParams])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (e) {}
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const filtered = recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())
    const newSearches = [trimmed, ...filtered].slice(0, 5)
    setRecentSearches(newSearches)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches))
  }

  const removeRecentSearch = (query: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSearches = recentSearches.filter(s => s !== query)
    setRecentSearches(newSearches)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches))
  }

  const clearHistory = (e: React.MouseEvent) => {
    e.stopPropagation()
    setRecentSearches([])
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  }

  const executeSearch = (searchQuery: string) => {
    setIsFocused(false)
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery)
      const params = new URLSearchParams(searchParams.toString())
      params.set("q", searchQuery.trim())
      params.delete("page") // Reset page on new search
      router.push(`/catalog?${params.toString()}`)
    } else {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("q")
      params.delete("page")
      router.push(`/catalog?${params.toString()}`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeSearch(q)
  }

  const handleClear = () => {
    setQ("")
    executeSearch("")
  }

  return (
    <form ref={containerRef} onSubmit={handleSubmit} className={cn("relative flex w-full gap-2", className)}>
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder={placeholder} 
          className={cn("w-full pl-9 pr-9 h-10 transition-colors", inputClassName)} 
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setIsFocused(true)}
          aria-label="Поиск товаров"
        />
        {q && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
            aria-label="Очистить поиск"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Dropdown for Recent Searches */}
        {isFocused && recentSearches.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b text-xs text-muted-foreground font-medium">
              <span>Недавние запросы</span>
              <button 
                type="button" 
                onClick={clearHistory}
                className="hover:text-foreground transition-colors px-1"
              >
                Очистить
              </button>
            </div>
            <ul className="py-1">
              {recentSearches.map((search, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      setQ(search)
                      executeSearch(search)
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{search}</span>
                    </span>
                    <span 
                      role="button"
                      onClick={(e) => removeRecentSearch(search, e)}
                      className="p-1 text-muted-foreground/50 hover:text-foreground shrink-0"
                      aria-label="Удалить из истории"
                    >
                      <X className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {button && (
        <Button type="submit" className="h-12 px-8 text-base font-medium rounded-xl shrink-0">
          Найти
        </Button>
      )}
    </form>
  )
}

export function GlobalSearch(props: GlobalSearchProps) {
  return (
    <Suspense fallback={
      <div className={cn("relative flex w-full gap-2", props.className)}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder={props.placeholder || "Поиск..."} className={cn("w-full pl-9 h-10", props.inputClassName)} readOnly />
        </div>
      </div>
    }>
      <GlobalSearchInner {...props} />
    </Suspense>
  )
}
