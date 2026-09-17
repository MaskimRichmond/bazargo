"use client"
import { useState, useRef, useEffect } from "react"
import { Search, ChevronDown, ChevronRight, X } from "lucide-react"

type Category = { id: string; name: string; slug: string; parent_id?: string | null }

interface CategoryPickerProps {
  categories: Category[]
  value: string
  onChange: (val: string) => void
}

export function CategoryPicker({ categories, value, onChange }: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedCategory = categories.find(c => c.slug === value)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Get children mapping
  const roots = categories.filter(c => !c.parent_id)
  const getChildren = (id: string) => categories.filter(c => c.parent_id === id)

  // Filtered view logic
  const filtered = search 
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : []

  const renderList = () => (
    <div className="flex flex-col h-full md:h-auto md:max-h-[300px]">
      <div className="p-3 border-b md:sticky md:top-0 md:bg-background/95 md:backdrop-blur-sm z-10 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Поиск категории..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-muted/50 border-none rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        <button
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
            !value ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
          }`}
          onClick={() => { onChange(""); setIsOpen(false) }}
        >
          Все категории
        </button>

        {search ? (
          // Flat list for search results
          filtered.map(c => (
            <button
              key={c.id}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                value === c.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
              }`}
              onClick={() => { onChange(c.slug); setIsOpen(false) }}
            >
              {c.name}
            </button>
          ))
        ) : (
          // Hierarchical list
          roots.map(root => {
            const children = getChildren(root.id)
            const isActive = value === root.slug
            return (
              <div key={root.id}>
                <button
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                  }`}
                  onClick={() => { onChange(root.slug); setIsOpen(false) }}
                >
                  <span className="font-semibold">{root.name}</span>
                </button>
                {children.length > 0 && (
                  <div className="pl-4 border-l ml-3 mt-1 space-y-1 border-border/50">
                    {children.map(child => (
                      <button
                        key={child.id}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                          value === child.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => { onChange(child.slug); setIsOpen(false) }}
                      >
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}

        {search && filtered.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          className="w-full h-10 px-3 py-2 border rounded-md text-sm bg-background flex items-center justify-between hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="truncate">{selectedCategory ? selectedCategory.name : "Все категории"}</span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Desktop Dropdown */}
        {isOpen && (
          <div className="hidden md:block absolute top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {renderList()}
          </div>
        )}
      </div>

      {/* Mobile Fullscreen Panel */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-background flex flex-col animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between p-4 border-b shrink-0">
            <h2 className="font-semibold text-lg">Выберите категорию</h2>
            <button 
              className="p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {renderList()}
        </div>
      )}
    </>
  )
}
