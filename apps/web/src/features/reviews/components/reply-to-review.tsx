"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"

export function ReplyToReview({ reviewId }: { reviewId: string }) {
  const [isReplying, setIsReplying] = useState(false)
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!reply.trim()) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: rpcError } = await supabase.rpc("reply_to_review", {
        p_review_id: reviewId,
        p_reply: reply.trim()
      })
      if (rpcError) throw rpcError;
      window.location.reload()
    } catch (e: any) {
      setError(e.message || "Ошибка")
    } finally {
      setLoading(false)
    }
  }

  if (!isReplying) {
    return (
      <Button variant="link" size="sm" onClick={() => setIsReplying(true)} className="px-0 text-xs h-auto">
        Ответить
      </Button>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea 
        placeholder="Ваш ответ покупателю..." 
        value={reply} 
        onChange={e => setReply(e.target.value)} 
        className="text-sm min-h-[60px]"
      />
      {error && <div className="text-xs text-destructive">{error}</div>}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={loading || !reply.trim()}>Отправить</Button>
        <Button size="sm" variant="ghost" onClick={() => setIsReplying(false)}>Отмена</Button>
      </div>
    </div>
  )
}
