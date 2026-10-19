'use client';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const nextLocale = locale === 'ru' ? 'ky' : 'ru';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <button 
      onClick={toggle}
      className="px-3 py-1 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
      suppressHydrationWarning
    >
      {locale === 'ru' ? 'Кыргызча' : 'Русский'}
    </button>
  );
}
