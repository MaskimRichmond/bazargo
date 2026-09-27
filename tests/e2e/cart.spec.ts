import { test, expect } from '@playwright/test';

test.describe('Cart Flow', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // 1. Visit Cart
    await page.goto('/cart');
    
    // 2. Unauthenticated should hit middleware/page protection and redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // 3. Ensure login page actually loaded
    await expect(page.getByRole('heading', { name: /Войти/i })).toBeVisible();
  });
});
