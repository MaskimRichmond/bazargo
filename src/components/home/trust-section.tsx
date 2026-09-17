import { ShieldCheck, UserCheck, MessageSquareWarning, Eye } from "lucide-react"

export function TrustSection() {
  const features = [
    {
      title: "Проверенные продавцы",
      description: "Мы тщательно проверяем магазины и отмечаем их специальным бейджем.",
      icon: UserCheck,
    },
    {
      title: "Безопасные сделки",
      description: "Советы по безопасности и прозрачная система статусов.",
      icon: ShieldCheck,
    },
    {
      title: "Прозрачная история",
      description: "Смотрите активные и проданные товары в профиле продавца.",
      icon: Eye,
    },
    {
      title: "Система жалоб",
      description: "Быстрое реагирование на нарушения и подозрительные объявления.",
      icon: MessageSquareWarning,
    },
  ]

  return (
    <section className="py-12 md:py-16 bg-muted/30 border-t">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold mb-4">Безопаснее покупать и продавать</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Мы строим доверительную платформу, где каждый участник может быть уверен в безопасности сделки.
          </p>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
