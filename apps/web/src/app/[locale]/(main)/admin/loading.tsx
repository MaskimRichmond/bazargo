import { Loader2 } from "lucide-react"
import { useTranslations } from "next-intl";

export default function AdminLoading() {
    const t = useTranslations();
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">{t("zagruzka_dannyh")}</p>
      </div>
    </div>
  );
}
