import Link from "next/link"
import { ShoppingBag } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t pt-12 pb-24 md:pb-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary text-primary-foreground p-1 rounded-lg">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="font-bold text-xl tracking-tight">BazarGo</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Больше, чем объявления. Покупай, продавай и развивайся с BazarGo.
            </p>
            <p className="text-sm font-medium">Бишкек, Кыргызстан</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Покупателям</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/catalog" className="hover:text-foreground">Каталог товаров</Link></li>
              <li><Link href="/requests" className="hover:text-foreground">Нужен товар</Link></li>
              <li><Link href="/stores" className="hover:text-foreground">Магазины</Link></li>
              <li><Link href="/safety" className="hover:text-foreground">Безопасность</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Продавцам</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/sell" className="hover:text-foreground">Разместить объявление</Link></li>
              <li><Link href="/b2b" className="hover:text-foreground">Открыть магазин</Link></li>
              <li><Link href="/about" className="hover:text-foreground">Тарифы</Link></li>
              <li><Link href="/safety" className="hover:text-foreground">Правила</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Бизнесу</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/b2b" className="hover:text-foreground">Стать поставщиком</Link></li>
              <li><Link href="/b2b" className="hover:text-foreground">B2B решения</Link></li>
              <li><Link href="/b2b" className="hover:text-foreground">Реклама</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">BazarGo</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground">О компании</Link></li>
              <li><Link href="/help" className="hover:text-foreground">Помощь</Link></li>
              <li><Link href="/contacts" className="hover:text-foreground">Контакты</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} BazarGo. Все права защищены.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground">Политика конфиденциальности</Link>
            <Link href="/terms" className="hover:text-foreground">Пользовательское соглашение</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
