import { test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { createTestMp4Buffer } from './fixtures/sample-mp4';

test.describe.serial('Saves & Share Tracking E2E (Stage V4-3)', () => {
  const password = 'SecurePassword123!';
  const aliceEmail = 'e2e_alice_reels@nebron.com';
  const bobEmail = 'e2e_bob_reels@nebron.com';

  let bobContext: BrowserContext;
  let bobPage: Page;

  let aliceToken = '';
  let bobToken = '';
  let aliceUserId = '';
  let postId = '';
  let commentId = '';
  let reelId = '';

  const sampleMp4 = createTestMp4Buffer(6, 0x81);

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

  test.beforeAll(async ({ browser, request }) => {
    const alice = await ensureUserAndToken(request, aliceEmail);
    aliceToken = alice.token;
    aliceUserId = alice.profile.userId;

    const bob = await ensureUserAndToken(request, bobEmail);
    bobToken = bob.token;

    await request.post(`http://localhost:4002/users/${aliceUserId}/follow`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });

    const uniqueBody = `V4-3 E2E Post ${Date.now()}`;
    const postRes = await request.post('http://localhost:4002/posts', {
      headers: { Authorization: `Bearer ${aliceToken}` },
      data: { body: uniqueBody },
    });
    expect(postRes.status()).toBe(201);
    const createdPost = await postRes.json();
    postId = createdPost.id;

    const commentRes = await request.post(`http://localhost:4002/posts/${postId}/comments`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
      data: { body: `V4-3 E2E Comment ${Date.now()}` },
    });
    expect(commentRes.status()).toBe(201);
    commentId = (await commentRes.json()).id;

    const existingReelsRes = await request.get('http://localhost:4002/users/me/reels?limit=1', {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    const existingReels = existingReelsRes.ok() ? (await existingReelsRes.json()).items : [];
    if (existingReels && existingReels.length > 0) {
      reelId = existingReels[0].id;
    } else {
      const urlRes = await request.post('http://localhost:4002/reels/upload-url', {
        headers: { Authorization: `Bearer ${aliceToken}` },
        data: { contentType: 'video/mp4', contentLength: sampleMp4.length },
      });
      expect(urlRes.ok()).toBeTruthy();
      const slot = await urlRes.json();
      const uploadUrl = String(slot.uploadUrl).replace('://minio:9000', '://localhost:9000');
      const s3Res = await request.post(uploadUrl, {
        multipart: {
          ...slot.fields,
          file: { name: 'v43-reel.mp4', mimeType: 'video/mp4', buffer: sampleMp4 },
        },
      });
      expect(s3Res.status()).toBeLessThan(300);

      const confirmRes = await request.post('http://localhost:4002/reels/confirm', {
        headers: { Authorization: `Bearer ${aliceToken}` },
        data: { videoKey: slot.objectKey, caption: `V4-3 E2E Reel ${Date.now()}`, duration: 6 },
      });
      expect(confirmRes.status()).toBe(201);
      reelId = (await confirmRes.json()).id;
    }

    // Ensure clean unsave state before starting
    await request.delete(`http://localhost:4002/reels/${reelId}/save`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });

    bobContext = await browser.newContext();
    bobPage = await bobContext.newPage();
    await bobPage.goto('/login');
    await bobPage.locator('input[type="email"]').fill(bobEmail);
    await bobPage.locator('input[type="password"]').fill(password);
    await bobPage.getByRole('button', { name: /sign in/i }).click();
    await bobPage.waitForURL('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  });

  test.afterAll(async () => {
    if (bobContext) await bobContext.close();
  });

  test('1. Sidebar has Saved link between Reels and Explore', async () => {
    const navLinks = await bobPage.locator('aside nav a').allTextContents();
    const reelsIdx = navLinks.findIndex((t) => t.trim() === 'Reels');
    const savedIdx = navLinks.findIndex((t) => t.trim() === 'Saved');
    const exploreIdx = navLinks.findIndex((t) => t.trim() === 'Explore');

    expect(reelsIdx).toBeGreaterThanOrEqual(0);
    expect(savedIdx).toBe(reelsIdx + 1);
    expect(exploreIdx).toBe(savedIdx + 1);
  });

  test('2. Save post, open Share sheet, copy canonical URL, and see counters increment', async () => {
    const saveBtn = bobPage.getByTestId(`post-save-btn-${postId}`);
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await expect(bobPage.getByTestId(`post-save-count-${postId}`)).toHaveText('1');

    const shareBtn = bobPage.getByTestId(`post-share-btn-${postId}`);
    await shareBtn.click();

    const dialog = bobPage.getByTestId('share-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('share-whatsapp-link')).toHaveAttribute('href', /wa\.me/);
    await expect(dialog.getByTestId('share-telegram-link')).toHaveAttribute('href', /t\.me\/share/);
    await expect(dialog.getByTestId('share-twitter-link')).toHaveAttribute('href', /twitter\.com\/intent/);

    await dialog.getByTestId('share-copy-link-btn').click();
    await expect(dialog.getByTestId('share-copy-link-btn')).toContainText('Copied');

    const linkValue = await dialog.getByTestId('share-link-input').inputValue();
    expect(linkValue).toMatch(new RegExp(`/posts/${postId}$`));

    await dialog.getByRole('button', { name: 'Close' }).first().click();
    await expect(dialog).toBeHidden();
    await expect(bobPage.getByTestId(`post-share-count-${postId}`)).toHaveText('1');
  });

  test('3. Save comment on post detail and save reel on reel detail', async () => {
    await bobPage.goto(`/posts/${postId}`);
    const commentSaveBtn = bobPage.getByTestId(`comment-save-btn-${commentId}`);
    await expect(commentSaveBtn).toBeVisible();
    await commentSaveBtn.click();
    await expect(bobPage.getByTestId(`comment-save-count-${commentId}`)).toHaveText('1');

    await bobPage.goto(`/reels/${reelId}`);
    const reelCard = bobPage.getByTestId(`reel-card-${reelId}`);
    const reelSaveBtn = reelCard.getByTestId('reel-save-btn');
    await expect(reelSaveBtn).toBeVisible();
    await reelSaveBtn.click();
    await expect(reelCard.getByTestId('reel-save-count')).toHaveText('1');
  });

  test('4. /saved page lists Posts, Reels, Comments and supports inline unsave', async () => {
    await bobPage.getByRole('link', { name: 'Saved', exact: true }).click();
    await bobPage.waitForURL('http://localhost:3000/saved');

    // Posts tab active by default
    await expect(bobPage.getByTestId(`post-save-btn-${postId}`)).toBeVisible();

    // Switch to Reels tab and unsave inline
    await bobPage.getByTestId('saved-tab-reels').click();
    await expect(bobPage.getByTestId(`saved-reel-card-${reelId}`)).toBeVisible();
    await bobPage.getByTestId(`unsave-reel-${reelId}`).click();
    await expect(bobPage.getByTestId(`saved-reel-card-${reelId}`)).toBeHidden();

    // Switch to Comments tab and unsave inline
    await bobPage.getByTestId('saved-tab-comments').click();
    await expect(bobPage.getByTestId(`saved-comment-card-${commentId}`)).toBeVisible();
    await bobPage.getByTestId(`unsave-comment-${commentId}`).click();
    await expect(bobPage.getByTestId(`saved-comment-card-${commentId}`)).toBeHidden();

    // Switch back to Posts tab and unsave inline
    await bobPage.getByTestId('saved-tab-posts').click();
    await expect(bobPage.getByTestId(`post-save-btn-${postId}`)).toBeVisible();
    await bobPage.getByTestId(`post-save-btn-${postId}`).click();
    await expect(bobPage.getByTestId(`post-save-btn-${postId}`)).toBeHidden();
  });
});
