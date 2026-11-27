import { test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

test.describe.serial('Explore, Trending, Search & Profile Stats E2E (Stage V4-6)', () => {
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
  let aliceUsername = '';
  let uniqueKeyword = '';
  let uniquePostId = '';

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
    aliceContext = await browser.newContext();
    alicePage = await aliceContext.newPage();
    const alice = await signInViaUiWithToken(alicePage, request, aliceEmail);
    aliceToken = alice.token;
    aliceUserId = alice.profile.userId;
    aliceUsername = alice.profile.username;

    bobContext = await browser.newContext();
    bobPage = await bobContext.newPage();
    const bob = await signInViaUiWithToken(bobPage, request, bobEmail);
    bobToken = bob.token;

    // Seed a searchable post with hashtag + unique keyword for Alice
    uniqueKeyword = `NebronPulse${Date.now()}`;
    const postRes = await request.post('http://localhost:4002/posts', {
      headers: { Authorization: `Bearer ${aliceToken}` },
      data: { body: `${uniqueKeyword} exploring trending #nebronv4` },
    });
    expect(postRes.status()).toBe(201);
    uniquePostId = (await postRes.json()).id;

    // Give Alice's post a reaction from Alice or wait — let's ensure trending has engagement too
    await request.post(`http://localhost:4002/posts/${uniquePostId}/like`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
  });

  test.afterAll(async () => {
    if (aliceContext) await aliceContext.close();
    if (bobContext) await bobContext.close();
  });

  test('1. Explore page loads all tabs (For you, Trending, People, Hashtags) and profile shows stats row', async () => {
    await bobPage.goto('/explore');
    await expect(bobPage.getByTestId('explore-tabs')).toBeVisible();
    await expect(bobPage.getByTestId('explore-panel-for-you')).toBeVisible();

    await bobPage.getByTestId('explore-tab-trending').click();
    await expect(bobPage.getByTestId('explore-panel-trending')).toBeVisible();
    await bobPage.getByTestId('trending-type-reels').click();
    await expect(bobPage.getByTestId('trending-type-reels')).toBeVisible();
    await bobPage.getByTestId('trending-period-24h').click();
    await expect(bobPage.getByTestId('trending-period-24h')).toBeVisible();

    await bobPage.getByTestId('explore-tab-people').click();
    await expect(bobPage.getByTestId('explore-panel-people')).toBeVisible();

    await bobPage.getByTestId('explore-tab-hashtags').click();
    await expect(bobPage.getByTestId('explore-panel-hashtags')).toBeVisible();
    await expect(bobPage.getByTestId('explore-trending-hashtags')).toContainText('#nebronv4');

    // Verify public profile stats row and own profile stats row
    await bobPage.goto(`/${aliceUsername}`);
    await expect(bobPage.getByTestId('profile-stats-row')).toBeVisible();
    await expect(bobPage.getByTestId('profile-stat-posts')).toBeVisible();
    await expect(bobPage.getByTestId('profile-stat-reels')).toBeVisible();
    await expect(bobPage.getByTestId('profile-stat-likes')).toBeVisible();

    await alicePage.goto('/profile');
    await expect(alicePage.getByTestId('profile-stats-row')).toBeVisible();
    await expect(alicePage.getByTestId('profile-stat-likes')).toBeVisible();
  });

  test('2. Follow from explore People/Search and see creator post appear in Home feed', async () => {
    // Ensure Bob is unfollowed from Alice first so Alice appears as suggestion / unfollowed in search
    await bobPage.request.delete(`http://localhost:4002/users/${aliceUserId}/follow`, {
      headers: { Authorization: `Bearer ${bobToken}` },
    });

    await bobPage.goto('/explore');
    await bobPage.getByTestId('explore-tab-people').click();
    const personCard = bobPage.getByTestId(`explore-person-card-${aliceUserId}`);
    await personCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    const followReqPromise = bobPage.waitForResponse(
      (res) =>
        res.url().includes(`/api/core/users/${aliceUserId}/follow`) &&
        res.request().method() === 'POST'
    );

    if (await personCard.isVisible()) {
      await personCard.getByRole('button', { name: /follow/i }).click();
    } else {
      // Fallback: search Alice by username on Explore
      await bobPage.getByTestId('explore-search-input').fill(aliceUsername);
      const searchFollowBtn = bobPage.getByTestId('explore-search-results').getByRole('button', { name: /follow/i }).first();
      await expect(searchFollowBtn).toBeVisible();
      await searchFollowBtn.click();
    }

    const followRes = await followReqPromise;
    expect(followRes.status()).toBe(204);

    // Navigate to home feed via SPA link and verify Alice's post appears
    await bobPage.getByRole('navigation').getByRole('link', { name: 'Home' }).click();
    await bobPage.waitForURL('http://localhost:3000/');
    await expect(bobPage.locator('main')).toContainText(uniqueKeyword);
  });

  test('3. Search posts by keyword in Explore and Cmd+K SearchDialog returns matching posts', async () => {
    // Test Explore inline post search
    await bobPage.goto('/explore');
    await bobPage.getByTestId('explore-search-input').fill(uniqueKeyword);
    await expect(bobPage.getByTestId('explore-search-results')).toContainText(uniqueKeyword);

    // Test global Cmd+K SearchDialog Posts tab
    await bobPage.getByTestId('explore-search-input').clear();
    await bobPage.getByRole('button', { name: /search/i }).first().click();
    await expect(bobPage.getByTestId('search-tab-posts')).toBeVisible();
    await expect(bobPage.getByTestId('search-tab-reels')).toBeVisible();
    await expect(bobPage.getByTestId('search-tab-people')).toBeVisible();
    await expect(bobPage.getByTestId('search-tab-hashtags')).toBeVisible();

    await bobPage.getByTestId('search-tab-posts').click();
    await bobPage.getByTestId('global-search-input').fill(uniqueKeyword);
    await expect(bobPage.getByTestId('search-posts-results')).toContainText(uniqueKeyword);
  });
});
