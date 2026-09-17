"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackText?: string
  containerClassName?: string
}

export function ImageWithFallback({ 
  src, 
  alt, 
  className, 
  containerClassName, 
  fallbackText,
  ...props 
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // If no src provided or error occurred, show fallback
  if (!src || error) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-muted text-muted-foreground w-full h-full", containerClassName, className)}>
        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
        {fallbackText && <span className="text-xs font-medium text-center px-2">{fallbackText}</span>}
      </div>
    )
  }

  return (
    <div className={cn("relative overflow-hidden w-full h-full", containerClassName)}>
      {/* Loading Skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt || "Image"}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        ref={(el) => {
          if (el && el.complete) {
            setLoaded(true)
          }
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        {...props}
      />
    </div>
  )
}
