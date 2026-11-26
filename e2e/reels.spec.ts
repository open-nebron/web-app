import { test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { createTestMp4Buffer } from './fixtures/sample-mp4';

test.describe.serial('Reels E2E (Stage V3-4)', () => {
  const password = 'SecurePassword123!';
  const aliceEmail = 'e2e_alice_reels@nebron.com';
  const bobEmail = 'e2e_bob_reels@nebron.com';

  let aliceContext: BrowserContext;
  let bobContext: BrowserContext;
  let alicePage: Page;
  let bobPage: Page;

  let aliceToken = '';
  let bobToken = '';
  let aliceUserId = '';

  const sampleMp4 = createTestMp4Buffer(6, 0x80);
  const uploadMp4 = createTestMp4Buffer(7, 0xa0);

  async function ensureUserAndToken(request: APIRequestContext, email: string) {
    let loginRes = await request.post('http://localhost:4001/auth/login', {
      data: { email, password },
    });
    if (!loginRes.ok()) {
      const regRes = await request.post('http://localhost:4001/auth/register', {
        data: { email, password },
      });
      expect(regRes.ok()).toBeTruthy();
      loginRes = await request.post('http://localhost:4001/auth/login', {
        data: { email, password },
      });
    }
    expect(loginRes.ok()).toBeTruthy();
    const { accessToken } = await loginRes.json();

    const meRes = await request.get('http://localhost:4002/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.ok()).toBeTruthy();
    const profile = await meRes.json();
    return { token: accessToken as string, profile };
  }

  async function clearMyReels(request: APIRequestContext, token: string) {
    const res = await request.get('http://localhost:4002/users/me/reels?limit=20', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return;
    const data = await res.json();
    for (const r of data.items || []) {
      await request.delete(`http://localhost:4002/reels/${r.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  async function seedReel(
    request: APIRequestContext,
    token: string,
    caption: string
  ): Promise<string> {
    const urlRes = await request.post('http://localhost:4002/reels/upload-url', {
      headers: { Authorization: `Bearer ${token}` },
      data: { contentType: 'video/mp4', contentLength: sampleMp4.length },
    });
    expect(urlRes.ok()).toBeTruthy();
    const slot = await urlRes.json();

    const uploadUrl = String(slot.uploadUrl).replace('://minio:9000', '://localhost:9000');
    const multipart: Record<string, any> = { ...slot.fields };
    multipart.file = {
      name: 'seed.mp4',
      mimeType: 'video/mp4',
      buffer: sampleMp4,
    };

    const s3Res = await request.post(uploadUrl, { multipart });
    expect(s3Res.status()).toBeLessThan(300);

    const confirmRes = await request.post('http://localhost:4002/reels/confirm', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        videoKey: slot.objectKey,
        caption,
        duration: 6,
      },
    });
    expect(confirmRes.ok()).toBeTruthy();
    const created = await confirmRes.json();
    return created.id as string;
  }

  async function loginInPage(page: Page, email: string) {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('http://localhost:3000/');
  }

  test.beforeAll(async ({ browser, request }) => {
    const alice = await ensureUserAndToken(request, aliceEmail);
    aliceToken = alice.token;
    aliceUserId = alice.profile.userId;

    const bob = await ensureUserAndToken(request, bobEmail);
    bobToken = bob.token;

    await clearMyReels(request, aliceToken);
    await clearMyReels(request, bobToken);

    // Ensure Bob follows Alice so Alice's seeded reels appear in Bob's Reels feed
    const followRes = await request.post(`http://localhost:4002/users/${aliceUserId}/follow`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    expect(followRes.ok()).toBeTruthy();

    // Seed two reels sequentially so deterministic ordering puts Reel Two at index 0
    await seedReel(request, aliceToken, 'Seeded Reel One');
    await new Promise((r) => setTimeout(r, 100));
    await seedReel(request, aliceToken, 'Seeded Reel Two');

    aliceContext = await browser.newContext();
    alicePage = await aliceContext.newPage();
    await loginInPage(alicePage, aliceEmail);

    bobContext = await browser.newContext();
    bobPage = await bobContext.newPage();
    await loginInPage(bobPage, bobEmail);
  });

  test.afterAll(async () => {
    if (aliceContext) await aliceContext.close();
    if (bobContext) await bobContext.close();
  });

  test('1. Reels feed loads -> plays active reel', async () => {
    await bobPage.getByRole('link', { name: 'Reels', exact: true }).click();
    await bobPage.waitForURL('http://localhost:3000/reels');

    const container = bobPage.getByTestId('reels-feed-container');
    await expect(container).toBeVisible();

    const firstCard = bobPage.locator('[data-reel-index="0"]');
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toHaveAttribute('data-active', 'true');
    await expect(firstCard).toContainText('Seeded Reel Two');

    const firstVideo = firstCard.getByTestId('reel-video-player');
    await expect(firstVideo).toHaveAttribute('data-playing', 'true', { timeout: 10000 });
  });

  test('2. Scroll down -> next reel plays, previous pauses', async () => {
    const firstCard = bobPage.locator('[data-reel-index="0"]');
    const secondCard = bobPage.locator('[data-reel-index="1"]');

    await expect(secondCard).toHaveAttribute('data-active', 'false');

    // Scroll second card cleanly into snap viewport
    await secondCard.evaluate((el) => {
      el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });

    await expect(secondCard).toHaveAttribute('data-active', 'true', { timeout: 10000 });
    await expect(firstCard).toHaveAttribute('data-active', 'false', { timeout: 10000 });

    await expect(secondCard.getByTestId('reel-video-player')).toHaveAttribute('data-playing', 'true', {
      timeout: 10000,
    });
    await expect(firstCard.getByTestId('reel-video-player')).toHaveAttribute('data-playing', 'false', {
      timeout: 10000,
    });
  });

  test('3. Like -> count increments', async () => {
    const secondCard = bobPage.locator('[data-reel-index="1"]');
    const likeBtn = secondCard.getByTestId('reel-like-btn');
    const likeCount = secondCard.getByTestId('reel-like-count');

    await expect(likeCount).toHaveText('0');
    await likeBtn.click();
    await expect(likeCount).toHaveText('1', { timeout: 10000 });

    // Confirm persistence on reload
    await bobPage.reload();
    const cardAfterReload = bobPage.locator('[data-reel-index="1"]');
    await expect(cardAfterReload.getByTestId('reel-like-count')).toHaveText('1', {
      timeout: 10000,
    });
  });

  test('4. Comment -> appears in list', async () => {
    const firstCard = bobPage.locator('[data-reel-index="0"]');
    const commentCount = firstCard.getByTestId('reel-comment-count');
    await expect(commentCount).toHaveText('0');

    await firstCard.getByTestId('reel-comment-btn').click();
    const drawer = bobPage.getByTestId('reel-comments-drawer');
    await expect(drawer).toBeVisible();

    await bobPage.getByTestId('reel-comment-input').fill('Awesome E2E reel comment!');
    await bobPage.getByTestId('reel-comment-submit').click();

    await expect(drawer.getByText('Awesome E2E reel comment!')).toBeVisible({ timeout: 10000 });
    await expect(commentCount).toHaveText('1', { timeout: 10000 });

    await bobPage.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
  });

  test('5. Upload reel -> appears at top', async () => {
    await alicePage.getByRole('link', { name: 'Reels', exact: true }).click();
    await alicePage.waitForURL('http://localhost:3000/reels');

    await alicePage.getByTestId('upload-reel-btn').click();
    await expect(alicePage.getByRole('heading', { name: /upload reel/i })).toBeVisible();

    await alicePage.getByTestId('reel-file-input').setInputFiles({
      name: 'upload-test.mp4',
      mimeType: 'video/mp4',
      buffer: uploadMp4,
    });

    await expect(alicePage.getByText('7s')).toBeVisible({ timeout: 10000 });
    await alicePage.getByTestId('reel-caption-input').fill('Fresh UI Uploaded Reel');

    const publishBtn = alicePage.getByTestId('reel-publish-btn');
    await expect(publishBtn).toBeEnabled({ timeout: 10000 });
    await publishBtn.click();

    await expect(alicePage.getByRole('heading', { name: /upload reel/i })).not.toBeVisible({
      timeout: 15000,
    });

    const topCard = alicePage.locator('[data-reel-index="0"]');
    await expect(topCard).toBeVisible({ timeout: 10000 });
    await expect(topCard).toContainText('Fresh UI Uploaded Reel');
  });

  test('6. Profile Reels tab shows grid', async () => {
    await alicePage.getByRole('link', { name: 'Profile', exact: true }).click();
    await alicePage.waitForURL('http://localhost:3000/profile');

    await alicePage.getByRole('tab', { name: 'Reels' }).click();
    const grid = alicePage.getByTestId('reel-grid');
    await expect(grid).toBeVisible({ timeout: 10000 });

    const gridItems = grid.locator('[data-testid^="reel-grid-item-"]');
    await expect(gridItems).toHaveCount(3, { timeout: 10000 });

    // Click first tile -> opens /reels/[id]
    await gridItems.first().click();
    await expect(alicePage).toHaveURL(/\/reels\/[0-9a-f]{24}$/, { timeout: 10000 });
    await expect(alicePage.getByTestId('reel-video-player').first()).toBeVisible({
      timeout: 10000,
    });
  });
});
