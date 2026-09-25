import Link from "next/link"
import { ShieldCheck, Flag, AlertTriangle, MessageSquareOff } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Безопасность и правила | BazarGo",
  description: "Правила сообщества BazarGo и руководство по безопасности"
}

export default function SafetyPage() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Безопасность и правила</h1>
        <p className="text-lg text-muted-foreground">Руководство сообщества BazarGo для обеспечения честных и безопасных сделок.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-16">
        <div className="bg-green-500/5 border border-green-500/20 p-6 rounded-2xl">
          <ShieldCheck className="w-8 h-8 text-green-500 mb-4" />
          <h3 className="text-lg font-bold mb-2">Что мы приветствуем</h3>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
            <li>Честное и точное описание товаров.</li>
            <li>Реальные, четкие фотографии.</li>
            <li>Вежливое общение в чатах.</li>
            <li>Соблюдение законов Кыргызской Республики.</li>
          </ul>
        </div>
        <div className="bg-destructive/5 border border-destructive/20 p-6 rounded-2xl">
          <AlertTriangle className="w-8 h-8 text-destructive mb-4" />
          <h3 className="text-lg font-bold mb-2">Строго запрещено</h3>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-4">
            <li>Продажа запрещенных товаров (оружие, наркотики, контрафакт).</li>
            <li>Оскорбления, угрозы и разжигание вражды.</li>
            <li>Спам и публикация ложной информации.</li>
            <li>Попытки мошенничества и фишинга.</li>
          </ul>
        </div>
      </div>

      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed">
        <h2>Инструменты защиты пользователей</h2>
        
        <div className="flex flex-col md:flex-row gap-6 my-8 items-start">
          <div className="flex-shrink-0 p-4 bg-muted rounded-xl">
            <Flag className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold mt-0 mb-2">Жалобы (Reports)</h3>
            <p className="m-0">
              Если вы заметили подозрительное объявление, незаконный контент или столкнулись с мошенничеством, используйте кнопку <strong>«Пожаловаться»</strong>. Наши модераторы проверяют все жалобы в соответствии с Законом КР №101 «О защите от недостоверной информации» (в течение 24 часов). 
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 my-8 items-start">
          <div className="flex-shrink-0 p-4 bg-muted rounded-xl">
            <MessageSquareOff className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold mt-0 mb-2">Блокировка пользователей</h3>
            <p className="m-0">
              Если другой пользователь ведет себя некорректно или навязчиво, вы можете <strong>Заблокировать</strong> его прямо из чата или профиля. Заблокированный пользователь больше не сможет отправлять вам сообщения и просматривать ваши объявления.
            </p>
          </div>
        </div>

        <h2>Модерация и удаление контента</h2>
        <p>
          BazarGo оставляет за собой право блокировать объявления и учетные записи, нарушающие Условия использования или законодательство КР. Модерация может происходить как по жалобам пользователей, так и в результате автоматических проверок.
        </p>
        <p>
          Для получения юридической информации ознакомьтесь с <Link href="/terms" className="text-primary hover:underline">Условиями использования</Link>.
        </p>

        <div className="mt-12 not-prose">
          <Link href="/">
            <Button variant="outline">Вернуться на главную</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
