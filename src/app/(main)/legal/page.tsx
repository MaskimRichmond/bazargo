import Link from "next/link"
import { ShieldCheck, FileText, AlertTriangle, Shield, CheckCircle } from "lucide-react"

export const metadata = {
  title: "Документы и правила | BazarGo",
}

export default function LegalPage() {
  const documents = [
    { href: "/privacy", icon: Shield, title: "Политика конфиденциальности", desc: "Как мы обрабатываем и защищаем ваши данные" },
    { href: "/terms", icon: FileText, title: "Пользовательское соглашение", desc: "Общие условия использования платформы" },
    { href: "/safety", icon: ShieldCheck, title: "Правила безопасности", desc: "Как безопасно покупать и продавать" },
    { href: "/rules", icon: CheckCircle, title: "Правила размещения объявлений", desc: "Что можно и нельзя публиковать на BazarGo" },
    { href: "/contacts", icon: AlertTriangle, title: "Жалобы и поддержка", desc: "Связь с администрацией и решение споров" }
  ]

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Документы и правила</h1>
        <p className="text-muted-foreground">Официальная информация и правила использования платформы BazarGo.</p>
      </div>

      <div className="bg-background sm:border sm:rounded-2xl overflow-hidden shadow-sm divide-y">
        {documents.map((doc) => (
          <Link 
            key={doc.href}
            href={doc.href}
            className="flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors focus:bg-muted/50 outline-none group"
          >
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors shrink-0">
              <doc.icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors">{doc.title}</h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">{doc.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
