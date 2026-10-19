import { test, expect } from '@playwright/test';

test.describe('I18n and Language Switching', () => {
  test('should switch language, preserve routing, update html lang and translate nav elements', async ({ page }) => {
    // 1. Visit Home (Default RU)
    await page.goto('/');
    
    // Default lang should be RU
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { name: 'Кирүү же каттоо' })).not.toBeVisible();
    // Check main navigation elements on RU
    await expect(page.getByRole('link', { name: 'Запросы' }).first()).toBeVisible();
    
    // Switch to KY
    await page.getByRole('button', { name: 'Кыргызча' }).click();
    
    // URL should have /ky
    await expect(page).toHaveURL(/\/ky/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ky');

    // 2. Preserve language on navigation (Go to Catalog)
    await page.goto('/ky/catalog');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ky');
    
    // Check nav translation applied to "Запросы" -> "Сурамдар"
    await expect(page.getByRole('link', { name: 'Сурамдар' }).first()).toBeVisible();
    
    // Check auth page
    await page.goto('/ky/login');
    // Ensure translation works on auth
    await expect(page.getByRole('heading', { name: 'Кирүү же каттоо' })).toBeVisible();

    // 3. Preserve language after reload
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ky');
    await expect(page.getByRole('heading', { name: 'Кирүү же каттоо' })).toBeVisible();

    // Switch back to RU
    await page.getByRole('button', { name: 'Русский' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByRole('heading', { name: 'Войти или зарегистрироваться' })).toBeVisible();
  });
});
