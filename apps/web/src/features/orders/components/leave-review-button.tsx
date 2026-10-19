"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Star } from "lucide-react"
import { submitReviewAction } from "@/features/reviews/actions/submit-review"
import { useTranslations } from "next-intl"

export function LeaveReviewButton({ orderId, existingReview }: { orderId: string, existingReview?: any }) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (existingReview) {
    return (
      <div className="mt-6 pt-6 border-t">
        <h4 className="font-semibold mb-2">Ваш отзыв</h4>
        <div className="flex gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={`w-4 h-4 ${star <= existingReview.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{existingReview.comment}</p>
        {existingReview.reply && (
          <div className="mt-3 p-3 bg-muted/30 rounded-xl text-sm border-l-2 border-primary">
            <span className="font-semibold block mb-1">Ответ продавца:</span>
            {existingReview.reply}
          </div>
        )}
      </div>
    )
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    const res = await submitReviewAction(orderId, rating, comment)
    setLoading(false)
    if (res.error) {
      setError(res.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <div className="mt-6 pt-6 border-t">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">Оставить отзыв</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оцените сделку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && <div className="text-sm text-destructive font-medium p-3 bg-destructive/10 rounded-lg">{error}</div>}
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star className={`w-8 h-8 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} />
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Комментарий</label>
              <Textarea 
                placeholder="Расскажите о впечатлениях..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <Button 
              className="w-full mt-4" 
              onClick={handleSubmit}
              disabled={loading || rating < 1}
            >
              {loading ? "Отправка..." : "Опубликовать отзыв"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
