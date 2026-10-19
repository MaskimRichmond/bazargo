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
      className="px-2.5 py-1 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      suppressHydrationWarning
    >
      {locale === 'ru' ? 'Кыргызча' : 'Русский'}
    </button>
  );
}
