import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ChatShell } from "./chat-shell"
import { ChatList } from "./chat-list"

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/messages")
  }

  const { data: chats, error } = await supabase.rpc("get_chats_with_unread")

  if (error) {
    console.error("Error fetching chats:", error)
  }

  const sidebar = <ChatList chats={chats || []} currentUserId={session.user.id} />

  return (
    <ChatShell sidebar={sidebar}>
      {children}
    </ChatShell>
  )
}
