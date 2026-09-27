import { test, expect } from '@playwright/test';

test.describe('Catalog and Search', () => {
  test('should load catalog and filter UI', async ({ page }) => {
    await page.goto('/catalog');
    
    // Check that we loaded the page and there's a Search Input
    // The main search is likely in the header
    const searchInput = page.getByPlaceholder(/Поиск/i).first();
    await expect(searchInput).toBeVisible();
    
    // Execute a search
    await searchInput.fill('iphone');
    await searchInput.press('Enter');

    // It should navigate and append ?q=iphone
    await expect(page).toHaveURL(/q=iphone/);
    
    // There should be a message like "По запросу «iphone» ничего не найдено" or "Найдено"
    // We just wait for network to settle by checking if the URL applied
    const notFoundText = page.getByText(/ничего не найдено/i);
    const foundText = page.getByText(/Найдено/i);
    
    // Either it found something or nothing, but the page rendered successfully
    await expect(notFoundText.or(foundText)).toBeVisible();
  });
});
