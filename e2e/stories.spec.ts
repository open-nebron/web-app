import { test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

// Minimal valid 1x1 JPEG image bytes
const TINY_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
  0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08,
  0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a,
  0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d,
  0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22,
  0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34,
  0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0,
  0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4,
  0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
  0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00,
  0x3f, 0x00, 0x7f, 0x00, 0xff, 0xd9,
]);

test.describe.serial('Stories E2E (Stage V3-3)', () => {
  const password = 'SecurePassword123!';
  const aliceEmail = 'e2e_alice_stories@nebron.com';
  const bobEmail = 'e2e_bob_stories@nebron.com';

  let aliceContext: BrowserContext;
  let bobContext: BrowserContext;
  let alicePage: Page;
  let bobPage: Page;

  let aliceUserId = '';
  let aliceUsername = '';
  let bobUsername = '';

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

  async function clearUserStories(request: APIRequestContext, token: string, userId: string) {
    const res = await request.get(`http://localhost:4002/stories/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok()) {
      const group = await res.json();
      for (const s of group.stories || []) {
        await request.delete(`http://localhost:4002/stories/${s.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
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
    aliceUserId = alice.profile.userId;
    aliceUsername = alice.profile.username;

    const bob = await ensureUserAndToken(request, bobEmail);
    bobUsername = bob.profile.username;

    await clearUserStories(request, alice.token, aliceUserId);
    await clearUserStories(request, bob.token, bob.profile.userId);

    // Ensure Bob follows Alice so Bob sees Alice's stories on Home feed
    const followRes = await request.post(`http://localhost:4002/users/${aliceUserId}/follow`, {
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    expect(followRes.ok()).toBeTruthy();

    // Open persistent browser sessions for Alice and Bob
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

  test('1. Story bar appears on home', async () => {
    const storyBar = alicePage.getByTestId('story-bar');
    await expect(storyBar).toBeVisible();

    const ownTile = alicePage.getByTestId('story-tile-mine');
    await expect(ownTile).toBeVisible();
    await expect(ownTile).toHaveAttribute('data-ring', 'empty');
  });

  test('2. Create story -> appears in own tile', async () => {
    const ownTile = alicePage.getByTestId('story-tile-mine');
    await ownTile.getByRole('button', { name: 'Add a story' }).click();

    await expect(alicePage.getByRole('heading', { name: 'Create Story' })).toBeVisible();

    await alicePage.getByTestId('story-file-input').setInputFiles({
      name: 'story-test.jpg',
      mimeType: 'image/jpeg',
      buffer: TINY_JPEG,
    });

    await alicePage.getByLabel(/caption/i).fill('Playwright E2E Story!');
    await alicePage.getByRole('button', { name: /share to story/i }).click();

    await expect(alicePage.getByRole('heading', { name: 'Create Story' })).not.toBeVisible({
      timeout: 15000,
    });

    await expect(ownTile).toHaveAttribute('data-ring', 'unviewed', { timeout: 10000 });
  });

  test('3. View another users story -> ring turns gray', async () => {
    await bobPage.reload();

    const aliceTile = bobPage.getByTestId(`story-tile-${aliceUsername}`);
    await expect(aliceTile).toBeVisible({ timeout: 10000 });
    await expect(aliceTile).toHaveAttribute('data-ring', 'unviewed');

    await aliceTile.getByRole('button').first().click();

    const viewer = bobPage.getByTestId('story-viewer-modal');
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText('Playwright E2E Story!')).toBeVisible();

    // Allow view mutation to persist
    await bobPage.waitForTimeout(500);
    await bobPage.getByTestId('close-story-viewer-btn').click();

    await expect(viewer).not.toBeVisible();
    await expect(aliceTile).toHaveAttribute('data-ring', 'viewed', { timeout: 10000 });
  });

  test('4. Author sees viewer list', async () => {
    await alicePage.reload();

    const ownTile = alicePage.getByTestId('story-tile-mine');
    await expect(ownTile).toHaveAttribute('data-ring', 'unviewed', { timeout: 10000 });

    await ownTile.getByRole('button', { name: 'View your story' }).click();

    const viewer = alicePage.getByTestId('story-viewer-modal');
    await expect(viewer).toBeVisible();

    const viewersTrigger = alicePage.getByTestId('story-viewers-trigger');
    await expect(viewersTrigger).toContainText('1 viewer');
    await viewersTrigger.click();

    const viewersDialog = alicePage.getByRole('dialog', { name: /story viewers/i });
    await expect(viewersDialog).toBeVisible();
    await expect(viewersDialog.getByText(`@${bobUsername}`)).toBeVisible({ timeout: 10000 });

    // Close viewers dialog and story viewer cleanly before next test
    await alicePage.keyboard.press('Escape');
    await expect(viewersDialog).not.toBeVisible();
    const closeBtn = alicePage.getByTestId('close-story-viewer-btn');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
    await expect(viewer).not.toBeVisible();
  });

  test('5. Delete own story -> disappears', async () => {
    const ownTile = alicePage.getByTestId('story-tile-mine');
    await ownTile.getByRole('button', { name: 'View your story' }).click();

    const viewer = alicePage.getByTestId('story-viewer-modal');
    await expect(viewer).toBeVisible();

    await alicePage.getByTestId('delete-story-btn').click();
    await alicePage.getByTestId('confirm-delete-story-btn').click();

    await expect(viewer).not.toBeVisible({ timeout: 10000 });
    await expect(ownTile).toHaveAttribute('data-ring', 'empty', { timeout: 10000 });
  });
});
