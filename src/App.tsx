import React, { useState, useEffect, useCallback, useReducer, useMemo, useRef } from 'react';
import {
  BoardState,
  MagnetToken,
  BoardZone,
  UserAccount,
  ScheduleItem,
  MagnetStatus,
  ActivityLog,
  ZoneRect,
  BoardMetrics,
  SiteSettings,
  InstallerProfile,
  BoardSnapshot
} from './types';
import {
  saveActiveUserId,
  getSessionUserId,
  setSessionUserId,
  getAllUsers,
  saveAllUsers,
  getBoardStateForUser,
  saveBoardStateForUser,
  removeBoardStateForUser,
  getSiteSettings,
  saveSiteSettings,
  addActivityLog
} from './utils/storage';
import { INITIAL_BOARD_STATE, DEFAULT_SITE_SETTINGS } from './data/initialData';
import {
  arrangeZoneTokens,
  clampTokenToZone,
  getTokenSizePx,
  remapTokenIntoResizedZone,
  resolveTokenCollisions
} from './utils/layout';
import { Navbar } from './components/Navbar';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { MagnetEditorModal } from './components/MagnetEditorModal';
import { MagnetManagerModal } from './components/MagnetManagerModal';
import { ZoneEditorModal } from './components/ZoneEditorModal';
import { ZoneManagerModal } from './components/ZoneManagerModal';
import { InstallerEditorModal } from './components/InstallerEditorModal';
import { UserScheduleHistoryDrawer } from './components/UserScheduleHistoryDrawer';
import { LayoutLibraryModal } from './components/LayoutLibraryModal';
import { RosterSheetModal } from './components/RosterSheetModal';
import { SettingsModal } from './components/SettingsModal';
import { BoardSettingsModal } from './components/BoardSettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { useIsMobile, useIsPhoneDevice } from './hooks/useIsMobile';
import { Smartphone, Monitor } from 'lucide-react';
import { listSnapshots, replaceSnapshots } from './utils/snapshots';
import {
  createCloudUser, deleteCloudUser, getCloudToken, loadCloud, loginCloud, peekCloud,
  resetCloudUserPassword, saveCloud, setCloudToken, updateCloudAccount
} from './utils/cloud';

/* -------------------------------------------------------------------------- */
/*  되돌리기(Undo) / 다시실행(Redo) 히스토리                                    */
/* -------------------------------------------------------------------------- */

const HISTORY_LIMIT = 50;

interface HistoryState {
  present: BoardState;
  past: BoardState[];
  future: BoardState[];
}

type HistoryAction =
  | { type: 'apply'; updater: (state: BoardState) => BoardState; record: boolean }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'load'; state: BoardState };

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'apply': {
      const next = action.updater(state.present);
      if (next === state.present) return state;
      if (!action.record) return { ...state, present: next };
      return {
        present: next,
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        future: []
      };
    }
    case 'undo': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future].slice(0, HISTORY_LIMIT)
      };
    }
    case 'redo': {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      return {
        present: next,
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        future: rest
      };
    }
    case 'load':
      return { present: action.state, past: [], future: [] };
    default:
      return state;
  }
}

/** 휴대폰에서 'PC 버전' 을 볼 때 기준이 되는 데스크톱 가로 폭 */
const DESKTOP_VIEW_WIDTH = 1280;

/** 다른 기기 변경 사항을 확인하는 간격 (조작 중일 때만 동작) */
const SYNC_INTERVAL_MS = 4000;
/** 마지막 조작 후 이 시간까지만 '사용 중'으로 보고 확인한다 */
const ACTIVE_WINDOW_MS = 120000;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Number(n.toFixed(1));
const GUEST_USER: UserAccount = {
  id: 'guest-preview',
  name: '비로그인 사용자',
  email: '',
  role: '게스트',
  avatarColor: '#78716c'
};
const createGuestBoard = () => JSON.parse(JSON.stringify(INITIAL_BOARD_STATE)) as BoardState;
const normalizeSiteSettings = (value?: Partial<SiteSettings>): SiteSettings => ({
  ...DEFAULT_SITE_SETTINGS,
  ...(value || {})
});

export default function App() {
  // 1. 계정 & 로그인 세션
  const [users, setUsers] = useState<UserAccount[]>(() => getAllUsers());
  const [sessionUserId, setSessionUserIdState] = useState<string | null>(() => getSessionUserId());
  const [cloudToken, setCloudTokenState] = useState<string | null>(() => getCloudToken());
  const [cloudReady, setCloudReady] = useState(() => !getCloudToken());

  const isLoggedIn = !!sessionUserId && users.some((u) => u.id === sessionUserId);
  const activeUserId = sessionUserId || GUEST_USER.id;
  const activeUser = users.find((u) => u.id === activeUserId) || GUEST_USER;
  const canManageAccounts = activeUser.isMaster === true || activeUser.isAdmin === true;

  // 2. 사이트 설정
  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings());
  const [snapshots, setSnapshots] = useState<BoardSnapshot[]>(() => listSnapshots(activeUserId));

  useEffect(() => {
    setSnapshots(listSnapshots(activeUserId));
  }, [activeUserId]);

  const updateSettings = useCallback((patch: Partial<SiteSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSiteSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const next = { ...DEFAULT_SITE_SETTINGS };
    saveSiteSettings(next);
    setSettings(next);
  }, []);

  // 화면 모드 (자동 / PC 고정 / 모바일 고정)
  const isMobile = useIsMobile(settings.viewMode);
  /** 실제 휴대폰/태블릿인지 (viewport 설정에 흔들리지 않는 기준) */
  const isPhoneDevice = useIsPhoneDevice();
  /** PC 창에서 '모바일 고정'을 골랐을 때만 휴대폰 모양 틀로 미리보기 */
  const isPhoneFrame = settings.viewMode === 'mobile' && !isPhoneDevice;
  const frameSize =
    settings.mobileOrientation === 'landscape'
      ? { width: 860, height: 430 }
      : { width: 420, height: 860 };

  const handleMobileOrientationChange = useCallback(
    (orientation: SiteSettings['mobileOrientation']) => {
      updateSettings({ mobileOrientation: orientation });
      if (!isPhoneDevice || typeof window === 'undefined') return;
      const controller = window.screen.orientation as ScreenOrientation & {
        lock?: (value: 'portrait' | 'landscape') => Promise<void>;
      };
      if (typeof controller?.lock === 'function') {
        void controller.lock(orientation).catch(() => {
          // 브라우저가 화면 고정을 허용하지 않아도 선택한 모바일 미리보기 방향은 유지한다.
        });
      }
    },
    [isPhoneDevice, updateSettings]
  );

  /*
   * 실제 휴대폰에서 'PC 버전' 을 고르면 화면이 좁아 레이아웃이 깨진다.
   * 이때는 viewport 폭을 데스크톱 기준으로 고정해, 폰에서도 PC 화면을 축소해 보고
   * 손가락으로 확대·이동할 수 있게 한다. (모바일/자동 모드에서는 원래대로 되돌린다)
   */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;

    const forceDesktop = settings.viewMode === 'desktop' && isPhoneDevice;

    if (!forceDesktop) {
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      return;
    }

    // PC 레이아웃(1280px)이 휴대폰 화면 폭에 통째로 들어오도록 배율을 계산한다.
    // 다른 사이트의 'PC 버전으로 보기' 와 같은 방식이며, 손가락으로 확대·이동할 수 있다.
    const deviceWidth = Math.min(window.screen.width, window.screen.height) || 390;
    const fit = Math.max(0.2, Math.min(1, deviceWidth / DESKTOP_VIEW_WIDTH));
    meta.setAttribute(
      'content',
      `width=${DESKTOP_VIEW_WIDTH}, initial-scale=${fit.toFixed(3)}, minimum-scale=${(fit * 0.6).toFixed(3)}, maximum-scale=3, user-scalable=yes`
    );
  }, [settings.viewMode, isPhoneDevice]);

  // 3. 보드 상태 (히스토리 포함)
  const [history, dispatch] = useReducer(historyReducer, undefined, () => ({
    present: getSessionUserId() ? getBoardStateForUser(getSessionUserId()!) : createGuestBoard(),
    past: [],
    future: []
  }));
  const boardState = history.present;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const applyBoard = useCallback((updater: (state: BoardState) => BoardState, record = true) => {
    dispatch({ type: 'apply', updater, record });
  }, []);

  /** 보드의 실제 픽셀 크기 (모형이 구역 글자/선을 침범하지 않도록 계산할 때 사용) */
  const boardMetricsRef = useRef<BoardMetrics>({
    width: settings.boardWidth || 1600,
    height: settings.boardHeight || 1000
  });
  const handleBoardMetricsChange = useCallback((metrics: BoardMetrics) => {
    if (metrics.width > 0 && metrics.height > 0) {
      boardMetricsRef.current = metrics;
    }
  }, []);

  /**
   * 로그인하지 않은 상태에서 관리·편집 기능을 누르면
   * 안내창을 거치지 않고 바로 로그인 창을 띄운다.
   * (확대/축소 같은 보기 전용 기능은 그대로 사용 가능)
   */
  const requireLogin = useCallback(
    <T extends (...args: never[]) => unknown>(fn: T) =>
      ((...args: Parameters<T>) => {
        if (!isLoggedIn) {
          setIsLoginOpen(true);
          return undefined;
        }
        return fn(...args);
      }) as unknown as T,
    [isLoggedIn]
  );

  // 4. 선택 / 검색
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [selectionAnchorTokenId, setSelectionAnchorTokenId] = useState<string | null>(null);
  const [focusTokenId, setFocusTokenId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  /** 메뉴를 감추고 대시보드만 꽉 채워 보는 모드 (PC·모바일 공통) */
  const [isBoardOnly, setIsBoardOnly] = useState(false);

  // 5. 모달
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
  const [scheduleFocusTokenId, setScheduleFocusTokenId] = useState<string | null>(null);
  const [isLayoutLibraryOpen, setIsLayoutLibraryOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isMagnetEditorOpen, setIsMagnetEditorOpen] = useState(false);
  const [isMagnetManagerOpen, setIsMagnetManagerOpen] = useState(false);
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false);
  const [isInstallerEditorOpen, setIsInstallerEditorOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [editingToken, setEditingToken] = useState<Partial<MagnetToken> | null>(null);
  const [editingZone, setEditingZone] = useState<Partial<BoardZone> | null>(null);
  const [editingInstaller, setEditingInstaller] = useState<Partial<InstallerProfile> | null>(null);

  const isAnyModalOpen =
    isSettingsOpen ||
    isBoardSettingsOpen ||
    isScheduleDrawerOpen ||
    isLayoutLibraryOpen ||
    isRosterModalOpen ||
    isMagnetEditorOpen ||
    isMagnetManagerOpen ||
    isZoneEditorOpen ||
    isZoneManagerOpen ||
    isInstallerEditorOpen ||
    isLoginOpen;

  const handleSelectToken = useCallback((token: MagnetToken | null, additive = false) => {
    if (!token) {
      setSelectedTokenIds([]);
      setSelectionAnchorTokenId(null);
      return;
    }

    setSelectionAnchorTokenId(token.id);
    setSelectedTokenIds((current) => {
      if (!additive) return [token.id];
      return current.includes(token.id)
        ? current.filter((id) => id !== token.id)
        : [...current, token.id];
    });
  }, []);

  const handleSelectTokenIds = useCallback((tokenIds: string[]) => {
    setSelectedTokenIds(tokenIds);
    setSelectionAnchorTokenId(tokenIds[tokenIds.length - 1] || null);
  }, []);

  useEffect(() => {
    const existingIds = new Set(boardState.tokens.map((token) => token.id));
    setSelectedTokenIds((current) => current.filter((id) => existingIds.has(id)));
    setSelectionAnchorTokenId((current) => (current && existingIds.has(current) ? current : null));
  }, [boardState.tokens]);

  // 보드 상태 자동 저장
  useEffect(() => {
    if (!isLoggedIn) return;
    saveBoardStateForUser(activeUser.id, boardState);
  }, [boardState, activeUser.id, isLoggedIn]);

  // Vercel 클라우드 세션이 있으면 새 브라우저에서도 같은 계정 데이터를 불러온다.
  useEffect(() => {
    if (!cloudToken) return;
    let cancelled = false;
    setCloudReady(false);
    void loadCloud(cloudToken).then((result) => {
      if (cancelled) return;
      if (!('data' in result)) {
        if (!result.unavailable) {
          setCloudToken(null);
          setCloudTokenState(null);
        }
        setCloudReady(true);
        return;
      }
      const payload = result.data;
      setUsers(payload.users);
      saveAllUsers(payload.users);
      setSessionUserIdState(payload.user.id);
      setSessionUserId(payload.user.id);
      saveActiveUserId(payload.user.id);
      const nextState = payload.state || getBoardStateForUser(payload.user.id);
      skipNextSaveRef.current = true;
      dispatch({ type: 'load', state: nextState });
      saveBoardStateForUser(payload.user.id, nextState);
      const nextSnapshots = payload.snapshots || listSnapshots(payload.user.id);
      replaceSnapshots(payload.user.id, nextSnapshots);
      setSnapshots(nextSnapshots);
      if (payload.settings) {
        setSettings((prev) => {
          const next = normalizeSiteSettings({
            ...payload.settings,
            viewMode: prev.viewMode,
            mobileOrientation: prev.mobileOrientation
          });
          saveSiteSettings(next);
          return next;
        });
      }
      setCloudReady(true);
    });
    return () => { cancelled = true; };
  }, [cloudToken]);

  // 보드·캘린더·배치표·설정을 한 묶음으로 계정별 저장한다.
  useEffect(() => {
    if (!isLoggedIn || !cloudToken || !cloudReady) return;
    // 원격에서 막 내려받아 반영된 상태라면 다시 올리지 않는다 (되돌림 루프 방지)
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    pendingSaveRef.current = true;
    const timer = window.setTimeout(() => {
      void saveCloud(cloudToken, boardState, snapshots, settings).then((result) => {
        pendingSaveRef.current = false;
        if ('data' in result && result.data.updatedAt) {
          lastSyncedAtRef.current = result.data.updatedAt;
        }
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [boardState, cloudReady, cloudToken, isLoggedIn, settings, snapshots]);

  /*
   * 다른 기기에서 바뀐 내용을 새로고침 없이 반영한다.
   * 매번 전체 데이터를 받지 않고 서버의 '마지막 저장 시각'만 확인(peek)한 뒤,
   * 값이 달라졌을 때만 전체를 내려받아 서버·네트워크 부담을 최소화한다.
   * 탭이 화면에 보일 때만 확인하므로 백그라운드에서는 요청이 발생하지 않는다.
   */
  const lastSyncedAtRef = useRef<string | null>(null);
  const pendingSaveRef = useRef(false);
  const boardStateRef = useRef(boardState);
  boardStateRef.current = boardState;
  const snapshotsRef = useRef(snapshots);
  snapshotsRef.current = snapshots;
  /** 방금 원격 내용을 받아 적용했으면, 그로 인해 생긴 저장은 건너뛴다 */
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !cloudToken || !cloudReady) return;

    let cancelled = false;

    const pull = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      // 내가 방금 바꾼 내용이 아직 저장 중이면 덮어쓰지 않는다
      if (pendingSaveRef.current) return;

      const head = await peekCloud(cloudToken);
      if (cancelled || !('data' in head)) return;
      const remoteAt = head.data.updatedAt;
      if (!remoteAt || remoteAt === lastSyncedAtRef.current) return;

      const result = await loadCloud(cloudToken);
      if (cancelled || !('data' in result)) return;
      const payload = result.data;
      lastSyncedAtRef.current = remoteAt;

      if (payload.users) {
        setUsers(payload.users);
        saveAllUsers(payload.users);
      }
      if (payload.state) {
        skipNextSaveRef.current = true;
        dispatch({ type: 'load', state: payload.state });
        saveBoardStateForUser(payload.user.id, payload.state);
      }
      if (payload.snapshots) {
        replaceSnapshots(payload.user.id, payload.snapshots);
        setSnapshots(payload.snapshots);
      }
      if (payload.settings) {
        // 화면 모드(PC/모바일)와 미리보기 방향은 기기마다 다르게 쓰는 값이라 동기화하지 않는다
        setSettings((prev) => {
          const next = normalizeSiteSettings({
            ...payload.settings,
            viewMode: prev.viewMode,
            mobileOrientation: prev.mobileOrientation
          });
          saveSiteSettings(next);
          return next;
        });
      }
    };

    /*
     * 사용 중일 때만 자주 확인한다.
     * - 최근 2분 안에 조작이 있었으면 4초 간격 (거의 즉시 반영되는 느낌)
     * - 그 뒤로는 확인을 멈춘다 → 탭을 하루 종일 켜둬도 요청이 쌓이지 않는다
     * - 화면을 다시 보거나 조작하면 즉시 한 번 확인하고 다시 4초 간격으로 돌아간다
     */
    let lastActiveAt = Date.now();
    const markActive = () => {
      const wasIdle = Date.now() - lastActiveAt > ACTIVE_WINDOW_MS;
      lastActiveAt = Date.now();
      if (wasIdle) void pull();
    };

    const timer = window.setInterval(() => {
      if (Date.now() - lastActiveAt > ACTIVE_WINDOW_MS) return;
      void pull();
    }, SYNC_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') markActive();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', markActive, { passive: true });
    window.addEventListener('keydown', markActive);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
    };
  }, [cloudReady, cloudToken, isLoggedIn]);

  /*
   * 조용한 로컬 백업.
   * 브라우저는 보안상 사용자 PC의 특정 경로에 파일을 몰래 쓸 수 없어(권한 필요),
   * 대신 같은 키에 계속 덮어쓰는 방식으로 브라우저 저장소에 백업본을 남긴다.
   * 알림은 띄우지 않으며, 필요할 때 개발자 도구나 [배치표 저장/불러오기 > 파일로 내보내기]로 꺼낼 수 있다.
   */
  useEffect(() => {
    if (!isLoggedIn) return;

    const writeBackup = () => {
      try {
        localStorage.setItem(
          `magnet_board_backup_${activeUser.id}`,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            account: activeUser.loginId || activeUser.id,
            state: boardStateRef.current,
            snapshots: snapshotsRef.current
          })
        );
      } catch {
        // 저장 공간이 가득 찼거나 접근이 막혀도 사용자 작업을 방해하지 않는다
      }
    };

    writeBackup();
    window.addEventListener('pagehide', writeBackup);
    return () => {
      writeBackup();
      window.removeEventListener('pagehide', writeBackup);
    };
  }, [isLoggedIn, activeUser.id, activeUser.loginId]);

  // 대시보드 제목을 브라우저 탭 제목에도 반영
  useEffect(() => {
    document.title = settings.dashboardTitle || '시공기사 배치 대시보드';
  }, [settings.dashboardTitle]);

  /* ---------------------------------------------------------------- 단축키 */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (isTyping || isAnyModalOpen || !(e.ctrlKey || e.metaKey)) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'undo' });
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        dispatch({ type: 'redo' });
      } else if (key === 'a' && selectionAnchorTokenId) {
        const anchor = boardState.tokens.find((token) => token.id === selectionAnchorTokenId);
        if (!anchor) return;
        e.preventDefault();
        setSelectedTokenIds(
          boardState.tokens
            .filter((token) => token.zoneId === anchor.zoneId)
            .map((token) => token.id)
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardState.tokens, isAnyModalOpen, selectionAnchorTokenId]);

  /** 대시보드만 보기 상태에서 ESC 를 누르면 메뉴를 다시 보여준다 */
  useEffect(() => {
    if (!isBoardOnly) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsBoardOnly(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isBoardOnly]);

  /* ------------------------------------------------------------ 계정 관리 */
  const completeLogin = (user: UserAccount, state: BoardState, nextSnapshots: BoardSnapshot[]) => {
    setSessionUserIdState(user.id);
    setSessionUserId(user.id);
    saveActiveUserId(user.id);
    dispatch({ type: 'load', state });
    replaceSnapshots(user.id, nextSnapshots);
    setSnapshots(nextSnapshots);
    setSelectedTokenIds([]);
    setSelectionAnchorTokenId(null);
    setSearchFilter('');
    setIsLoginOpen(false);
  };

  const handleLogin = async (loginId: string, password: string): Promise<string | null> => {
    const result = await loginCloud(loginId, password);
    if ('data' in result) {
      const payload = result.data;
      if (!payload.token) return '클라우드 로그인 토큰을 받지 못했습니다.';
      setUsers(payload.users);
      saveAllUsers(payload.users);
      setCloudToken(payload.token);
      setCloudTokenState(payload.token);
      setCloudReady(true);
      if (payload.settings) {
        const nextSettings = normalizeSiteSettings(payload.settings);
        setSettings(nextSettings);
        saveSiteSettings(nextSettings);
      }
      const state = payload.state || getBoardStateForUser(payload.user.id);
      const nextSnapshots = payload.snapshots || listSnapshots(payload.user.id);
      completeLogin(payload.user, state, nextSnapshots);
      return null;
    }
    if (!result.unavailable) return result.message;

    // 로컬 개발 서버에서 /api가 없거나 클라우드가 미설정인 경우 기존 로컬 계정으로 동작한다.
    const target = users.find((user) => (user.loginId || '').toLowerCase() === loginId.trim().toLowerCase());
    if (!target || (target.password || '') !== password) return '아이디 또는 비밀번호가 올바르지 않습니다.';
    setCloudReady(true);
    completeLogin(target, getBoardStateForUser(target.id), listSnapshots(target.id));
    return null;
  };

  const handleLogout = () => {
    setCloudToken(null);
    setCloudTokenState(null);
    setCloudReady(true);
    setSessionUserIdState(null);
    setSessionUserId(null);
    setIsSettingsOpen(false);
    dispatch({ type: 'load', state: createGuestBoard() });
    setSelectedTokenIds([]);
  };

  const handleCreateUser = async (newUserData: Omit<UserAccount, 'id'>): Promise<string | null> => {
    if (!canManageAccounts) return '관리자 권한이 있는 계정만 계정을 추가할 수 있습니다.';
    if (cloudToken) {
      const result = await createCloudUser(cloudToken, newUserData);
      if (!('data' in result)) return result.message;
      setUsers(result.data.users);
      saveAllUsers(result.data.users);
      return null;
    }
    const newUser: UserAccount = { ...newUserData, id: `u-${Date.now()}` };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveAllUsers(updatedUsers);
    return null;
  };

  const handleDeleteUser = async (userId: string): Promise<string | null> => {
    if (!canManageAccounts) return '관리자 권한이 있는 계정만 계정을 삭제할 수 있습니다.';
    const target = users.find((u) => u.id === userId);
    if (!target || target.isMaster || userId === activeUserId) return '해당 계정은 삭제할 수 없습니다.';

    if (cloudToken) {
      const result = await deleteCloudUser(cloudToken, userId);
      if (!('data' in result)) return result.message;
      setUsers(result.data.users);
      saveAllUsers(result.data.users);
      removeBoardStateForUser(userId);
      return null;
    }

    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    saveAllUsers(updatedUsers);
    removeBoardStateForUser(userId);
    return null;
  };

  const handleUpdateAccount = async (userId: string, patch: Partial<UserAccount>, currentPassword = ''): Promise<string | null> => {
    if (cloudToken) {
      if (userId !== activeUserId) {
        if (!canManageAccounts || !patch.password) return '다른 계정은 관리자만 비밀번호를 초기화할 수 있습니다.';
        const resetResult = await resetCloudUserPassword(cloudToken, userId, patch.password);
        if (!('data' in resetResult)) return resetResult.message;
        setUsers(resetResult.data.users);
        saveAllUsers(resetResult.data.users);
        return null;
      }
      const result = await updateCloudAccount(cloudToken, currentPassword, patch);
      if (!('data' in result)) return result.message;
      setUsers(result.data.users);
      saveAllUsers(result.data.users);
      return null;
    }
    const target = users.find((user) => user.id === userId);
    if (!target || (userId === activeUserId && (target.password || '') !== currentPassword)) return '현재 비밀번호가 올바르지 않습니다.';
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, ...patch } : u));
    setUsers(updatedUsers);
    saveAllUsers(updatedUsers);
    return null;
  };

  /* ------------------------------------------------------- 모형 위치 이동 */
  const handleUpdateTokenPositions = useCallback(
    (moves: Array<{ id: string; x: number; y: number; zoneId?: string }>) => {
      if (moves.length === 0) return;
      applyBoard((prevState) => {
        const moveMap = new Map(moves.map((move) => [move.id, move]));
        const now = new Date().toISOString();
        const movedNames: string[] = [];
        const provisional = prevState.tokens.map((token) => {
          const move = moveMap.get(token.id);
          if (!move) return token;
          movedNames.push(token.title);

          const targetZone = prevState.zones.find((zone) => zone.id === move.zoneId);
          const fitted = targetZone && settings.keepInsideZone
            ? clampTokenToZone(token, targetZone, boardMetricsRef.current, move.x, move.y)
            : { x: round1(move.x), y: round1(move.y) };
          return {
            ...token,
            x: fitted.x,
            y: fitted.y,
            zoneId: move.zoneId,
            updatedAt: now,
            updatedBy: activeUser.name
          };
        });

        if (movedNames.length === 0) return prevState;
        const updatedTokens = resolveTokenCollisions(
          provisional,
          moveMap.keys(),
          prevState.zones,
          boardMetricsRef.current,
          settings.keepInsideZone
        );
        return addActivityLog(
          { ...prevState, tokens: updatedTokens },
          'move',
          movedNames.length === 1 ? movedNames[0] : `${movedNames.length}개 모형`,
          movedNames.length === 1
            ? `'${movedNames[0]}' 모형 위치 이동`
            : `선택한 모형 ${movedNames.length}개를 함께 이동`,
          activeUser
        );
      });
    },
    [applyBoard, activeUser, settings.keepInsideZone]
  );

  /* --------------------------------------------------- 모형 크기 자유 조절 */
  const handleUpdateTokenSize = useCallback(
    (tokenId: string, sizePx: number) => {
      applyBoard((prevState) => {
        const token = prevState.tokens.find((t) => t.id === tokenId);
        if (!token || (getTokenSizePx(token) === sizePx && token.widthPx === undefined)) return prevState;

        const zone = prevState.zones.find((z) => z.id === token.zoneId);
        // 사용자가 모형 자체의 크기를 다시 조절하면 형태의 기본 가로세로 비율로 돌아간다.
        const resized = { ...token, sizePx, widthPx: undefined };

        // 커진 모형이 구역 밖으로 삐져나오지 않게 위치도 함께 보정
        const fitted =
          zone && settings.keepInsideZone
            ? clampTokenToZone(resized, zone, boardMetricsRef.current, token.x, token.y)
            : { x: token.x, y: token.y };

        const resizedTokens = prevState.tokens.map((t) =>
          t.id === tokenId
            ? { ...resized, x: fitted.x, y: fitted.y, updatedAt: new Date().toISOString() }
            : t
        );
        const updatedTokens = resolveTokenCollisions(
          resizedTokens,
          [tokenId],
          prevState.zones,
          boardMetricsRef.current,
          settings.keepInsideZone
        );

        return addActivityLog(
          { ...prevState, tokens: updatedTokens },
          'update',
          token.title,
          `모형 크기를 ${sizePx}px 로 조절`,
          activeUser
        );
      });
    },
    [applyBoard, activeUser, settings.keepInsideZone]
  );

  /* --------------------------------------- 구역 위치 이동 / 크기 조절 적용 */
  const handleUpdateZoneRect = useCallback(
    (zoneId: string, rect: ZoneRect, mode: 'move' | 'resize') => {
      applyBoard((prevState) => {
        const zone = prevState.zones.find((z) => z.id === zoneId);
        if (!zone) return prevState;
        if (
          zone.x === rect.x &&
          zone.y === rect.y &&
          zone.width === rect.width &&
          zone.height === rect.height
        ) {
          return prevState;
        }

        const updatedZone: BoardZone = { ...zone, ...rect };
        const updatedZones = prevState.zones.map((z) => (z.id === zoneId ? updatedZone : z));

        /*
         * 구역을 옮기면 소속 모형도 같은 거리만큼 따라간다.
         * 구역 크기를 바꾸면 모형은 '구역 안에서의 상대 위치'를 기억한 것처럼
         * 같은 비율로 함께 늘어나거나 좁혀진다.
         */
        const dx = rect.x - zone.x;
        const dy = rect.y - zone.y;
        const updatedTokens = prevState.tokens.map((t) => {
          if (t.zoneId !== zoneId) return t;

          if (mode === 'move') {
            // 구역 자체가 보드 안으로 제한되므로 모형에도 같은 이동량만 더해야 상대 위치가 유지된다.
            return {
              ...t,
              x: Number((t.x + dx).toFixed(6)),
              y: Number((t.y + dy).toFixed(6))
            };
          }

          const remapped = remapTokenIntoResizedZone(
            t,
            zone,
            updatedZone,
            boardMetricsRef.current,
            t.x,
            t.y
          );
          return { ...t, ...remapped };
        });

        return addActivityLog(
          { ...prevState, zones: updatedZones, tokens: updatedTokens },
          'update',
          zone.title,
          mode === 'move'
            ? `'${zone.title}' 구역 위치 이동 (x ${rect.x}% · y ${rect.y}%)`
            : `'${zone.title}' 구역 크기 조정 (${rect.width}% × ${rect.height}%)`,
          activeUser
        );
      });
    },
    [applyBoard, activeUser]
  );

  /* -------------------------------------------------------- 모형 상태 변경 */
  const handleQuickStatusChange = (tokenId: string, status: MagnetStatus) => {
    applyBoard((prevState) => {
      const token = prevState.tokens.find((t) => t.id === tokenId);
      if (!token) return prevState;

      const updatedTokens = prevState.tokens.map((t) =>
        t.id === tokenId ? { ...t, status, updatedAt: new Date().toISOString() } : t
      );

      const statusLabels: Record<MagnetStatus, string> = {
        active: '작업중',
        assigned: '배정 완료',
        waiting: '현장 대기',
        break: '휴식',
        done: '작업 완료'
      };

      return addActivityLog(
        { ...prevState, tokens: updatedTokens },
        'status_change',
        token.title,
        `상태를 '${statusLabels[status]}'으(로) 변경`,
        activeUser
      );
    });
  };

  /* ------------------------------------------------------ 모형 추가 / 수정 */
  const handleSaveMagnet = (tokenData: Partial<MagnetToken>) => {
    applyBoard((prevState) => {
      let updatedTokens: MagnetToken[];
      let actionType: ActivityLog['action'] = 'update';
      let changedTokenId = tokenData.id || '';

      if (tokenData.id) {
        updatedTokens = prevState.tokens.map((t) => {
          if (t.id !== tokenData.id) return t;

          const merged = {
            ...t,
            ...tokenData,
            updatedAt: new Date().toISOString(),
            updatedBy: activeUser.name
          } as MagnetToken;
          // 이름·색상만 수정한 경우에는 구역 조절로 만들어진 가로 비율을 보존한다.
          if (
            tokenData.sizePx !== undefined &&
            Math.abs(tokenData.sizePx - getTokenSizePx(t)) > 0.0001
          ) {
            merged.widthPx = undefined;
          }

          const targetZone = prevState.zones.find((z) => z.id === tokenData.zoneId);

          // 배정 구역이 바뀌면 새 구역 중앙으로 옮긴다
          if (tokenData.zoneId !== t.zoneId && targetZone) {
            merged.x = targetZone.x + targetZone.width / 2;
            merged.y = targetZone.y + targetZone.height / 2;
          }

          if (targetZone && settings.keepInsideZone) {
            const fitted = clampTokenToZone(
              merged,
              targetZone,
              boardMetricsRef.current,
              merged.x,
              merged.y
            );
            merged.x = fitted.x;
            merged.y = fitted.y;
          }

          return merged;
        });
        actionType = 'update';
      } else {
        const targetZone =
          prevState.zones.find((z) => z.id === tokenData.zoneId) || prevState.zones[0];

        const draft: MagnetToken = {
          id: `mag-${Date.now()}`,
          title: tokenData.title || '새 모형',
          subtitle: tokenData.subtitle,
          phone: tokenData.phone,
          shape: tokenData.shape || 'circle',
          color: tokenData.color || settings.defaultMagnetColor,
          textColor: tokenData.textColor || '#1c1917',
          size: tokenData.size || settings.defaultMagnetSize,
          sizePx: tokenData.sizePx,
          x: targetZone ? targetZone.x + targetZone.width / 2 : 50,
          y: targetZone ? targetZone.y + targetZone.height / 2 : 50,
          zoneId: tokenData.zoneId,
          fontStyle: tokenData.fontStyle || settings.defaultFontStyle,
          notes: tokenData.notes,
          status: tokenData.status || 'assigned',
          orderNumber: prevState.tokens.length + 1,
          updatedAt: new Date().toISOString(),
          updatedBy: activeUser.name
        };
        changedTokenId = draft.id;

        if (targetZone && settings.keepInsideZone) {
          const fitted = clampTokenToZone(
            draft,
            targetZone,
            boardMetricsRef.current,
            draft.x,
            draft.y
          );
          draft.x = fitted.x;
          draft.y = fitted.y;
        }

        updatedTokens = [...prevState.tokens, draft];
        actionType = 'create';
      }

      updatedTokens = resolveTokenCollisions(
        updatedTokens,
        [changedTokenId],
        prevState.zones,
        boardMetricsRef.current,
        settings.keepInsideZone
      );

      return addActivityLog(
        { ...prevState, tokens: updatedTokens },
        actionType,
        tokenData.title || '모형',
        tokenData.id ? '모형 속성 수정' : '새 모형 생성 및 보드 배치',
        activeUser
      );
    });

    setIsMagnetEditorOpen(false);
    setEditingToken(null);
  };

  const handleBulkUpdateMagnets = (tokenIds: string[], patch: Partial<MagnetToken>) => {
    const selectedIds = new Set(tokenIds);
    if (selectedIds.size === 0 || Object.keys(patch).length === 0) return;

    applyBoard((prevState) => {
      const now = new Date().toISOString();
      let changedCount = 0;
      const patchedTokens = prevState.tokens.map((token) => {
        if (!selectedIds.has(token.id)) return token;

        const merged: MagnetToken = {
          ...token,
          ...patch,
          updatedAt: now,
          updatedBy: activeUser.name
        };
        if (patch.sizePx !== undefined) merged.widthPx = undefined;
        const zone = prevState.zones.find((item) => item.id === merged.zoneId);
        if (zone && settings.keepInsideZone) {
          const fitted = clampTokenToZone(
            merged,
            zone,
            boardMetricsRef.current,
            merged.x,
            merged.y
          );
          merged.x = fitted.x;
          merged.y = fitted.y;
        }
        changedCount += 1;
        return merged;
      });

      if (changedCount === 0) return prevState;
      const updatedTokens = resolveTokenCollisions(
        patchedTokens,
        selectedIds,
        prevState.zones,
        boardMetricsRef.current,
        settings.keepInsideZone
      );
      return addActivityLog(
        { ...prevState, tokens: updatedTokens },
        'update',
        `${changedCount}개 모형`,
        `선택한 모형 ${changedCount}개의 속성을 일괄 수정`,
        activeUser
      );
    });
  };

  /* ------------------------------------------------------------ 모형 삭제 */
  const handleDeleteTokens = (tokenIds: string[]) => {
    const targetIds = new Set(tokenIds);
    const targets = boardState.tokens.filter((token) => targetIds.has(token.id));
    if (!targets.length) return;

    if (
      !window.confirm(
        targets.length === 1
          ? `'${targets[0].title}' 모형을 삭제하시겠습니까? (Ctrl+Z 로 되돌릴 수 있습니다)`
          : `선택한 모형 ${targets.length}개를 삭제하시겠습니까? (Ctrl+Z 로 되돌릴 수 있습니다)`
      )
    ) {
      return;
    }

    applyBoard((prevState) =>
      addActivityLog(
        { ...prevState, tokens: prevState.tokens.filter((token) => !targetIds.has(token.id)) },
        'delete',
        targets.length === 1 ? targets[0].title : `${targets.length}개 모형`,
        targets.length === 1
          ? `'${targets[0].title}' 모형 삭제 (Ctrl+Z 로 되돌리기 가능)`
          : `선택한 모형 ${targets.length}개 삭제 (Ctrl+Z 로 되돌리기 가능)`,
        activeUser
      )
    );

    setSelectedTokenIds((current) => current.filter((id) => !targetIds.has(id)));
    setSelectionAnchorTokenId((current) => (current && targetIds.has(current) ? null : current));
  };

  const handleDeleteToken = (tokenId: string) => handleDeleteTokens([tokenId]);

  /* ----------------------------------------------------- 구역 내 자동 정렬 */
  const handleAutoArrangeZone = (zoneId: string) => {
    applyBoard((prevState) => {
      const targetZone = prevState.zones.find((z) => z.id === zoneId);
      if (!targetZone) return prevState;

      const tokensInZone = prevState.tokens.filter((t) => t.zoneId === zoneId);
      if (tokensInZone.length === 0) return prevState;

      const positions = arrangeZoneTokens(targetZone, tokensInZone, boardMetricsRef.current);
      const positionMap = new Map(positions.map((p) => [p.id, p]));

      const updatedTokens = prevState.tokens.map((t) => {
        const pos = positionMap.get(t.id);
        return pos ? { ...t, x: pos.x, y: pos.y, updatedAt: new Date().toISOString() } : t;
      });

      return addActivityLog(
        { ...prevState, tokens: updatedTokens },
        'update',
        targetZone.title,
        `구역 내 모형 ${tokensInZone.length}개 자동 정렬`,
        activeUser
      );
    });
  };

  /* ------------------------------------------------------ 구역 추가 / 수정 */
  const handleSaveZone = (zoneData: Partial<BoardZone>) => {
    applyBoard((prevState) => {
      let updatedZones: BoardZone[];
      let updatedTokens = prevState.tokens;

      if (zoneData.id) {
        const zoneId = zoneData.id;
        const previousZone = prevState.zones.find((z) => z.id === zoneId);
        const merged = prevState.zones.map((z) =>
          z.id === zoneId ? ({ ...z, ...zoneData } as BoardZone) : z
        );
        updatedZones = merged;

        const updatedZone = merged.find((z) => z.id === zoneId);
        const geometryChanged =
          previousZone &&
          updatedZone &&
          (previousZone.x !== updatedZone.x ||
            previousZone.y !== updatedZone.y ||
            previousZone.width !== updatedZone.width ||
            previousZone.height !== updatedZone.height);
        if (previousZone && updatedZone && geometryChanged) {
          updatedTokens = prevState.tokens.map((t) => {
            if (t.zoneId !== zoneId) return t;
            return {
              ...t,
              ...remapTokenIntoResizedZone(
                t,
                previousZone,
                updatedZone,
                boardMetricsRef.current,
                t.x,
                t.y
              )
            };
          });
        }
      } else {
        const newZone: BoardZone = {
          id: `zone-${Date.now()}`,
          title: zoneData.title || '새 구역',
          code: zoneData.code || `Z-0${prevState.zones.length + 1}`,
          subtitle: zoneData.subtitle,
          description: zoneData.description,
          maxCapacity: zoneData.maxCapacity,
          x: zoneData.x ?? 20 + (prevState.zones.length % 3) * 25,
          y: zoneData.y ?? 20 + Math.floor(prevState.zones.length / 3) * 30,
          width: zoneData.width ?? 25,
          height: zoneData.height ?? 35,
          opacity: zoneData.opacity ?? 50,
          bgColor: zoneData.bgColor || 'rgba(239, 246, 255, 0.7)',
          borderColor: zoneData.borderColor || '#93c5fd',
          headerColor: zoneData.headerColor || '#2563eb'
        };
        updatedZones = [...prevState.zones, newZone];
      }

      return addActivityLog(
        { ...prevState, zones: updatedZones, tokens: updatedTokens },
        zoneData.id ? 'update' : 'create',
        zoneData.title || '구역',
        zoneData.id ? '구역 속성 / 위치 / 크기 수정' : '새 보드 구역 생성',
        activeUser
      );
    });

    setIsZoneEditorOpen(false);
    setEditingZone(null);
  };

  const handleBulkUpdateZones = (zoneIds: string[], patch: Partial<BoardZone>) => {
    const selectedIds = new Set(zoneIds);
    if (!selectedIds.size || !Object.keys(patch).length) return;

    applyBoard((prevState) => {
      const updatedZones = prevState.zones.map((zone) => {
        if (!selectedIds.has(zone.id)) return zone;
        const width = clamp(patch.width ?? zone.width, 10, 100 - zone.x);
        const height = clamp(patch.height ?? zone.height, 12, 100 - zone.y);
        return { ...zone, ...patch, width, height } as BoardZone;
      });
      const previousZoneMap = new Map<string, BoardZone>(
        prevState.zones.map((zone) => [zone.id, zone])
      );
      const zoneMap = new Map<string, BoardZone>(updatedZones.map((zone) => [zone.id, zone]));
      const updatedTokens = prevState.tokens.map((token) => {
        if (!token.zoneId || !selectedIds.has(token.zoneId)) return token;
        const previousZone = previousZoneMap.get(token.zoneId);
        const nextZone = zoneMap.get(token.zoneId);
        if (
          !previousZone ||
          !nextZone ||
          (previousZone.x === nextZone.x &&
            previousZone.y === nextZone.y &&
            previousZone.width === nextZone.width &&
            previousZone.height === nextZone.height)
        ) {
          return token;
        }
        return {
          ...token,
          ...remapTokenIntoResizedZone(
            token,
            previousZone,
            nextZone,
            boardMetricsRef.current,
            token.x,
            token.y
          )
        };
      });

      return addActivityLog(
        { ...prevState, zones: updatedZones, tokens: updatedTokens },
        'update',
        `${selectedIds.size}개 구역`,
        `선택한 구역 ${selectedIds.size}개의 속성을 일괄 수정`,
        activeUser
      );
    });
  };

  /* ------------------------------------------------------------ 구역 삭제 */
  const handleDeleteZones = (zoneIds: string[]) => {
    const targetIds = new Set(zoneIds);
    const targets = boardState.zones.filter((zone) => targetIds.has(zone.id));
    if (!targets.length) return;
    if (
      !window.confirm(
        targets.length === 1
          ? `'${targets[0].title}' 구역을 삭제하시겠습니까?\n소속 모형은 자유 배치로 전환됩니다. (Ctrl+Z 로 되돌릴 수 있습니다)`
          : `선택한 구역 ${targets.length}개를 삭제하시겠습니까?\n소속 모형은 자유 배치로 전환됩니다. (Ctrl+Z 로 되돌릴 수 있습니다)`
      )
    ) {
      return;
    }

    applyBoard((prevState) => {
      const updatedTokens = prevState.tokens.map((t) =>
        t.zoneId && targetIds.has(t.zoneId) ? { ...t, zoneId: undefined } : t
      );

      return addActivityLog(
        {
          ...prevState,
          zones: prevState.zones.filter((z) => !targetIds.has(z.id)),
          tokens: updatedTokens
        },
        'delete',
        targets.length === 1 ? targets[0].title : `${targets.length}개 구역`,
        targets.length === 1
          ? `'${targets[0].title}' 구역 삭제 (Ctrl+Z 로 되돌리기 가능)`
          : `선택한 구역 ${targets.length}개 삭제 (Ctrl+Z 로 되돌리기 가능)`,
        activeUser
      );
    });
  };

  const handleDeleteZone = (zoneId: string) => handleDeleteZones([zoneId]);

  /* ---------------------------------------------------------------- 일정 */
  const handleUpdateSchedule = (scheduleId: string, patch: Partial<ScheduleItem>) => {
    applyBoard((prevState) => {
      const schedule = prevState.schedules.find((item) => item.id === scheduleId);
      if (!schedule) return prevState;
      const schedules = prevState.schedules.map((item) =>
        item.id === scheduleId ? { ...item, ...patch, id: item.id } : item
      );
      return addActivityLog(
        { ...prevState, schedules },
        'schedule_change',
        patch.title || schedule.title,
        `일정 [${patch.date || schedule.date} / ${patch.userName || schedule.userName}] 수정`,
        activeUser
      );
    });
  };

  const handleDeleteSchedule = (scheduleId: string): boolean => {
    const schedule = boardState.schedules.find((item) => item.id === scheduleId);
    if (!schedule) return false;
    if (!window.confirm(`'${schedule.title}' 일정을 정말 삭제하시겠습니까?`)) return false;
    applyBoard((prevState) =>
      addActivityLog(
        { ...prevState, schedules: prevState.schedules.filter((item) => item.id !== scheduleId) },
        'delete',
        schedule.title,
        `일정 [${schedule.date} / ${schedule.userName}] 삭제`,
        activeUser
      )
    );
    return true;
  };

  const handleAddSchedule = (newSchData: Omit<ScheduleItem, 'id'>) => {
    applyBoard((prevState) => {
      const newSchedule: ScheduleItem = { ...newSchData, id: `sch-${Date.now()}` };

      return addActivityLog(
        { ...prevState, schedules: [newSchedule, ...prevState.schedules] },
        'schedule_change',
        newSchedule.title,
        `새 일정 [${newSchedule.date} / ${newSchedule.userName}] 등록`,
        activeUser
      );
    });
  };

  /* ---------------------------------------------------------- 시공기사 원장 */
  const handleSaveInstaller = (installerData: Partial<InstallerProfile>) => {
    applyBoard((prevState) => {
      const now = new Date().toISOString();
      const isEditing = !!installerData.id;
      const installers = isEditing
        ? prevState.installers.map((installer) =>
            installer.id === installerData.id
              ? { ...installer, ...installerData, updatedAt: now }
              : installer
          )
        : [
            ...prevState.installers,
            {
              id: `installer-${Date.now()}`,
              name: installerData.name || '새 시공기사',
              role: installerData.role ?? '',
              status: installerData.status ?? '',
              phone: installerData.phone,
              email: installerData.email,
              address: installerData.address,
              emergencyContact: installerData.emergencyContact,
              birthDate: installerData.birthDate,
              joinedDate: installerData.joinedDate,
              notes: installerData.notes,
              createdAt: now,
              updatedAt: now
            } as InstallerProfile
          ];

      return addActivityLog(
        { ...prevState, installers },
        isEditing ? 'update' : 'create',
        installerData.name || '시공기사',
        isEditing ? '시공기사 상세 정보 수정' : '시공기사 명단에 신규 등록',
        activeUser
      );
    });
    setIsInstallerEditorOpen(false);
    setEditingInstaller(null);
  };

  const handleBulkUpdateInstallers = (
    installerIds: string[],
    patch: Partial<InstallerProfile>
  ) => {
    const selectedIds = new Set(installerIds);
    if (!selectedIds.size || !Object.keys(patch).length) return;
    applyBoard((prevState) => {
      const now = new Date().toISOString();
      const installers = prevState.installers.map((installer) =>
        selectedIds.has(installer.id) ? { ...installer, ...patch, updatedAt: now } : installer
      );
      return addActivityLog(
        { ...prevState, installers },
        'update',
        `${selectedIds.size}명 기사`,
        `시공기사 ${selectedIds.size}명의 직책 또는 상태를 일괄 변경`,
        activeUser
      );
    });
  };

  const handleCreateMagnetForInstaller = (installer: InstallerProfile) => {
    const existing = boardState.tokens.find(
      (token) => token.assignedUserId === installer.id || token.title === installer.name
    );
    if (existing) {
      handleLocateToken(existing.id);
      return;
    }

    const magnetId = `mag-installer-${installer.id}-${Date.now()}`;
    applyBoard((prevState) => {
      const targetZone = prevState.zones[0];
      const statusMap: Record<InstallerProfile['status'], MagnetStatus> = {
        '': 'assigned',
        available: 'waiting',
        assigned: 'assigned',
        leave: 'break',
        inactive: 'done'
      };
      const draft: MagnetToken = {
        id: magnetId,
        title: installer.name,
        subtitle: installer.role,
        phone: installer.phone,
        assignedUserId: installer.id,
        shape: 'circle',
        color: settings.defaultMagnetColor,
        textColor: '#1c1917',
        size: settings.defaultMagnetSize,
        sizePx: undefined,
        x: targetZone ? targetZone.x + targetZone.width / 2 : 50,
        y: targetZone ? targetZone.y + targetZone.height / 2 : 50,
        zoneId: targetZone?.id,
        fontStyle: settings.defaultFontStyle,
        notes: installer.notes,
        status: statusMap[installer.status],
        orderNumber: prevState.tokens.length + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: activeUser.name
      };
      const tokens = resolveTokenCollisions(
        [...prevState.tokens, draft],
        [draft.id],
        prevState.zones,
        boardMetricsRef.current,
        settings.keepInsideZone
      );
      return addActivityLog(
        { ...prevState, tokens },
        'create',
        installer.name,
        '시공기사 명단에서 기본 설정 모형 생성',
        activeUser
      );
    });
  };

  const handleDeleteInstallers = (installerIds: string[]) => {
    const targetIds = new Set(installerIds);
    const targets = boardState.installers.filter((installer) => targetIds.has(installer.id));
    if (!targets.length) return;
    if (
      !window.confirm(
        targets.length === 1
          ? `'${targets[0].name}' 기사를 명단에서 삭제하시겠습니까?\n기존 일정 기록과 같은 이름의 모형은 유지됩니다.`
          : `선택한 기사 ${targets.length}명을 명단에서 삭제하시겠습니까?\n기존 일정 기록과 모형은 유지됩니다.`
      )
    ) return;

    applyBoard((prevState) =>
      addActivityLog(
        { ...prevState, installers: prevState.installers.filter((installer) => !targetIds.has(installer.id)) },
        'delete',
        targets.length === 1 ? targets[0].name : `${targets.length}명 기사`,
        `시공기사 명단에서 ${targets.length}명 삭제 (모형과 일정은 유지)`,
        activeUser
      )
    );
  };

  /* ------------------------------------------------- 배치표 복원 / 초기화 */
  const handleRestoreState = (restored: BoardState, label: string) => {
    applyBoard((prevState) =>
      addActivityLog(
        {
          ...restored,
          installers: prevState.installers,
          schedules: prevState.schedules,
          logs: prevState.logs
        },
        'import',
        label,
        `'${label}' 배치표를 불러옴 (Ctrl+Z 로 되돌리기 가능)`,
        activeUser
      )
    );
  };

  const handleResetBoard = () => {
    if (!window.confirm('보드를 기본 데이터 상태로 초기화하시겠습니까?\n(Ctrl+Z 로 되돌릴 수 있습니다)')) {
      return;
    }
    applyBoard(() => JSON.parse(JSON.stringify(INITIAL_BOARD_STATE)) as BoardState);
  };

  const handleLocateToken = (tokenId: string) => {
    setSelectedTokenIds([tokenId]);
    setSelectionAnchorTokenId(tokenId);
    setFocusTokenId(tokenId);
  };

  const userPendingSchedulesCount = useMemo(
    () =>
      boardState.schedules.filter((s) => {
        if (s.status === 'completed' || s.status === 'cancelled') return false;
        if (activeUser.role === '게스트') return true;
        return s.userId === activeUser.id || s.userName.includes(activeUser.name);
      }).length,
    [boardState.schedules, activeUser]
  );

  const appShell = (
    <div
      data-view={isMobile ? 'mobile' : 'desktop'}
      className="flex flex-col h-full w-full overflow-hidden bg-stone-100 font-sans select-none"
    >
      {!isBoardOnly && (
      <Navbar
        boardTitle={settings.dashboardTitle}
        companyName={settings.companyName}
        activeUser={activeUser}
        isLoggedIn={isLoggedIn}
        isMobile={isMobile}
        viewMode={settings.viewMode}
        onToggleMobilePreview={() =>
          updateSettings({ viewMode: isMobile ? 'desktop' : 'mobile' })
        }
        userPendingSchedulesCount={userPendingSchedulesCount}
        searchFilter={searchFilter}
        canUndo={canUndo}
        canRedo={canRedo}
        onSearchChange={setSearchFilter}
        onUndo={requireLogin(() => dispatch({ type: 'undo' }))}
        onRedo={requireLogin(() => dispatch({ type: 'redo' }))}
        onOpenLayoutLibrary={requireLogin(() => setIsLayoutLibraryOpen(true))}
        onOpenScheduleHistory={requireLogin(() => {
          setScheduleFocusTokenId(null);
          setIsScheduleDrawerOpen(true);
        })}
        onOpenSettings={requireLogin(() => setIsSettingsOpen(true))}
        onOpenLogin={() => setIsLoginOpen(true)}
      />
      )}

      <main className="flex-1 relative overflow-hidden flex">
        <WhiteboardCanvas
          tokens={boardState.tokens}
          zones={boardState.zones}
          settings={settings}
          isMobile={isMobile}
          isBoardOnly={isBoardOnly}
          onToggleBoardOnly={() => setIsBoardOnly((prev) => !prev)}
          onMobileOrientationChange={handleMobileOrientationChange}
          selectedTokenIds={selectedTokenIds}
          focusTokenId={isAnyModalOpen ? null : focusTokenId}
          searchFilter={searchFilter}
          onUpdateTokenPositions={requireLogin(handleUpdateTokenPositions)}
          onUpdateTokenSize={requireLogin(handleUpdateTokenSize)}
          onUpdateZoneRect={requireLogin(handleUpdateZoneRect)}
          onBoardMetricsChange={handleBoardMetricsChange}
          onSelectToken={handleSelectToken}
          onSelectTokenIds={handleSelectTokenIds}
          onEditToken={requireLogin((tok: MagnetToken) => {
            setEditingToken(tok);
            setIsMagnetEditorOpen(true);
          })}
          onEditSelectedTokens={requireLogin(() => setIsMagnetManagerOpen(true))}
          onDeleteToken={requireLogin(handleDeleteToken)}
          onViewSchedule={requireLogin((tok: MagnetToken) => {
            setSelectedTokenIds([tok.id]);
            setSelectionAnchorTokenId(tok.id);
            setScheduleFocusTokenId(tok.id);
            setIsScheduleDrawerOpen(true);
          })}
          onQuickStatusChange={requireLogin(handleQuickStatusChange)}
          onEditZone={requireLogin((z: BoardZone) => {
            setEditingZone(z);
            setIsZoneEditorOpen(true);
          })}
          onDeleteZone={requireLogin(handleDeleteZone)}
          onAutoArrangeZone={requireLogin(handleAutoArrangeZone)}
          onOpenRosterSheet={requireLogin(() => setIsRosterModalOpen(true))}
          onAddNewMagnet={requireLogin(() => {
            setEditingToken(null);
            setIsMagnetEditorOpen(true);
          })}
          onAddNewZone={requireLogin(() => {
            setEditingZone(null);
            setIsZoneEditorOpen(true);
          })}
          onOpenMagnetManager={requireLogin(() => setIsMagnetManagerOpen(true))}
          onOpenZoneManager={requireLogin(() => setIsZoneManagerOpen(true))}
          onOpenBoardSettings={requireLogin(() => setIsBoardSettingsOpen(true))}
          onFocusHandled={() => setFocusTokenId(null)}
        />
      </main>

      <MagnetEditorModal
        isOpen={isMagnetEditorOpen}
        token={editingToken}
        zones={boardState.zones}
        settings={settings}
        onClose={() => {
          setIsMagnetEditorOpen(false);
          setEditingToken(null);
        }}
        onSave={handleSaveMagnet}
      />

      <MagnetManagerModal
        isOpen={isMagnetManagerOpen}
        tokens={boardState.tokens}
        zones={boardState.zones}
        selectedTokenIds={selectedTokenIds}
        onSelectionChange={handleSelectTokenIds}
        onApplyBulk={handleBulkUpdateMagnets}
        onAdd={() => {
          setIsMagnetManagerOpen(false);
          setEditingToken(null);
          setIsMagnetEditorOpen(true);
        }}
        onEdit={(token) => {
          setIsMagnetManagerOpen(false);
          setEditingToken(token);
          setIsMagnetEditorOpen(true);
        }}
        onDelete={handleDeleteTokens}
        onClose={() => setIsMagnetManagerOpen(false)}
      />

      <ZoneManagerModal
        isOpen={isZoneManagerOpen}
        zones={boardState.zones}
        tokens={boardState.tokens}
        onAdd={() => {
          setIsZoneManagerOpen(false);
          setEditingZone(null);
          setIsZoneEditorOpen(true);
        }}
        onEdit={(zone) => {
          setIsZoneManagerOpen(false);
          setEditingZone(zone);
          setIsZoneEditorOpen(true);
        }}
        onDelete={handleDeleteZones}
        onApplyBulk={handleBulkUpdateZones}
        onClose={() => setIsZoneManagerOpen(false)}
      />

      <ZoneEditorModal
        isOpen={isZoneEditorOpen}
        zone={editingZone}
        onClose={() => {
          setIsZoneEditorOpen(false);
          setEditingZone(null);
        }}
        onSave={handleSaveZone}
      />

      <UserScheduleHistoryDrawer
        isOpen={isScheduleDrawerOpen}
        isMobile={isMobile}
        allSchedules={boardState.schedules}
        installers={boardState.installers}
        tokens={boardState.tokens}
        zones={boardState.zones}
        snapshots={snapshots}
        initialTokenId={scheduleFocusTokenId}
        onClose={() => {
          setIsScheduleDrawerOpen(false);
          setScheduleFocusTokenId(null);
        }}
        onAddSchedule={handleAddSchedule}
        onUpdateSchedule={handleUpdateSchedule}
        onDeleteSchedule={handleDeleteSchedule}
        onLocateToken={handleLocateToken}
        onApplySnapshot={(snapshot) => {
          handleRestoreState(snapshot.state, snapshot.name);
        }}
      />

      <LayoutLibraryModal
        isOpen={isLayoutLibraryOpen}
        userId={activeUser.id}
        activeUser={activeUser}
        state={boardState}
        onClose={() => setIsLayoutLibraryOpen(false)}
        onRestoreState={handleRestoreState}
        onSnapshotsChange={setSnapshots}
      />

      <RosterSheetModal
        isOpen={isRosterModalOpen}
        installers={boardState.installers}
        tokens={boardState.tokens}
        schedules={boardState.schedules}
        settings={settings}
        onClose={() => setIsRosterModalOpen(false)}
        onAddInstaller={() => {
          setEditingInstaller(null);
          setIsInstallerEditorOpen(true);
        }}
        onEditInstaller={(installer) => {
          setEditingInstaller(installer);
          setIsInstallerEditorOpen(true);
        }}
        onDeleteInstallers={handleDeleteInstallers}
        onBulkUpdate={handleBulkUpdateInstallers}
        onCreateMagnet={handleCreateMagnetForInstaller}
        onLocateMagnet={(tokenId) => {
          setIsRosterModalOpen(false);
          handleLocateToken(tokenId);
        }}
      />

      <InstallerEditorModal
        isOpen={isInstallerEditorOpen}
        installer={editingInstaller}
        onClose={() => {
          setIsInstallerEditorOpen(false);
          setEditingInstaller(null);
        }}
        onSave={handleSaveInstaller}
      />

      <BoardSettingsModal
        isOpen={isBoardSettingsOpen}
        settings={settings}
        onClose={() => setIsBoardSettingsOpen(false)}
        onUpdateSettings={updateSettings}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        users={users}
        activeUser={activeUser}
        activeUserId={activeUserId}
        isPhoneDevice={isPhoneDevice}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateSettings={updateSettings}
        onResetSettings={resetSettings}
        onCreateUser={handleCreateUser}
        onDeleteUser={handleDeleteUser}
        onUpdateAccount={handleUpdateAccount}
        onLogout={handleLogout}
        onOpenLayoutLibrary={() => setIsLayoutLibraryOpen(true)}
        onResetBoard={handleResetBoard}
      />

      {isLoginOpen && (
        <LoginScreen
          dashboardTitle={settings.dashboardTitle}
          companyName={settings.companyName}
          onLogin={handleLogin}
          onClose={() => setIsLoginOpen(false)}
        />
      )}
    </div>
  );

  // PC 에서 모바일 화면을 미리볼 때는 휴대폰 모양 틀 안에 넣어 보여준다
  if (isPhoneFrame) {
    return (
      <div className="h-dvh w-screen overflow-hidden bg-stone-300 flex flex-col items-center justify-center gap-3 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 whitespace-nowrap">
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>모바일 미리보기</span>
          <button
            type="button"
            onClick={() => updateSettings({ viewMode: 'auto' })}
            className="px-2.5 py-1 rounded-lg bg-stone-800 text-white hover:bg-stone-900 transition-colors flex items-center gap-1"
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span>PC 화면으로</span>
          </button>
        </div>

        <div
          style={{
            width: `${frameSize.width}px`,
            height: `${frameSize.height}px`,
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 'calc(100dvh - 5rem)'
          }}
          className="phone-frame relative overflow-hidden rounded-[2rem] border-[10px] border-stone-800 bg-stone-100 shadow-2xl"
        >
          {appShell}
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh w-screen overflow-hidden">{appShell}</div>
  );
}
