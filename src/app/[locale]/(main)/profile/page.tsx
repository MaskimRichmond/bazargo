import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { 
  User, 
  Settings, 
  Heart, 
  Package, 
  Store, 
  MessageCircle, 
  ChevronRight, 
  LogOut, 
  Briefcase,
  ShieldCheck,
  ShoppingBag,
  HelpCircle
} from "lucide-react"
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
    const t = await getTranslations();
  const supabase = await createClient()
  
  if (!supabase) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">{t("oshibka_konfiguratsii")}</h1>
        <p className="text-muted-foreground">{t("ne_zadany_klyuchi_supabase")}</p>
      </div>
    );
  }

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login?redirect_to=/profile")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single()

  const displayName = profile?.full_name || session.user.phone || session.user.email || "Пользователь"

  const NavItem = ({ href, icon: Icon, title, subtitle, isPrimary = false }: any) => (
    <Link 
      href={href} 
      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors active:bg-muted"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPrimary ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold text-[15px] ${isPrimary ? 'text-primary' : 'text-foreground'}`}>{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/50 shrink-0" />
    </Link>
  )

  return (
    <div className="container mx-auto px-0 sm:px-4 py-4 sm:py-8 max-w-2xl pb-24">
      <div className="px-4 sm:px-0 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("profil")}</h1>
      </div>

      <div className="px-4 sm:px-0 mb-8">
        <Card className="rounded-2xl border-none shadow-md overflow-hidden bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center text-primary text-xl font-bold shrink-0 shadow-sm overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{session.user.phone || session.user.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-background text-muted-foreground">
                    ID: {session.user.id.substring(0, 6)}
                  </span>
                  {profile?.is_verified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck className="w-3 h-3" /> {t("verifitsirovan")}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        
        <div className="bg-background sm:border sm:rounded-2xl overflow-hidden shadow-sm divide-y">
          <NavItem href="/my-listings" icon={Package} title={t("moi_obyavleniya")} subtitle={t("aktivnye_prodannye_arhiv")} />
          <NavItem href="/favorites" icon={Heart} title={t("izbrannoe")} subtitle={t("sohranennye_tovary")} />
          <NavItem href="/orders" icon={ShoppingBag} title={t("moi_zakazy")} subtitle={t("pokupki_i_status_dostavki")} />
          <NavItem href="/messages" icon={MessageCircle} title={t("chaty_1")} subtitle={t("perepiska_s_prodavtsami_i")} />
        </div>

        <div className="px-4 sm:px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
          {t("biznes_i_prodazhi")}</div>
        <div className="bg-background sm:border sm:rounded-2xl overflow-hidden shadow-sm divide-y">
          <NavItem href="/seller/orders" icon={Package} title={t("zakazy_klientov")} subtitle={t("upravlenie_zakazami_na_vashi")} />
          <NavItem href="/my-store" icon={Store} title={t("moy_magazin")} subtitle={t("upravlenie_vitrinoy_i_tovarami")} />
          <NavItem href="/my-requests" icon={HelpCircle} title={t("moi_zaprosy_nuzhen_tovar")} subtitle={t("poisk_redkih_tovarov")} />
          <NavItem href="/b2b" icon={Briefcase} title={t("dlya_biznesa_b2b")} subtitle={t("optovye_zakupki_i_zayavki")} isPrimary={true} />
        </div>

        <div className="px-4 sm:px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
          {t("akkaunt")}</div>
        <div className="bg-background sm:border sm:rounded-2xl overflow-hidden shadow-sm divide-y">
          <NavItem href="/settings" icon={Settings} title={t("nastroyki")} subtitle={t("parol_uvedomleniya_dannye")} />
        </div>

        <div className="px-4 sm:px-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6">
          {t("informatsiya")}</div>
        <div className="bg-background sm:border sm:rounded-2xl overflow-hidden shadow-sm divide-y">
          <NavItem href="/about" icon={HelpCircle} title={t("o_bazargo")} subtitle={t("kak_rabotaet_platforma")} />
          <NavItem href="/legal" icon={ShieldCheck} title={t("dokumenty_i_pravila")} subtitle={t("politika_pravila_razmescheniya_bezopasnost")} />
        </div>

        <div className="px-4 sm:px-0 pt-4">
          <form action="/auth/signout" method="post">
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl h-12">
              <LogOut className="w-5 h-5 mr-3" />
              {t("vyyti_iz_akkaunta")}</Button>
          </form>
        </div>

      </div>
    </div>
  );
}
