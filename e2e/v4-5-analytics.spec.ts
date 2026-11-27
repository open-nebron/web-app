import { test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { createTestMp4Buffer } from './fixtures/sample-mp4';

test.describe.serial('Creator Analytics Dashboard E2E (Stage V4-5)', () => {
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
  let bobUserId = '';
  let postId = '';
  let reelId = '';

  const sampleMp4 = createTestMp4Buffer(6, 0x91);

  async function signInViaUiWithToken(
    page: Page,
    request: APIRequestContext,
    email: string
  ) {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);

    const loginPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/auth-cookie/login/cookie') && res.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /sign in/i }).click();
    let loginRes = await loginPromise;

    if (!loginRes.ok() && loginRes.status() === 401) {
      const regRes = await request.post('http://localhost:4001/auth/register', {
        data: { email, password },
      });
      expect(regRes.ok()).toBeTruthy();
      const retryPromise = page.waitForResponse(
        (res) =>
          res.url().includes('/api/auth-cookie/login/cookie') && res.request().method() === 'POST'
      );
      await page.getByRole('button', { name: /sign in/i }).click();
      loginRes = await retryPromise;
    }

    expect(loginRes.ok()).toBeTruthy();
    const { accessToken } = await loginRes.json();
    await page.waitForURL('http://localhost:3000/', { waitUntil: 'domcontentloaded' });

    const meRes = await request.get('http://localhost:4002/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.ok()).toBeTruthy();
    const profile = await meRes.json();
    return { token: accessToken as string, profile };
  }

  test.beforeAll(async ({ browser, request }) => {
    // Open Alice & Bob browser sessions with a single login per user
    aliceContext = await browser.newContext();
    alicePage = await aliceContext.newPage();
    const alice = await signInViaUiWithToken(alicePage, request, aliceEmail);
    aliceToken = alice.token;
    aliceUserId = alice.profile.userId;

    bobContext = await browser.newContext();
    bobPage = await bobContext.newPage();
    const bob = await signInViaUiWithToken(bobPage, request, bobEmail);
    bobToken = bob.token;
    bobUserId = bob.profile.userId;

    // Seed a fresh post from Alice
    const postRes = await request.post('http://localhost:4002/posts', {
      headers: { Authorization: `Bearer ${aliceToken}` },
      data: { body: `V4-5 Analytics E2E Post ${Date.now()}` },
    });
    expect(postRes.status()).toBe(201);
    postId = (await postRes.json()).id;

    // Seed a fresh reel from Alice
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
        file: { name: 'v45-reel.mp4', mimeType: 'video/mp4', buffer: sampleMp4 },
      },
    });
    expect(s3Res.status()).toBeLessThan(300);

    const confirmRes = await request.post('http://localhost:4002/reels/confirm', {
      headers: { Authorization: `Bearer ${aliceToken}` },
      data: { videoKey: slot.objectKey, caption: `V4-5 Analytics Reel ${Date.now()}`, duration: 6 },
    });
    expect(confirmRes.status()).toBe(201);
    reelId = (await confirmRes.json()).id;
  });

  test.afterAll(async () => {
    if (aliceContext) await aliceContext.close();
    if (bobContext) await bobContext.close();
  });

  test('1. Viewing a reel records view beacons and surfaces 1+ view in /analytics/reels', async () => {
    const viewStartPromise = bobPage.waitForResponse(
      (res) => res.url().includes('/api/core/analytics/view-start') && res.request().method() === 'POST'
    );
    await bobPage.goto(`/reels/${reelId}`);
    const startRes = await viewStartPromise;
    expect(startRes.status()).toBe(201);

    // Stay briefly then click SPA Explore link to unmount ReelCard and flush view-end
    await bobPage.waitForTimeout(400);
    const viewEndPromise = bobPage.waitForResponse(
      (res) => res.url().includes('/api/core/analytics/view-end') && res.request().method() === 'POST'
    );
    await bobPage.getByRole('link', { name: 'Explore' }).click();
    const endRes = await viewEndPromise;
    expect(endRes.status()).toBe(204);

    // Creator checks Creator Studio -> Reels
    await alicePage.getByRole('link', { name: 'Creator Studio' }).click();
    await alicePage.waitForURL('**/analytics');
    await alicePage
      .getByRole('navigation', { name: 'Creator Studio sections' })
      .getByRole('link', { name: 'Reels' })
      .click();
    await alicePage.waitForURL('**/analytics/reels');

    const row = alicePage.getByTestId(`analytics-reel-row-${reelId}`);
    await expect(row).toBeVisible();
    // Views cell (second column) >= 1
    const viewsText = await row.locator('td').nth(1).textContent();
    expect(Number(viewsText?.trim())).toBeGreaterThanOrEqual(1);
  });

  test('2. Saving a post updates overview saves count and /analytics UI', async () => {
    // Ensure not currently saved by Bob
    await bobPage.request
      .delete(`http://localhost:4002/posts/${postId}/save`, {
        headers: { Authorization: `Bearer ${bobToken}` },
      })
      .catch(() => {});

    const ovBeforeRes = await alicePage.request.get(
      'http://localhost:4002/analytics/me/overview?period=30d',
      { headers: { Authorization: `Bearer ${aliceToken}` } }
    );
    expect(ovBeforeRes.ok()).toBeTruthy();
    const ovBefore = await ovBeforeRes.json();

    await bobPage.goto(`/posts/${postId}`);
    const saveBtn = bobPage.getByTestId(`post-save-btn-${postId}`);
    await expect(saveBtn).toBeVisible();
    const saveApiPromise = bobPage.waitForResponse(
      (res) => res.url().includes(`/api/core/posts/${postId}/save`) && res.request().method() === 'POST'
    );
    await saveBtn.click();
    expect((await saveApiPromise).status()).toBe(204);

    const ovAfterRes = await alicePage.request.get(
      'http://localhost:4002/analytics/me/overview?period=30d',
      { headers: { Authorization: `Bearer ${aliceToken}` } }
    );
    expect(ovAfterRes.ok()).toBeTruthy();
    const ovAfter = await ovAfterRes.json();
    expect(ovAfter.engagement.saves).toBeGreaterThanOrEqual(ovBefore.engagement.saves + 1);
    expect(ovAfter.engagement.saves).toBeGreaterThanOrEqual(1);

    await alicePage.goto('/analytics');
    await expect(alicePage.getByTestId('overview-saves-count')).toBeVisible();
    const uiSaves = Number((await alicePage.getByTestId('overview-saves-count').textContent())?.trim());
    expect(uiSaves).toBeGreaterThanOrEqual(1);
  });

  test('3. Following a creator with X-Follow-Source: feed attributes follower gain and shows feed source', async () => {
    // Ensure Bob is currently not following Alice so this follow transition records follower gain + source
    await bobPage.request.delete(`http://localhost:4002/users/${aliceUserId}/follow`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });
    expect(bobUserId).toBeTruthy();

    const beforeOvRes = await alicePage.request.get(
      'http://localhost:4002/analytics/me/overview?period=30d',
      { headers: { Authorization: `Bearer ${aliceToken}` } }
    );
    const beforeGained = (await beforeOvRes.json()).followers.gained;

    const followRes = await bobPage.request.post(`http://localhost:4002/users/${aliceUserId}/follow`, {
      headers: {
        Authorization: `Bearer ${bobToken}`,
        'X-Follow-Source': 'feed',
      },
    });
    expect(followRes.status()).toBe(204);

    const afterOvRes = await alicePage.request.get(
      'http://localhost:4002/analytics/me/overview?period=30d',
      { headers: { Authorization: `Bearer ${aliceToken}` } }
    );
    const afterGained = (await afterOvRes.json()).followers.gained;
    expect(afterGained).toBeGreaterThanOrEqual(beforeGained + 1);

    await alicePage.goto('/analytics/audience');
    const sourcesList = alicePage.getByTestId('audience-follow-sources-list');
    await expect(sourcesList).toBeVisible();
    await expect(sourcesList).toContainText(/feed/i);
  });

  test('4. Recharts SVG charts and 7x24 heatmap render cleanly across dashboard pages', async () => {
    const pageErrors: string[] = [];
    alicePage.on('pageerror', (err) => pageErrors.push(err.message));

    await alicePage.goto('/analytics');
    await expect(alicePage.getByTestId('stat-card-followers')).toBeVisible();
    await expect(alicePage.getByTestId('stat-card-reach')).toBeVisible();
    await expect(alicePage.getByTestId('stat-card-engagement')).toBeVisible();
    await expect(alicePage.getByTestId('stat-card-profile-visits')).toBeVisible();
    await expect(alicePage.getByTestId('analytics-heatmap')).toBeVisible();

    await expect(
      alicePage.getByTestId('chart-follower-growth').locator('svg.recharts-surface').first()
    ).toBeVisible();
    await expect(
      alicePage.getByTestId('chart-engagement-by-day').locator('svg.recharts-surface').first()
    ).toBeVisible();

    // Switch period selector to 7d and back to 30d
    await alicePage.getByTestId('period-btn-7d').click();
    await expect(alicePage.getByTestId('period-btn-7d')).toHaveAttribute('aria-pressed', 'true');

    await alicePage.goto('/analytics/audience');
    await expect(
      alicePage.getByTestId('audience-growth-chart').locator('svg.recharts-surface').first()
    ).toBeVisible();
    await expect(
      alicePage.getByTestId('audience-active-hours-chart').locator('svg.recharts-surface').first()
    ).toBeVisible();

    await alicePage.goto('/analytics/posts');
    await expect(alicePage.getByRole('heading', { name: 'Post Analytics' })).toBeVisible();

    await alicePage.goto('/analytics/stories');
    await expect(alicePage.getByRole('heading', { name: 'Story Analytics' })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('5. Time-series API shape and deep-dive detail pages render accurately', async () => {
    const [post7Res, post30Res, reel30Res] = await Promise.all([
      alicePage.request.get(`http://localhost:4002/analytics/me/content/post/${postId}?period=7d`, {
        headers: { Authorization: `Bearer ${aliceToken}` },
      }),
      alicePage.request.get(`http://localhost:4002/analytics/me/content/post/${postId}?period=30d`, {
        headers: { Authorization: `Bearer ${aliceToken}` },
      }),
      alicePage.request.get(`http://localhost:4002/analytics/me/content/reel/${reelId}?period=30d`, {
        headers: { Authorization: `Bearer ${aliceToken}` },
      }),
    ]);

    expect(post7Res.status()).toBe(200);
    expect(post30Res.status()).toBe(200);
    expect(reel30Res.status()).toBe(200);

    const p7 = await post7Res.json();
    const p30 = await post30Res.json();
    const r30 = await reel30Res.json();

    expect(p7.series.length).toBe(7);
    expect(p30.series.length).toBe(30);
    expect(r30.series.length).toBe(30);
    expect(Array.isArray(r30.watchThroughBuckets)).toBe(true);
    expect(r30.watchThroughBuckets.length).toBe(10);
    expect(p7.series[0]).toMatchObject({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      impressions: expect.any(Number),
      reach: expect.any(Number),
      likes: expect.any(Number),
      saves: expect.any(Number),
    });

    // Deep dive detail routes render Recharts cleanly
    await alicePage.goto(`/analytics/posts/${postId}`);
    await expect(
      alicePage.getByTestId('post-detail-timeseries-chart').locator('svg.recharts-surface').first()
    ).toBeVisible();

    await alicePage.goto(`/analytics/reels/${reelId}`);
    await expect(
      alicePage.getByTestId('reel-watch-through-chart').locator('svg.recharts-surface').first()
    ).toBeVisible();
    await expect(
      alicePage.getByTestId('reel-detail-timeseries-chart').locator('svg.recharts-surface').first()
    ).toBeVisible();
  });
});
