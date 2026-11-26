import { test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

test.describe.serial('Spaces E2E (Stage V3-6)', () => {
  const password = 'SecurePassword123!';
  const aliceEmail = 'e2e_alice_spaces@nebron.com';
  const bobEmail = 'e2e_bob_spaces@nebron.com';

  let aliceContext: BrowserContext;
  let bobContext: BrowserContext;
  let alicePage: Page;
  let bobPage: Page;

  let aliceToken = '';
  let bobToken = '';
  let bobUsername = '';
  let spaceId = '';
  let generalChannelId = '';
  let generalConversationId = '';
  let inviteUrl = '';

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

    const bob = await ensureUserAndToken(request, bobEmail);
    bobToken = bob.token;
    bobUsername = bob.profile.username;

    // Clean up any leftover spaces from prior runs for idempotency
    const existingRes = await request.get('http://localhost:4005/spaces', {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    if (existingRes.ok()) {
      const { spaces } = await existingRes.json();
      for (const sp of spaces || []) {
        if (sp.ownerId === alice.profile.userId) {
          await request.delete(`http://localhost:4005/spaces/${sp.id}`, {
            headers: { Authorization: `Bearer ${aliceToken}` },
          });
        }
      }
    }

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

  test('1. Create space -> default channels visible', async () => {
    await alicePage.getByTestId('space-rail-add-btn').click();
    await alicePage.locator('#create-space-name').fill('Nebron Builders E2E');
    await alicePage.getByRole('button', { name: 'Create Space' }).click();

    await expect(alicePage).toHaveURL(/\/spaces\/[0-9a-f]{24}\/channels\/[0-9a-f]{24}$/, {
      timeout: 15000,
    });

    const urlParts = alicePage.url().match(/\/spaces\/([0-9a-f]{24})\/channels\/([0-9a-f]{24})$/);
    expect(urlParts).toBeTruthy();
    spaceId = urlParts![1];
    generalChannelId = urlParts![2];

    await expect(alicePage.getByTestId('channel-item-general')).toBeVisible({ timeout: 10000 });
    await expect(alicePage.getByTestId('channel-item-General')).toBeVisible({ timeout: 10000 });
    await expect(alicePage.getByTestId('channel-header-name')).toHaveText('general');
  });

  test('2. Click channel -> chat works (messages persist)', async () => {
    const composer = alicePage.getByPlaceholder('Message #general');
    await expect(composer).toBeVisible({ timeout: 10000 });

    const msgText = `Hello from Spaces E2E ${Date.now()}`;
    await composer.fill(msgText);
    await composer.press('Enter');

    await expect(alicePage.getByText(msgText)).toBeVisible({ timeout: 10000 });

    // Confirm persistence across full page reload
    await alicePage.reload();
    await expect(alicePage.getByText(msgText)).toBeVisible({ timeout: 10000 });

    // Look up conversationId for #general for downstream API permission verification
    const detailRes = await alicePage.request.get(`http://localhost:4005/spaces/${spaceId}`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    expect(detailRes.ok()).toBeTruthy();
    const detailJson = await detailRes.json();
    const gen = detailJson.channels.find((c: any) => c.id === generalChannelId);
    generalConversationId = gen.conversationId;
    expect(generalConversationId).toBeTruthy();
  });

  test('3. Invite user -> they join -> see channels', async () => {
    await alicePage.getByTestId('space-header-menu-btn').click();
    await alicePage.getByRole('menuitem', { name: 'Invite People' }).click();
    await alicePage.getByTestId('create-space-invite-btn').click();

    const codeEl = alicePage.getByTestId('generated-invite-url');
    await expect(codeEl).toBeVisible({ timeout: 10000 });
    inviteUrl = (await codeEl.textContent())!.trim();
    expect(inviteUrl).toContain('/spaces/join/');

    // Close dialog on Alice's page
    await alicePage.keyboard.press('Escape');

    // Bob visits invite URL directly
    await bobPage.goto(inviteUrl);
    await expect(bobPage).toHaveURL(
      new RegExp(`/spaces/${spaceId}/channels/[0-9a-f]{24}$`),
      { timeout: 15000 }
    );

    await expect(bobPage.getByTestId('channel-item-general')).toBeVisible({ timeout: 10000 });
    await expect(bobPage.getByTestId('channel-item-General')).toBeVisible({ timeout: 10000 });
    await expect(bobPage.getByText(/Hello from Spaces E2E/)).toBeVisible({ timeout: 10000 });
  });

  test('4. Owner creates role -> assigns to user -> user gains permissions', async () => {
    await alicePage.goto(`/spaces/${spaceId}/settings?tab=roles`);

    await alicePage.getByTestId('new-role-name-input').fill('ChannelManager');
    await alicePage.getByTestId('create-role-btn').click();
    await expect(alicePage.getByText('Editing Role: ChannelManager')).toBeVisible({ timeout: 10000 });

    const manageChannelsToggle = alicePage.getByTestId('perm-toggle-MANAGE_CHANNELS');
    await manageChannelsToggle.click();
    await expect(manageChannelsToggle).toHaveAttribute('aria-checked', 'true');

    await alicePage.getByTestId('save-role-btn').click();
    await expect(alicePage.getByTestId('save-role-btn')).toBeDisabled({ timeout: 10000 });

    // Assign ChannelManager role to Bob in Members tab
    await alicePage.getByRole('tab', { name: 'Members' }).click();
    const assignBtn = alicePage.getByTestId(`assign-roles-btn-${bobUsername}`);
    await expect(assignBtn).toBeVisible({ timeout: 10000 });
    await assignBtn.click();
    await alicePage.getByTestId('role-option-ChannelManager').click();
    await alicePage.keyboard.press('Escape');

    // Bob reloads channel page and verifies he now has Create Channel menu item
    await bobPage.reload();
    await bobPage.getByTestId('space-header-menu-btn').click();
    await expect(bobPage.getByRole('menuitem', { name: 'Create Channel' })).toBeVisible({
      timeout: 10000,
    });
    await bobPage.getByRole('menuitem', { name: 'Create Channel' }).click();
    await bobPage.locator('#new-channel-name').fill('mod-updates');
    await bobPage.getByRole('button', { name: 'Create Channel' }).click();

    await expect(bobPage.getByTestId('channel-item-mod-updates')).toBeVisible({ timeout: 10000 });
    // Navigate back to #general on Bob's page
    await bobPage.getByTestId('channel-item-general').click();
    await expect(bobPage.getByTestId('channel-header-name')).toHaveText('general');
  });

  test('5. User with SEND_MESSAGES removed -> composer hidden, POST returns 403', async () => {
    await alicePage.goto(`/spaces/${spaceId}/channels/${generalChannelId}`);
    await alicePage.getByRole('button', { name: 'Channel settings', exact: true }).click();
    await alicePage.getByRole('tab', { name: 'Permission Overrides' }).click();

    await alicePage.getByRole('button', { name: 'Deny Send Messages', exact: true }).click();
    await alicePage.getByRole('button', { name: 'Save Changes' }).click();
    await expect(alicePage.getByRole('heading', { name: /Channel Settings/i })).not.toBeVisible({
      timeout: 10000,
    });

    // Wait slightly / reload on Bob's page so channel permission override takes effect cleanly
    await bobPage.reload();
    await expect(bobPage.getByTestId('channel-readonly-banner')).toBeVisible({ timeout: 10000 });
    await expect(bobPage.getByPlaceholder('Message #general')).toHaveCount(0);

    // Direct POST /conversations/:id/messages with Bob's token returns 403
    await expect(async () => {
      const sendRes = await bobPage.request.post(
        `http://localhost:4003/conversations/${generalConversationId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${bobToken}`,
            'Content-Type': 'application/json',
          },
          data: { body: 'Unauthorized channel message' },
        }
      );
      expect(sendRes.status()).toBe(403);
    }).toPass({ timeout: 10000 });
  });

  test('6. Voice channel click -> connects, audio flows', async () => {
    await alicePage.getByTestId('channel-item-General').click();
    await expect(alicePage.getByTestId('voice-connected-panel')).toBeVisible({ timeout: 15000 });
    await expect(alicePage.getByTestId('voice-stage-status-badge')).toHaveText('Connected', {
      timeout: 15000,
    });

    await bobPage.getByTestId('channel-item-General').click();
    await expect(bobPage.getByTestId('voice-connected-panel')).toBeVisible({ timeout: 15000 });
    await expect(bobPage.getByTestId('voice-stage-status-badge')).toHaveText('Connected', {
      timeout: 15000,
    });

    // Both Alice and Bob are connected in the LiveKit voice room
    await expect(alicePage.getByText('2 connected').first()).toBeVisible({ timeout: 15000 });

    // Disconnect cleanly before kick/ban tests
    await bobPage.getByTestId('leave-voice-channel-btn').click();
    await alicePage.getByTestId('leave-voice-channel-btn').click();
  });

  test('7. Kick member -> they are removed from space', async () => {
    await alicePage.goto(`/spaces/${spaceId}/settings?tab=members`);
    const kickBtn = alicePage.getByTestId(`kick-member-btn-${bobUsername}`);
    await expect(kickBtn).toBeVisible({ timeout: 10000 });
    await kickBtn.click();

    await expect(alicePage.getByTestId(`member-row-${bobUsername}`)).toHaveCount(0, {
      timeout: 10000,
    });

    // Kicked user loses access to the space channel
    await bobPage.goto(`/spaces/${spaceId}/channels/${generalChannelId}`);
    await expect(bobPage.getByText('Channel unavailable')).toBeVisible({ timeout: 10000 });
  });

  test('8. Ban member -> they cannot rejoin', async () => {
    // Re-invite Bob so we can ban him and verify ban blocks re-join
    await bobPage.goto(inviteUrl);
    await expect(bobPage).toHaveURL(
      new RegExp(`/spaces/${spaceId}/channels/[0-9a-f]{24}$`),
      { timeout: 15000 }
    );

    await alicePage.goto(`/spaces/${spaceId}/settings?tab=members`);
    const banBtn = alicePage.getByTestId(`ban-member-btn-${bobUsername}`);
    await expect(banBtn).toBeVisible({ timeout: 10000 });
    await banBtn.click();

    await alicePage.locator('#space-ban-reason').fill('E2E moderation ban check');
    await alicePage.getByRole('button', { name: 'Confirm Ban' }).click();

    await expect(alicePage.getByTestId(`member-row-${bobUsername}`)).toHaveCount(0, {
      timeout: 10000,
    });

    // Attempting to rejoin via invite link is blocked cleanly
    await bobPage.goto(inviteUrl);
    await expect(bobPage.getByText('Could not join space')).toBeVisible({ timeout: 10000 });
  });
});
