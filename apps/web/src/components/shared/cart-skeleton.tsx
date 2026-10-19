"use client"


export function CartSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
      <div className="lg:col-span-2 space-y-6">
        {[1, 2].map((group) => (
          <div key={group} className="space-y-4">
            {/* Seller Header */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
              <div className="h-5 bg-muted rounded w-1/3 animate-pulse" />
            </div>
            
            {/* Items */}
            {[1, 2].map((item) => (
              <div key={item} className="flex gap-4 p-4 border rounded-2xl bg-card">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-muted animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between gap-4">
                    <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-5 bg-muted rounded w-1/4 animate-pulse shrink-0" />
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="h-9 bg-muted rounded-full w-24 animate-pulse" />
                    <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Summary Sidebar */}
      <div>
        <div className="bg-muted/10 border p-6 rounded-2xl">
          <div className="h-6 bg-muted rounded w-1/2 animate-pulse mb-6" />
          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
            </div>
          </div>
          <div className="border-t pt-4 mb-6 flex justify-between">
            <div className="h-6 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-6 bg-muted rounded w-1/3 animate-pulse" />
          </div>
          <div className="h-12 bg-muted rounded-xl w-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}
