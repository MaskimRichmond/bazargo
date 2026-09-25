import Link from "next/link"
import { ShieldCheck, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Удаление аккаунта | BazarGo",
  description: "Запрос на удаление аккаунта и обезличивание данных BazarGo"
}

export default async function PublicAccountDeletionPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const resolvedParams = await searchParams
  const isSuccess = resolvedParams.success === 'true'

  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-3xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Удаление аккаунта и данных</h1>
        <p className="text-lg text-muted-foreground">Информация об управлении вашими персональными данными.</p>
      </div>

      {isSuccess ? (
        <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-8 rounded-2xl text-center space-y-4">
          <ShieldCheck className="w-12 h-12 mx-auto text-green-500" />
          <h2 className="text-2xl font-bold">Аккаунт успешно удален</h2>
          <p>
            Ваши персональные данные были обезличены, а объявления сняты с публикации. 
            Если у вас остались вопросы, свяжитесь с нами.
          </p>
          <div className="pt-4">
            <Link href="/">
              <Button variant="outline">На главную</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed">
            <p>
              В соответствии с Цифровым кодексом Кыргызской Республики, вы имеете право запросить удаление или обезличивание ваших персональных данных, обрабатываемых платформой BazarGo.
            </p>

            <h3>Как удалить аккаунт в приложении:</h3>
            <ol>
              <li>Откройте приложение или сайт BazarGo и войдите в свой профиль.</li>
              <li>Перейдите в раздел <strong>Настройки</strong>.</li>
              <li>Выберите пункт <strong>Аккаунт</strong>.</li>
              <li>Нажмите <strong>Навсегда удалить аккаунт</strong> в самом низу страницы.</li>
            </ol>
            
            <div className="not-prose my-6">
              <Link href="/settings/account">
                <Button>Перейти в настройки аккаунта</Button>
              </Link>
            </div>

            <h3>Что происходит при удалении?</h3>
            <ul>
              <li><strong>Обезличивание:</strong> Ваши ФИО, номер телефона и аватар безвозвратно удаляются (обезличиваются).</li>
              <li><strong>Объявления:</strong> Все ваши активные объявления переводятся в статус "Неактивно" и скрываются от других пользователей.</li>
              <li><strong>Чаты:</strong> Ваше имя в существующих чатах будет отображаться как "Удаленный пользователь", однако сами сообщения сохраняются для защиты прав второго участника беседы.</li>
              <li><strong>Хранение:</strong> Мы можем сохранить некоторые технические данные (например, логи транзакций) в деперсонализированном виде исключительно для аналитики или если этого требует налоговое/финансовое законодательство КР (в соответствии со ст. 26 и 27 Закона).</li>
            </ul>

            <div className="bg-muted p-4 rounded-xl flex items-start gap-3 mt-8">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-sm m-0 text-muted-foreground">
                Если вы потеряли доступ к своему аккаунту и не можете удалить его самостоятельно, пожалуйста, свяжитесь со службой поддержки по адресу <strong>privacy@bazargo.kg</strong> с почты, на которую был зарегистрирован аккаунт. Модератор обработает ваш запрос в течение установленного законом срока.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
