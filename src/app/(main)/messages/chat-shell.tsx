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
    <div className="fixed inset-0 top-[57px] md:top-[65px] flex w-full max-w-[1600px] mx-auto bg-background md:border-x z-30">
      <div className={`w-full md:w-[340px] lg:w-[380px] border-r flex flex-col bg-muted/10 pb-[60px] md:pb-0 ${isChatRoom ? 'hidden md:flex' : 'flex'}`}>
        {sidebar}
      </div>
      <div className={`flex-1 flex flex-col bg-background relative ${isChatRoom ? 'flex' : 'hidden md:flex'}`}>
        {children}
      </div>
    </div>
  )
}
