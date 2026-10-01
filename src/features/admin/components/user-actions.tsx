"use client"

import { useState } from "react"
import { blockUserAction, unblockUserAction, changeUserRoleAction } from "@/features/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, ShieldOff, ShieldAlert, ShieldCheck } from "lucide-react"
import { useTranslations } from "next-intl";

type Profile = {
  id: string
  full_name: string | null
  role: string
  is_banned: boolean
}

export function UserActions({ user }: { user: Profile }) {
  const t = useTranslations();
  const [isPending, setIsPending] = useState(false)
  const [reason, setReason] = useState("")
  const [showReason, setShowReason] = useState(false)
  const [showRoleSelect, setShowRoleSelect] = useState(false)
  const [selectedRole, setSelectedRole] = useState(user.role)

  const handleAction = async () => {
    if (!reason.trim()) {
      toast.error("Пожалуйста, укажите причину")
      return
    }

    setIsPending(true)
    try {
      if (showRoleSelect) {
        await changeUserRoleAction(user.id, selectedRole, reason)
        toast.success("Роль изменена")
        setShowRoleSelect(false)
      } else {
        if (user.is_banned) {
          await unblockUserAction(user.id, reason)
          toast.success("Пользователь разблокирован")
        } else {
          await blockUserAction(user.id, reason)
          toast.success("Пользователь заблокирован")
        }
      }
      setShowReason(false)
      setReason("")
    } catch (e: any) {
      toast.error(e.message || "Произошла ошибка")
    } finally {
      setIsPending(false)
    }
  }

  if (showReason) {
    return (
      <div className="flex flex-col gap-2 bg-muted/50 p-2 rounded-md border text-left min-w-[200px]">
        {showRoleSelect && (
          <select 
            className="border rounded-md px-2 py-1 text-sm bg-background" 
            value={selectedRole} 
            onChange={e => setSelectedRole(e.target.value)}
            disabled={isPending}
          >
            <option value="USER">User</option>
            <option value="MODERATOR">Moderator</option>
            <option value="SUPPORT">Support</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
        )}
        <Input 
          size={1} 
          className="w-full h-8 text-xs" 
          placeholder={t("prichina")} 
          value={reason} 
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
        />
        <div className="flex justify-end gap-2 mt-1">
          <Button size="sm" className="h-7 text-xs" variant="ghost" disabled={isPending} onClick={() => { setShowReason(false); setShowRoleSelect(false) }}>
            {t("otmena")}
          </Button>
          <Button size="sm" className="h-7 text-xs" variant="default" disabled={isPending} onClick={handleAction}>
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
          </Button>
        </div>
      </div>
    );
  }

  if (user.role === 'SUPER_ADMIN') {
    return <span className="text-xs text-muted-foreground block py-1">{t("neizmenyaemyy")}</span>;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 justify-end">
      <Button 
        size="sm" 
        variant="outline" 
        className="h-8 text-xs"
        onClick={() => { setShowReason(true); setShowRoleSelect(true) }}
      >
        <ShieldCheck className="w-3 h-3 mr-1" /> Изменить роль
      </Button>
      <Button 
        size="sm" 
        variant={user.is_banned ? "outline" : "destructive"} 
        className="h-8 text-xs"
        onClick={() => setShowReason(true)}
      >
        {user.is_banned ? (
          <><ShieldOff className="w-3 h-3 mr-1" /> {t("razblokirovat")}</>
        ) : (
          <><ShieldAlert className="w-3 h-3 mr-1" /> {t("zablokirovat")}</>
        )}
      </Button>
    </div>
  );
}
