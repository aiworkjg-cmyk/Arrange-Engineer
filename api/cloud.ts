import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { Redis } from '@upstash/redis';

type Role = '대표' | '현장소장' | '시공반장' | '작업자' | '게스트';
interface CloudUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatarColor: string;
  department?: string;
  loginId: string;
  isMaster?: boolean;
  isAdmin?: boolean;
  passwordHash: string;
  passwordSalt: string;
}
interface AccountData {
  state?: unknown;
  snapshots?: unknown[];
  settings?: unknown;
  updatedAt?: string;
}

const USERS_KEY = 'arrange:users:v1';
const DATA_PREFIX = 'arrange:data:v1:';
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;
const MAX_SAVE_BYTES = 8 * 1024 * 1024;

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const sessionSecret = process.env.CLOUD_SESSION_SECRET || '';
const initialMasterId = process.env.MASTER_LOGIN_ID || '';
const initialMasterPassword = process.env.MASTER_PASSWORD || '';
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const missingConfig = () => [
  !redis && 'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN',
  !sessionSecret && 'CLOUD_SESSION_SECRET',
  !initialMasterId && 'MASTER_LOGIN_ID',
  initialMasterPassword.length < 8 && 'MASTER_PASSWORD (8자 이상)',
  !process.env.MASTER_RESET_KEY && 'MASTER_RESET_KEY'
].filter(Boolean);

const passwordDigest = (password: string, salt: string) => scryptSync(password, salt, 64).toString('hex');
const passwordRecord = (password: string) => {
  const passwordSalt = randomBytes(16).toString('hex');
  return { passwordSalt, passwordHash: passwordDigest(password, passwordSalt) };
};
const passwordMatches = (user: CloudUser, password: string) => {
  const actual = Buffer.from(passwordDigest(password, user.passwordSalt), 'hex');
  const expected = Buffer.from(user.passwordHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
const publicUser = ({ passwordHash: _hash, passwordSalt: _salt, ...user }: CloudUser) => user;
const canManageUsers = (user: CloudUser) => user.isMaster === true || user.isAdmin === true;

const sign = (value: string) => createHmac('sha256', sessionSecret).update(value).digest('base64url');
const createSession = (userId: string) => {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + SESSION_AGE_SECONDS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
};
const readSession = (token: string | undefined): string | null => {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string; exp?: number };
    return parsed.sub && parsed.exp && parsed.exp > Math.floor(Date.now() / 1000) ? parsed.sub : null;
  } catch {
    return null;
  }
};

async function ensureUsers(): Promise<CloudUser[]> {
  const existing = await redis!.get<CloudUser[]>(USERS_KEY);
  if (Array.isArray(existing) && existing.length) return existing;
  const master: CloudUser = {
    id: 'u-admin', name: '마스터 관리자', email: `${initialMasterId}@cloud.local`, role: '대표',
    avatarColor: '#1d4ed8', department: '관리', loginId: initialMasterId, isMaster: true,
    ...passwordRecord(initialMasterPassword)
  };
  await redis!.set(USERS_KEY, [master]);
  return [master];
}

const readBody = (req: any) => typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
const send = (res: any, status: number, body: unknown) => res.status(status).json(body);

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return send(res, 405, { message: 'POST 요청만 허용됩니다.' });
  let body: any;
  try { body = readBody(req); } catch { return send(res, 400, { message: '요청 형식이 올바르지 않습니다.' }); }

  const action = String(body.action || '');
  if (action === 'status') return send(res, 200, { configured: missingConfig().length === 0, missing: missingConfig() });
  if (missingConfig().length) return send(res, 503, { configured: false, message: '클라우드 저장 환경변수가 아직 설정되지 않았습니다.', missing: missingConfig() });

  try {
    let users = await ensureUsers();

    if (action === 'resetMaster') {
      const resetKey = String(req.headers['x-master-reset-key'] || '');
      if (!process.env.MASTER_RESET_KEY || resetKey !== process.env.MASTER_RESET_KEY) return send(res, 403, { message: '복구 키가 올바르지 않습니다.' });
      const newLoginId = String(body.newLoginId || '').trim();
      const newPassword = String(body.newPassword || '');
      if (newLoginId.length < 3 || newPassword.length < 8) return send(res, 400, { message: '새 아이디는 3자 이상, 비밀번호는 8자 이상이어야 합니다.' });
      const master = users.find((user) => user.isMaster);
      if (!master) return send(res, 404, { message: '마스터 계정을 찾지 못했습니다.' });
      if (users.some((user) => user.id !== master.id && user.loginId.toLowerCase() === newLoginId.toLowerCase())) return send(res, 409, { message: '이미 사용 중인 아이디입니다.' });
      users = users.map((user) => user.id === master.id ? { ...user, loginId: newLoginId, ...passwordRecord(newPassword) } : user);
      await redis!.set(USERS_KEY, users);
      return send(res, 200, { ok: true, loginId: newLoginId });
    }

    if (action === 'login') {
      const loginId = String(body.loginId || '').trim().toLowerCase();
      const password = String(body.password || '');
      const user = users.find((item) => item.loginId.toLowerCase() === loginId);
      if (!user || !passwordMatches(user, password)) return send(res, 401, { message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
      const data = (await redis!.get<AccountData>(`${DATA_PREFIX}${user.id}`)) || {};
      return send(res, 200, { configured: true, token: createSession(user.id), user: publicUser(user), users: users.map(publicUser), ...data });
    }

    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const userId = readSession(token);
    const user = users.find((item) => item.id === userId);
    if (!user) return send(res, 401, { message: '로그인이 만료되었습니다. 다시 로그인해 주세요.' });

    if (action === 'load') {
      const data = (await redis!.get<AccountData>(`${DATA_PREFIX}${user.id}`)) || {};
      return send(res, 200, { configured: true, user: publicUser(user), users: users.map(publicUser), ...data });
    }
    if (action === 'save') {
      const data: AccountData = { state: body.state, snapshots: Array.isArray(body.snapshots) ? body.snapshots : [], settings: body.settings, updatedAt: new Date().toISOString() };
      if (Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_SAVE_BYTES) return send(res, 413, { message: '저장 데이터가 8MB를 초과했습니다.' });
      await redis!.set(`${DATA_PREFIX}${user.id}`, data);
      return send(res, 200, { ok: true, updatedAt: data.updatedAt });
    }
    if (action === 'updateAccount') {
      if (!passwordMatches(user, String(body.currentPassword || ''))) return send(res, 403, { message: '현재 비밀번호가 올바르지 않습니다.' });
      const patch = body.patch || {};
      const loginId = String(patch.loginId || user.loginId).trim();
      if (!loginId || users.some((item) => item.id !== user.id && item.loginId.toLowerCase() === loginId.toLowerCase())) return send(res, 409, { message: '이미 사용 중이거나 올바르지 않은 아이디입니다.' });
      const nextUser: CloudUser = {
        ...user, loginId, name: String(patch.name || user.name).trim() || user.name,
        phone: patch.phone || undefined, department: patch.department || undefined,
        ...(patch.password ? passwordRecord(String(patch.password)) : {})
      };
      users = users.map((item) => item.id === user.id ? nextUser : item);
      await redis!.set(USERS_KEY, users);
      return send(res, 200, { user: publicUser(nextUser), users: users.map(publicUser) });
    }
    if (action === 'createUser') {
      if (!canManageUsers(user)) return send(res, 403, { message: '관리자 권한이 있는 계정만 계정을 추가할 수 있습니다.' });
      const input = body.user || {};
      const loginId = String(input.loginId || '').trim();
      const password = String(input.password || '');
      if (!loginId || password.length < 3 || users.some((item) => item.loginId.toLowerCase() === loginId.toLowerCase())) return send(res, 409, { message: '아이디가 중복되었거나 비밀번호가 너무 짧습니다.' });
      const newUser: CloudUser = {
        id: `u-${Date.now()}`, name: String(input.name || loginId), email: String(input.email || `${loginId}@cloud.local`),
        role: input.role || '작업자', phone: input.phone || undefined, avatarColor: input.avatarColor || '#3b82f6',
        department: input.department || undefined, loginId, isMaster: false, isAdmin: input.isAdmin === true, ...passwordRecord(password)
      };
      users = [...users, newUser];
      await redis!.set(USERS_KEY, users);
      return send(res, 200, { user: publicUser(newUser), users: users.map(publicUser) });
    }
    if (action === 'resetUserPassword') {
      if (!canManageUsers(user)) return send(res, 403, { message: '관리자 권한이 있는 계정만 비밀번호를 초기화할 수 있습니다.' });
      const targetId = String(body.userId || '');
      const newPassword = String(body.newPassword || '');
      const target = users.find((item) => item.id === targetId);
      if (!target || target.isMaster || newPassword.length < 3) return send(res, 400, { message: '계정을 확인하거나 3자 이상의 비밀번호를 입력해 주세요.' });
      users = users.map((item) => item.id === target.id ? { ...item, ...passwordRecord(newPassword) } : item);
      await redis!.set(USERS_KEY, users);
      return send(res, 200, { users: users.map(publicUser) });
    }
    if (action === 'deleteUser') {
      if (!canManageUsers(user)) return send(res, 403, { message: '관리자 권한이 있는 계정만 계정을 삭제할 수 있습니다.' });
      const targetId = String(body.userId || '');
      const target = users.find((item) => item.id === targetId);
      if (!target || target.isMaster || target.id === user.id) return send(res, 400, { message: '해당 계정은 삭제할 수 없습니다.' });
      users = users.filter((item) => item.id !== target.id);
      await redis!.set(USERS_KEY, users);
      await redis!.del(`${DATA_PREFIX}${target.id}`);
      return send(res, 200, { users: users.map(publicUser) });
    }
    return send(res, 400, { message: '알 수 없는 작업입니다.' });
  } catch (error) {
    console.error('cloud api error', error);
    return send(res, 500, { message: '클라우드 저장 처리 중 오류가 발생했습니다.' });
  }
}
