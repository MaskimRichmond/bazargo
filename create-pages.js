const fs = require('fs');
const pages = [
  { path: 'about', title: 'О нас', subtitle: 'Что такое BazarGo и зачем мы это делаем' },
  { path: 'help', title: 'Помощь', subtitle: 'Ответы на частые вопросы' },
  { path: 'safety', title: 'Безопасность', subtitle: 'Как безопасно покупать и продавать на BazarGo' },
  { path: 'contacts', title: 'Контакты', subtitle: 'Свяжитесь с нами' },
  { path: 'terms', title: 'Пользовательское соглашение', subtitle: 'Правила использования сервиса BazarGo' },
  { path: 'privacy', title: 'Политика конфиденциальности', subtitle: 'Как мы обрабатываем ваши данные' },
  { path: 'b2b', title: 'Для бизнеса', subtitle: 'Оптовые закупки и возможности для магазинов' },
  { path: 'messages', title: 'Сообщения', subtitle: 'Здесь появятся ваши диалоги с продавцами и покупателями', isPlaceholder: true, cta: 'Перейти в каталог', ctaLink: '/catalog' },
  { path: 'stores', title: 'Магазины', subtitle: 'Пока нет магазинов', isPlaceholder: true, cta: 'Разместить товар', ctaLink: '/sell' },
  { path: 'requests', title: 'Запросы', subtitle: 'Пока нет запросов', isPlaceholder: true, cta: 'Создать запрос', ctaLink: '/requests' }
];

pages.forEach(p => {
  const dir = `src/app/(main)/${p.path}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  let content = `import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag } from "lucide-react"

export const metadata = {
  title: "${p.title} | BazarGo"
}

export default function Page() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-24 max-w-4xl min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">${p.title}</h1>
        <p className="text-lg text-muted-foreground">${p.subtitle}</p>
      </div>`;

  if (p.isPlaceholder) {
    content += `
      <div className="flex flex-col items-center justify-center text-center py-20 border rounded-3xl bg-muted/20 px-4">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">${p.title}</h2>
        <p className="text-muted-foreground mb-8 max-w-sm">${p.subtitle}</p>
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <Link href="${p.ctaLink}">${p.cta}</Link>
        </Button>
      </div>`;
  } else if (p.path === 'b2b') {
    content += `
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="p-8 bg-muted/30 border rounded-3xl">
          <h2 className="text-2xl font-bold mb-4">Для магазинов</h2>
          <p className="text-muted-foreground mb-6">Откройте свой магазин на BazarGo. Получите доступ к тысячам покупателей, удобным инструментам аналитики и премиум-размещению.</p>
        </div>
        <div className="p-8 bg-primary/5 border border-primary/20 rounded-3xl">
          <h2 className="text-2xl font-bold mb-4 text-primary">Для поставщиков</h2>
          <p className="text-muted-foreground mb-6">Находите оптовых покупателей и расширяйте свой B2B бизнес с минимальными затратами на маркетинг.</p>
        </div>
      </div>
      <div className="flex justify-center">
        <Button asChild size="lg" className="rounded-xl font-semibold">
          <Link href="/requests">Стать поставщиком</Link>
        </Button>
      </div>`;
  } else {
    content += `
      <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold">
        <p>
          Это заглушка для страницы "${p.title}". Реальный текст будет добавлен позже.
        </p>
        <h3>Раздел 1</h3>
        <p>
          Здесь будет подробное описание, условия или другая важная информация для пользователей платформы BazarGo.
        </p>
        <h3>Раздел 2</h3>
        <p>
          Платформа BazarGo активно развивается, и мы стремимся сделать процесс покупки и продажи максимально удобным и безопасным.
        </p>
      </div>`;
  }

  content += `
    </div>
  )
}
`;
  fs.writeFileSync(dir + '/page.tsx', content);
});
