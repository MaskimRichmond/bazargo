"use client"

import { Card, CardContent } from "@/components/ui/card"

export function ProductSkeleton() {
  return (
    <Card className="overflow-hidden flex flex-col h-full border-border/50 rounded-2xl">
      <div className="relative aspect-square sm:aspect-[4/3] bg-muted animate-pulse" />
      <CardContent className="p-3 sm:p-4 flex flex-col flex-1 gap-3">
        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        <div className="h-6 bg-muted animate-pulse rounded w-1/3 mt-2" />
        
        <div className="mt-auto space-y-2.5 pt-2">
          <div className="flex gap-2">
            <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
            <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
          </div>
          <div className="pt-2.5 border-t border-border/50 flex justify-between">
            <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
