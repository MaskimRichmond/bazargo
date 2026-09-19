"use client"

import { usePathname } from "next/navigation"

export function ChatShell({ 
  sidebar, 
  children 
}: { 
  sidebar: React.ReactNode
  children: React.ReactNode 
}) {
  const pathname = usePathname()
  const isChatRoom = pathname !== "/messages"

  return (
    <div className="flex h-[calc(100vh-130px)] md:h-[calc(100vh-150px)] max-w-6xl mx-auto md:border md:rounded-2xl overflow-hidden md:mt-6 bg-background shadow-sm">
      <div className={`w-full md:w-80 md:border-r flex flex-col bg-muted/10 ${isChatRoom ? 'hidden md:flex' : 'flex'}`}>
        {sidebar}
      </div>
      <div className={`flex-1 flex-col bg-background ${isChatRoom ? 'flex' : 'hidden md:flex items-center justify-center'}`}>
        {children}
      </div>
    </div>
  )
}
