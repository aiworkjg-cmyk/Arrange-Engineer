import {
  ActivityLog,
  BoardState,
  InstallerProfile,
  InstallerRole,
  InstallerStatus,
  MagnetStatus,
  SiteSettings,
  UserAccount
} from '../types';
import {
  INITIAL_BOARD_STATE,
  INITIAL_USERS,
  MASTER_USER,
  MASTER_USER_ID,
  DEFAULT_USER_PASSWORD,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_DASHBOARD_TITLE,
  LEGACY_DASHBOARD_TITLES
} from '../data/initialData';
import { resolveTokenCollisions } from './layout';

const ACTIVE_USER_KEY = 'magnet_board_active_user_id';
const USERS_LIST_KEY = 'magnet_board_users_list';
const STATE_PREFIX = 'magnet_board_state_';
const SESSION_KEY = 'magnet_board_session_user_id';
const SETTINGS_KEY = 'magnet_board_site_settings';

function normalizeInstallerRole(role?: string): InstallerRole {
  if (role === '팀장' || role === '사수' || role === '부사수') return role;
  if (role && /(반장|책임|대표|총괄|팀장)/.test(role)) return '팀장';
  if (role && /(기술|기능|담당|사수)/.test(role)) return '사수';
  return '부사수';
}

function normalizeInstallerStatus(status?: string): InstallerStatus {
  if (status === 'available' || status === 'assigned' || status === 'leave' || status === 'inactive') {
    return status;
  }
  if (status === 'waiting') return 'available';
  if (status === 'break') return 'leave';
  if (status === 'done') return 'inactive';
  return 'assigned';
}

function installerStatusFromMagnet(status: MagnetStatus): InstallerStatus {
  return normalizeInstallerStatus(status);
}

function normalizeBoardState(state: BoardState): BoardState {
  const normalizedTokens = state.tokens || [];
  const sourceInstallers: InstallerProfile[] = Array.isArray(state.installers)
    ? state.installers
    : normalizedTokens.map((token) => ({
        id: token.assignedUserId || `installer-${token.id}`,
        name: token.title,
        role: normalizeInstallerRole(token.subtitle),
        status: installerStatusFromMagnet(token.status),
        phone: token.phone,
        notes: token.notes,
        createdAt: token.updatedAt || new Date().toISOString(),
        updatedAt: token.updatedAt || new Date().toISOString()
      }));

  const normalizedInstallers = sourceInstallers.map((installer) => ({
    ...installer,
    role: normalizeInstallerRole(installer.role),
    status: normalizeInstallerStatus(installer.status),
    createdAt: installer.createdAt || installer.updatedAt || new Date().toISOString(),
    updatedAt: installer.updatedAt || new Date().toISOString()
  }));

  return {
    ...state,
    version: Math.max(state.version || 1, 2),
    tokens: resolveTokenCollisions(
      normalizedTokens,
      normalizedTokens.map((token) => token.id),
      state.zones,
      { width: 950, height: 620 },
      true
    ),
    installers: normalizedInstallers,
    schedules: state.schedules || []
  };
}

export function getSavedActiveUserId(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    return saved || MASTER_USER_ID;
  } catch {
    return MASTER_USER_ID;
  }
}

export function saveActiveUserId(userId: string): void {
  try {
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  } catch (e) {
    console.error('Failed to save active user ID', e);
  }
}

/**
 * 저장된 계정 목록을 현재 계정 규격(로그인 아이디 / 비밀번호 / 마스터 플래그)에 맞춰 보정한다.
 * - 마스터 계정이 없으면 항상 목록 맨 앞에 추가한다.
 * - 로그인 아이디가 없는 기존 계정은 이메일 앞부분을 아이디로 사용한다.
 * - 비밀번호가 없는 계정은 기본 비밀번호를 부여한다.
 */
function normalizeUsers(users: UserAccount[]): UserAccount[] {
  const usedLoginIds = new Set<string>();

  const normalized: UserAccount[] = users.map((user): UserAccount => {
    const isMaster = user.isMaster === true || user.id === MASTER_USER_ID;

    let loginId = (user.loginId || '').trim();
    if (!loginId) {
      loginId = isMaster
        ? MASTER_USER.loginId!
        : (user.email || '').split('@')[0] || user.id;
    }

    // 아이디 중복 방지 (기존 데이터가 겹칠 경우에만 접미사 부여)
    let uniqueLoginId = loginId;
    let suffix = 2;
    while (usedLoginIds.has(uniqueLoginId.toLowerCase())) {
      uniqueLoginId = `${loginId}${suffix++}`;
    }
    usedLoginIds.add(uniqueLoginId.toLowerCase());

    return {
      ...user,
      isMaster,
      loginId: uniqueLoginId,
      password: user.password || (isMaster ? MASTER_USER.password! : DEFAULT_USER_PASSWORD)
    };
  });

  if (!normalized.some((u) => u.id === MASTER_USER_ID)) {
    normalized.unshift({ ...MASTER_USER });
  }

  return normalized;
}

export function getAllUsers(): UserAccount[] {
  try {
    const saved = localStorage.getItem(USERS_LIST_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeUsers(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load users', e);
  }
  return normalizeUsers(INITIAL_USERS);
}

export function saveAllUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

/** 삭제된 계정의 보드 데이터도 함께 정리한다. */
export function removeBoardStateForUser(userId: string): void {
  try {
    localStorage.removeItem(`${STATE_PREFIX}${userId}`);
  } catch (e) {
    console.error('Failed to remove board state', e);
  }
}

/* ------------------------------------------------------------------ 세션 */

/** 로그인된 사용자 id (없으면 로그아웃 상태) */
export function getSessionUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSessionUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(SESSION_KEY, userId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error('Failed to persist session', e);
  }
}

/* ---------------------------------------------------------------- 설정 */

export function getSiteSettings(): SiteSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.rosterTitle === 'string' && /현장 명단표|배정 및 명단표/.test(parsed.rosterTitle)) {
          parsed.rosterTitle = DEFAULT_SITE_SETTINGS.rosterTitle;
        }
        // 새로 추가된 항목은 기본값으로 채운다
        return { ...DEFAULT_SITE_SETTINGS, ...parsed };
      }
    }
  } catch (e) {
    console.error('Failed to load site settings', e);
  }
  return { ...DEFAULT_SITE_SETTINGS };
}

export function saveSiteSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save site settings', e);
  }
}

export function getBoardStateForUser(userId: string): BoardState {
  try {
    const key = `${STATE_PREFIX}${userId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.tokens)) {
        // 예전 기본 제목으로 저장된 보드는 새 제목으로 옮긴다
        if (LEGACY_DASHBOARD_TITLES.includes(parsed.title)) {
          parsed.title = DEFAULT_DASHBOARD_TITLE;
        }
        return normalizeBoardState(parsed);
      }
    }
  } catch (e) {
    console.error('Failed to load board state', e);
  }
  // Return fresh copy of initial board state
  return normalizeBoardState(JSON.parse(JSON.stringify(INITIAL_BOARD_STATE)));
}

export function saveBoardStateForUser(userId: string, state: BoardState): void {
  try {
    const key = `${STATE_PREFIX}${userId}`;
    const stateToSave: BoardState = {
      ...state,
      lastSavedAt: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(stateToSave));
  } catch (e) {
    console.error('Failed to save board state to localStorage', e);
  }
}

export function addActivityLog(
  currentState: BoardState,
  action: ActivityLog['action'],
  targetName: string,
  description: string,
  user: UserAccount,
  fromZone?: string,
  toZone?: string
): BoardState {
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    userName: `${user.name} (${user.role})`,
    userEmail: user.email,
    action,
    targetName,
    description,
    fromZone,
    toZone
  };

  return {
    ...currentState,
    logs: [newLog, ...(currentState.logs || [])].slice(0, 50),
    lastSavedAt: new Date().toISOString(),
    lastSavedBy: user.name
  };
}
