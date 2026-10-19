"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"
import { adminModerateB2BAction } from "@/features/admin/actions"

export function B2bActions({ appId, currentStatus }: { appId: string, currentStatus: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAction = async (status: 'APPROVED' | 'REJECTED') => {
    const reason = prompt(`Введите причину для статуса ${status}:`)
    if (!reason) return;
    
    setLoading(true)
    setError(null)
    try {
      await adminModerateB2BAction(appId, status, reason)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (currentStatus !== 'PENDING') return null;

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-destructive">{error}</span>}
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
        disabled={loading}
        onClick={() => handleAction('APPROVED')}
        title="Одобрить заявку"
      >
        <Check className="w-4 h-4" />
      </Button>
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
        disabled={loading}
        onClick={() => handleAction('REJECTED')}
        title="Отклонить заявку"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  )
}
