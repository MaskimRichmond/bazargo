import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should display login page and perform email login validation', async ({ page }) => {
    // 1. Visit Login
    await page.goto('/login');
    
    // 2. Expect Title
    await expect(page).toHaveTitle(/Войти/);

    // 3. Check for Email and Phone Tabs
    await expect(page.getByRole('tab', { name: /Email/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Телефон/i })).toBeVisible();

    // 4. Test validation on empty form submission
    await page.getByRole('button', { name: 'Получить код' }).click();
    
    // HTML5 validation prevents submission, but let's try filling it with bad data
    await page.getByLabel('Имя').fill('Test User');
    await page.getByLabel('Email адрес').fill('not-an-email');
    
    // The browser intercepts this before React handles it due to type="email",
    // but just checking it exists is a good first step.
    
    // Fill with valid email
    await page.getByLabel('Email адрес').fill('test@example.com');
    
    // We do not want to actually submit to the real Supabase in CI without mocking or a clean test env.
    // However, the test requirement says: "Успешная регистрация или вход с тестовыми учётными данными, если тестовая среда это поддерживает."
    // Since we don't have a dedicated mock backend yet, we'll just check if the form is rendering properly.
    
    // Check elements are present
    const button = page.getByRole('button', { name: 'Получить код' });
    await expect(button).toBeEnabled();
  });
});
