import { BoardSnapshot, BoardState, SiteSettings, UserAccount } from '../types';

const TOKEN_KEY = 'arrange_cloud_session_v1';
export type CloudResult<T> = { ok: true; data: T } | { ok: false; unavailable: boolean; message: string };
export interface CloudPayload {
  configured: true;
  token?: string;
  user: UserAccount;
  users: UserAccount[];
  state?: BoardState;
  snapshots?: BoardSnapshot[];
  settings?: SiteSettings;
  updatedAt?: string;
}

export const getCloudToken = () => localStorage.getItem(TOKEN_KEY);
export const setCloudToken = (token: string | null) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

async function request<T>(body: unknown, token?: string | null, headers?: Record<string, string>): Promise<CloudResult<T>> {
  try {
    const response = await fetch('/api/cloud', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: JSON.stringify(body)
    });
    if (!(response.headers.get('content-type') || '').includes('application/json')) {
      return { ok: false, unavailable: true, message: '클라우드 API가 이 서버에 연결되지 않았습니다.' };
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, unavailable: response.status === 404 || response.status === 503, message: data.message || '클라우드 요청에 실패했습니다.' };
    return { ok: true, data };
  } catch {
    return { ok: false, unavailable: true, message: '클라우드 서버에 연결할 수 없습니다.' };
  }
}

export const loginCloud = (loginId: string, password: string) => request<CloudPayload>({ action: 'login', loginId, password });
export const loadCloud = (token: string) => request<CloudPayload>({ action: 'load' }, token);
export const saveCloud = (token: string, state: BoardState, snapshots: BoardSnapshot[], settings: SiteSettings) => request<{ ok: true; updatedAt: string }>({ action: 'save', state, snapshots, settings }, token);
export const updateCloudAccount = (token: string, currentPassword: string, patch: Partial<UserAccount>) => request<{ user: UserAccount; users: UserAccount[] }>({ action: 'updateAccount', currentPassword, patch }, token);
export const createCloudUser = (token: string, user: Omit<UserAccount, 'id'>) => request<{ user: UserAccount; users: UserAccount[] }>({ action: 'createUser', user }, token);
export const resetCloudUserPassword = (token: string, userId: string, newPassword: string) => request<{ users: UserAccount[] }>({ action: 'resetUserPassword', userId, newPassword }, token);
export const deleteCloudUser = (token: string, userId: string) => request<{ users: UserAccount[] }>({ action: 'deleteUser', userId }, token);
