import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ru', 'ky'],
  defaultLocale: 'ru',
  localePrefix: 'as-needed' // Only prefix /ky, keep /ru as default at /
});

export const {Link, redirect, usePathname, useRouter} = createNavigation(routing);
