"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2 } from "lucide-react"
import { deleteAccountAction } from "../actions/account-deletion"
import { useTranslations } from "next-intl";

export function AccountDeletionForm() {
    const t = useTranslations();
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirmed) return
    setLoading(true)
    setError(null)
    
    try {
      await deleteAccountAction()
    } catch (err: any) {
      setError(err.message || t("forms.failed_to_delete"))
      setLoading(false)
    }
  }

  return (
    <div className="border border-destructive/20 bg-destructive/5 rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-destructive/10 text-destructive rounded-xl shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-destructive">{t("udalenie_akkaunta")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("udalenie_akkaunta_privedet_k")}</p>
          
          {error && <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>}

          <div className="mt-6 space-y-4">
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded border-gray-300 text-destructive focus:ring-destructive"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                disabled={loading}
              />
              {t("ya_ponimayu_chto_eto")}</label>

            <Button 
              variant="destructive" 
              disabled={!confirmed || loading}
              onClick={handleDelete}
              className="w-full sm:w-auto gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {loading ? t("forms.deleting") : t("forms.delete_forever")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
