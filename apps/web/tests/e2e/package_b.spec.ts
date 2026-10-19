import { test, expect } from '@playwright/test';

test.describe('Package B - Admin System', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the user as an ADMIN
    await page.route('**/auth/v1/user', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'admin-123',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'admin@bazargo.local',
        })
      });
    });

    await page.route('**/rest/v1/profiles?id=eq.admin-123*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'admin-123',
          role: 'ADMIN',
          full_name: 'Test Admin'
        })
      });
    });
  });

  test('Admin Dashboard displays correct layout and navigation', async ({ page }) => {
    // Mock the counts
    await page.route('**/rest/v1/profiles*', route => route.fulfill({ status: 200, body: '[]', headers: { 'content-range': '0-0/100' } }));
    await page.route('**/rest/v1/listings*', route => route.fulfill({ status: 200, body: '[]', headers: { 'content-range': '0-0/50' } }));
    await page.route('**/rest/v1/reports*', route => route.fulfill({ status: 200, body: '[]', headers: { 'content-range': '0-0/10' } }));
    await page.route('**/rest/v1/stores*', route => route.fulfill({ status: 200, body: '[]', headers: { 'content-range': '0-0/5' } }));
    await page.route('**/rest/v1/orders*', route => route.fulfill({ status: 200, body: '[]', headers: { 'content-range': '0-0/20' } }));

    await page.goto('/ru/admin');
    
    // Check Sidebar
    await expect(page.locator('text=Admin Panel')).toBeVisible();
    await expect(page.locator('text=Роль: ADMIN')).toBeVisible();
    
    // Check Dashboard metrics based on content-range
    await expect(page.locator('text=100').first()).toBeVisible(); // Users count
  });

  test('Admin Users Page loads with pagination and filters', async ({ page }) => {
    await page.route('**/rest/v1/profiles?select=*', route => {
      route.fulfill({
        status: 200,
        headers: { 'content-range': '0-19/45' }, // 45 users total
        body: JSON.stringify([
          { id: 'user-1', full_name: 'Regular User', role: 'USER', is_banned: false, created_at: new Date().toISOString() }
        ])
      });
    });

    await page.goto('/ru/admin/users');
    
    await expect(page.locator('text=Пользователи').first()).toBeVisible();
    await expect(page.locator('text=Regular User')).toBeVisible();
    
    // Pagination check
    await expect(page.locator('text=1 из 3')).toBeVisible(); // 45 total / 20 per page = 3 pages
  });

  test('Admin Listings Page loads with proper action buttons', async ({ page }) => {
    await page.route('**/rest/v1/listings?select=*', route => {
      route.fulfill({
        status: 200,
        headers: { 'content-range': '0-19/20' },
        body: JSON.stringify([
          { id: 'list-1', title: 'Pending Item', price: 1000, status: 'PENDING', created_at: new Date().toISOString(), profiles: { full_name: 'Seller' } }
        ])
      });
    });

    await page.goto('/ru/admin/listings');
    
    await expect(page.locator('text=Pending Item')).toBeVisible();
    // Because it's PENDING, it should show Одобрить and Отклонить
    await expect(page.locator('text=Одобрить')).toBeVisible();
    await expect(page.locator('text=Отклонить')).toBeVisible();
  });
});
