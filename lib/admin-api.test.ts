import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminApi } from './admin-api';
import * as apiModule from './api';

describe('Admin API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('createReport calls POST /api/core/reports with body', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({
      reportId: 'rep-1',
      status: 'pending',
    });

    const res = await adminApi.createReport({
      targetType: 'post',
      targetId: 'p-1',
      reason: 'spam',
      details: 'Spam description',
    });

    expect(spy).toHaveBeenCalledWith('/api/core/reports', {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'post',
        targetId: 'p-1',
        reason: 'spam',
        details: 'Spam description',
      }),
    });
    expect(res).toEqual({ reportId: 'rep-1', status: 'pending' });
  });

  it('getStats calls GET /api/core/admin/stats', async () => {
    const mockStats = {
      users: { total: 100, activeToday: 20, banned: 2 },
      posts: { total: 50, today: 5 },
      reports: { pending: 3, resolvedToday: 1 },
      messages: { today: 400 },
      calls: { today: 12 },
    };
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockStats);

    const res = await adminApi.getStats();
    expect(spy).toHaveBeenCalledWith('/api/core/admin/stats');
    expect(res).toEqual(mockStats);
  });

  it('getReports formats query params correctly', async () => {
    const mockReports = { reports: [], nextCursor: null };
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce(mockReports);

    await adminApi.getReports({ status: 'pending', targetType: 'post', limit: 25 });
    expect(spy).toHaveBeenCalledWith(
      '/api/core/admin/reports?status=pending&targetType=post&limit=25'
    );
  });

  it('resolveReport calls POST /api/core/admin/reports/:id/resolve', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ report: { id: 'rep-1' } });

    await adminApi.resolveReport('rep-1', 'delete_post', 'Policy violation');
    expect(spy).toHaveBeenCalledWith('/api/core/admin/reports/rep-1/resolve', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete_post', note: 'Policy violation' }),
    });
  });

  it('banUser calls POST /api/core/admin/users/:userId/ban', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ success: true });

    await adminApi.banUser('usr-99', 'Repeated offenses');
    expect(spy).toHaveBeenCalledWith('/api/core/admin/users/usr-99/ban', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Repeated offenses' }),
    });
  });

  it('unbanUser calls POST /api/core/admin/users/:userId/unban', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ success: true });

    await adminApi.unbanUser('usr-99');
    expect(spy).toHaveBeenCalledWith('/api/core/admin/users/usr-99/unban', {
      method: 'POST',
    });
  });

  it('promoteUser calls POST /api/core/admin/users/:userId/promote', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ success: true });

    await adminApi.promoteUser('usr-99');
    expect(spy).toHaveBeenCalledWith('/api/core/admin/users/usr-99/promote', {
      method: 'POST',
    });
  });

  it('demoteUser calls POST /api/core/admin/users/:userId/demote', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ success: true });

    await adminApi.demoteUser('usr-99');
    expect(spy).toHaveBeenCalledWith('/api/core/admin/users/usr-99/demote', {
      method: 'POST',
    });
  });

  it('deletePost calls DELETE /api/core/admin/posts/:postId', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ success: true });

    await adminApi.deletePost('post-88');
    expect(spy).toHaveBeenCalledWith('/api/core/admin/posts/post-88', {
      method: 'DELETE',
    });
  });

  it('deleteMessage calls DELETE /api/core/admin/messages/:convId/:msgId', async () => {
    const spy = vi.spyOn(apiModule, 'apiFetch').mockResolvedValueOnce({ success: true });

    await adminApi.deleteMessage('conv-1', 'msg-2');
    expect(spy).toHaveBeenCalledWith('/api/core/admin/messages/conv-1/msg-2', {
      method: 'DELETE',
    });
  });
});
