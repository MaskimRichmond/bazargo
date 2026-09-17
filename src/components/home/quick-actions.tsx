import { Search, Plus, FileQuestion, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export function QuickActions() {
  const actions = [
    {
      title: "Найти товар",
      description: "Ищите среди тысяч объявлений и проверенных магазинов",
      icon: Search,
      href: "/catalog",
      color: "from-blue-500 to-cyan-500",
      bgLight: "bg-blue-50 dark:bg-blue-950/20",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Продать товар",
      description: "Разместите объявление бесплатно и найдите покупателя",
      icon: Plus,
      href: "/sell",
      color: "from-primary to-emerald-500",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
      iconColor: "text-primary",
    },
    {
      title: "Нужен товар?",
      description: "Создайте запрос — продавцы сами предложат варианты",
      icon: FileQuestion,
      href: "/requests",
      color: "from-orange-500 to-amber-500",
      bgLight: "bg-orange-50 dark:bg-orange-950/20",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
  ]

  return (
    <section className="py-8 md:py-12 bg-background relative z-20 -mt-6 md:-mt-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {actions.map((action) => (
            <Link key={action.title} href={action.href} className="group outline-none">
              <Card className={`overflow-hidden transition-all duration-300 border-muted/60 hover:shadow-lg hover:border-transparent ${action.bgLight}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3.5 rounded-2xl bg-background shadow-sm ${action.iconColor}`}>
                      <action.icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                      <ArrowRight className={`w-4 h-4 ${action.iconColor}`} />
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-foreground group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-foreground group-hover:to-foreground/70 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
