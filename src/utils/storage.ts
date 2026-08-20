import { BoardState, UserAccount, ActivityLog } from '../types';
import { INITIAL_BOARD_STATE, INITIAL_USERS } from '../data/initialData';

const ACTIVE_USER_KEY = 'magnet_board_active_user_id';
const USERS_LIST_KEY = 'magnet_board_users_list';
const STATE_PREFIX = 'magnet_board_state_';

export function getSavedActiveUserId(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    return saved || 'u-kjy'; // Default to representative 김진영 or guest
  } catch {
    return 'u-kjy';
  }
}

export function saveActiveUserId(userId: string): void {
  try {
    localStorage.setItem(ACTIVE_USER_KEY, userId);
  } catch (e) {
    console.error('Failed to save active user ID', e);
  }
}

export function getAllUsers(): UserAccount[] {
  try {
    const saved = localStorage.getItem(USERS_LIST_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load users', e);
  }
  return INITIAL_USERS;
}

export function saveAllUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save users', e);
  }
}

export function getBoardStateForUser(userId: string): BoardState {
  try {
    const key = `${STATE_PREFIX}${userId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.tokens)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load board state', e);
  }
  // Return fresh copy of initial board state
  return JSON.parse(JSON.stringify(INITIAL_BOARD_STATE));
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
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
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
