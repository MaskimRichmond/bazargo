"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, X, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl";

interface ProductImageGalleryProps {
  images: { url: string; order_index?: number }[]
  title: string
  status?: string
  favoriteButton?: React.ReactNode
}

export function ProductImageGallery({ images, title, status, favoriteButton }: ProductImageGalleryProps) {
    const t = useTranslations();
  const [activeIndex, setActiveIndex] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  // Sort images just in case
  const sortedImages = [...images].sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  const hasImages = sortedImages.length > 0
  const showStatusOverlay = status && status !== "ACTIVE"

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (activeIndex < sortedImages.length - 1) {
      setActiveIndex(prev => prev + 1)
      scrollToIndex(activeIndex + 1)
    }
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1)
      scrollToIndex(activeIndex - 1)
    }
  }

  const scrollToIndex = (index: number) => {
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth
      scrollRef.current.scrollTo({ left: width * index, behavior: "smooth" })
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Only update activeIndex if not currently animating a click scroll
    // But since it's hard to track, we just sync the active index based on scroll position
    const scrollLeft = e.currentTarget.scrollLeft
    const width = e.currentTarget.clientWidth
    if (width > 0) {
      const newIndex = Math.round(scrollLeft / width)
      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex)
      }
    }
  }

  const openFullscreen = () => {
    if (hasImages) {
      setIsFullscreen(true)
      document.body.style.overflow = "hidden"
    }
  }

  const closeFullscreen = useCallback(() => {
    setIsFullscreen(false)
    document.body.style.overflow = ""
  }, [])

  // Keyboard navigation for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return
      if (e.key === "Escape") closeFullscreen()
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isFullscreen, activeIndex, closeFullscreen])

  const renderStatusBadge = () => {
    if (!showStatusOverlay) return null
    let label = "Неактивно"
    if (status === "SOLD") label = "Продано"
    if (status === "OUT_OF_STOCK") label = "Нет в наличии"
    if (status === "ARCHIVED") label = "В архиве"
    if (status === "DEACTIVATED") label = "Снято с публикации"
    if (status === "BLOCKED") label = "Заблокировано"

    return (
      <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
        <span className="bg-background/95 text-foreground px-6 py-2.5 rounded-xl font-bold text-lg shadow-lg border uppercase tracking-wider">
          {label}
        </span>
      </div>
    )
  }

  const handleImageError = (index: number) => {
    setImgErrors(prev => ({ ...prev, [index]: true }))
  }

  if (!hasImages) {
    return (
      <div className="aspect-[4/3] sm:aspect-square md:aspect-[4/3] bg-muted rounded-2xl flex flex-col items-center justify-center relative overflow-hidden border">
        {favoriteButton && <div className="absolute top-4 right-4 z-20">{favoriteButton}</div>}
        {renderStatusBadge()}
        <ImageIcon className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground font-medium">{t("net_foto")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full relative">
      {/* Main Image Container */}
      <div 
        className="aspect-[4/3] sm:aspect-square md:aspect-[4/3] bg-muted rounded-2xl overflow-hidden relative group cursor-zoom-in border focus-within:ring-2 focus-within:ring-primary outline-none"
        onClick={openFullscreen}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFullscreen() } }}
        aria-label={t("prosmotr_izobrazheniy")}
      >
        {renderStatusBadge()}
        
        {favoriteButton && (
          <div className="absolute top-4 right-4 z-20" onClick={e => e.stopPropagation()}>
            {favoriteButton}
          </div>
        )}

        {/* Mobile Swipe Container / Desktop Main Image */}
        <div 
          ref={scrollRef}
          className="flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar md:hidden"
          onScroll={handleScroll}
        >
          {sortedImages.map((img, idx) => (
            <div key={idx} className="w-full h-full shrink-0 snap-center relative flex items-center justify-center">
              {imgErrors[idx] ? (
                <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
              ) : (
                <Image 
                  src={img.url} 
                  alt={`${title} - Фото ${idx + 1}`} 
                  fill 
                  className={cn("object-cover", showStatusOverlay && "grayscale-[0.4]")}
                  priority={idx === 0}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onError={() => handleImageError(idx)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Desktop Main Image (Hidden on Mobile) */}
        <div className="hidden md:flex w-full h-full relative items-center justify-center">
          {imgErrors[activeIndex] ? (
            <ImageIcon className="w-16 h-16 text-muted-foreground/30" />
          ) : (
            <Image 
              src={sortedImages[activeIndex].url} 
              alt={`${title} - Фото ${activeIndex + 1}`} 
              fill 
              className={cn("object-cover transition-opacity duration-300", showStatusOverlay && "grayscale-[0.4]")}
              priority
              sizes="50vw"
              onError={() => handleImageError(activeIndex)}
            />
          )}
        </div>

        {/* Navigation Arrows (Desktop overlay) */}
        {sortedImages.length > 1 && (
          <>
            <button 
              onClick={handlePrev}
              disabled={activeIndex === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background/95 text-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 z-20 shadow-sm hidden md:flex"
              aria-label={t("predyduschee_foto")}
            >
              <ChevronLeft className="w-6 h-6 -ml-0.5" />
            </button>
            <button 
              onClick={handleNext}
              disabled={activeIndex === sortedImages.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-background/80 hover:bg-background/95 text-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 z-20 shadow-sm hidden md:flex"
              aria-label={t("sleduyuschee_foto")}
            >
              <ChevronRight className="w-6 h-6 -mr-0.5" />
            </button>
          </>
        )}

        {/* Mobile Pagination Indicator */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-background/60 backdrop-blur-md px-3 py-1.5 rounded-full md:hidden">
            {sortedImages.map((_, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300", 
                  idx === activeIndex ? "bg-foreground w-3" : "bg-foreground/40"
                )} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop Thumbnails */}
      {sortedImages.length > 1 && (
        <div className="hidden md:flex gap-2 overflow-x-auto pb-2 snap-x px-1 -mx-1">
          {sortedImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "w-20 h-20 rounded-xl overflow-hidden shrink-0 snap-start relative border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                idx === activeIndex ? "border-primary shadow-sm" : "border-transparent opacity-70 hover:opacity-100 bg-muted"
              )}
              aria-label={`Переключить на фото ${idx + 1}`}
              aria-pressed={idx === activeIndex}
            >
              {imgErrors[idx] ? (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                </div>
              ) : (
                <Image 
                  src={img.url} 
                  alt="" 
                  fill 
                  className={cn("object-cover", showStatusOverlay && "grayscale-[0.4]")}
                  sizes="80px"
                  onError={() => handleImageError(idx)}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Viewer */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center flex-col animate-in fade-in duration-200">
          
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent text-white">
            <span className="font-medium text-sm drop-shadow-md">
              {activeIndex + 1} / {sortedImages.length}
            </span>
            <button 
              onClick={closeFullscreen}
              className="p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white"
              aria-label={t("zakryt")}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="relative w-full max-w-6xl h-full max-h-[85vh] flex items-center justify-center p-4">
            {imgErrors[activeIndex] ? (
              <ImageIcon className="w-32 h-32 text-white/20" />
            ) : (
              <div className="relative w-full h-full">
                <Image 
                  src={sortedImages[activeIndex].url} 
                  alt={`${title} - Фото ${activeIndex + 1} крупно`} 
                  fill 
                  className="object-contain"
                  sizes="100vw"
                  quality={90}
                />
              </div>
            )}
            
            {sortedImages.length > 1 && (
              <>
                <button 
                  onClick={handlePrev}
                  disabled={activeIndex === 0}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors disabled:opacity-0 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label={t("predyduschee_foto")}
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button 
                  onClick={handleNext}
                  disabled={activeIndex === sortedImages.length - 1}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors disabled:opacity-0 focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label={t("sleduyuschee_foto")}
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails */}
          {sortedImages.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 p-4 flex justify-center gap-2 overflow-x-auto no-scrollbar">
              {sortedImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={cn(
                    "w-16 h-16 rounded-lg overflow-hidden shrink-0 relative border-2 transition-all bg-muted/20",
                    idx === activeIndex ? "border-white scale-110 shadow-lg" : "border-transparent opacity-50 hover:opacity-100"
                  )}
                  aria-label={`Переключить на фото ${idx + 1}`}
                >
                  {!imgErrors[idx] && (
                    <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
                  )}
                </button>
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
