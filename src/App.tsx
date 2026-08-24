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
  SiteSettings
} from './types';
import {
  getSavedActiveUserId,
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
import { INITIAL_BOARD_STATE, INITIAL_USERS, DEFAULT_SITE_SETTINGS } from './data/initialData';
import { arrangeZoneTokens, clampTokenToZone, getTokenSizePx } from './utils/layout';
import { Navbar } from './components/Navbar';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { MagnetEditorModal } from './components/MagnetEditorModal';
import { MagnetManagerModal } from './components/MagnetManagerModal';
import { ZoneEditorModal } from './components/ZoneEditorModal';
import { UserScheduleHistoryDrawer } from './components/UserScheduleHistoryDrawer';
import { LayoutLibraryModal } from './components/LayoutLibraryModal';
import { RosterSheetModal } from './components/RosterSheetModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginScreen } from './components/LoginScreen';

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

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Number(n.toFixed(1));

export default function App() {
  // 1. 계정 & 로그인 세션
  const [users, setUsers] = useState<UserAccount[]>(() => getAllUsers());
  const [sessionUserId, setSessionUserIdState] = useState<string | null>(() => getSessionUserId());

  const isLoggedIn = !!sessionUserId && users.some((u) => u.id === sessionUserId);
  const activeUserId = sessionUserId || getSavedActiveUserId();
  const activeUser = users.find((u) => u.id === activeUserId) || users[0] || INITIAL_USERS[0];

  // 2. 사이트 설정
  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings());

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

  // 3. 보드 상태 (히스토리 포함)
  const [history, dispatch] = useReducer(historyReducer, undefined, () => ({
    present: getBoardStateForUser(getSessionUserId() || getSavedActiveUserId()),
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
  const boardMetricsRef = useRef<BoardMetrics>({ width: 950, height: 620 });
  const handleBoardMetricsChange = useCallback((metrics: BoardMetrics) => {
    if (metrics.width > 0 && metrics.height > 0) {
      boardMetricsRef.current = metrics;
    }
  }, []);

  // 4. 선택 / 검색
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [selectionAnchorTokenId, setSelectionAnchorTokenId] = useState<string | null>(null);
  const [focusTokenId, setFocusTokenId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // 5. 모달
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
  const [isLayoutLibraryOpen, setIsLayoutLibraryOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isMagnetEditorOpen, setIsMagnetEditorOpen] = useState(false);
  const [isMagnetManagerOpen, setIsMagnetManagerOpen] = useState(false);
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);

  const [editingToken, setEditingToken] = useState<Partial<MagnetToken> | null>(null);
  const [editingZone, setEditingZone] = useState<Partial<BoardZone> | null>(null);

  const isAnyModalOpen =
    isSettingsOpen ||
    isScheduleDrawerOpen ||
    isLayoutLibraryOpen ||
    isRosterModalOpen ||
    isMagnetEditorOpen ||
    isMagnetManagerOpen ||
    isZoneEditorOpen;

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

  /* ------------------------------------------------------------ 계정 관리 */
  const handleLogin = (user: UserAccount) => {
    setSessionUserIdState(user.id);
    setSessionUserId(user.id);
    saveActiveUserId(user.id);
    dispatch({ type: 'load', state: getBoardStateForUser(user.id) });
    setSelectedTokenIds([]);
    setSelectionAnchorTokenId(null);
    setSearchFilter('');
  };

  const handleLogout = () => {
    setSessionUserIdState(null);
    setSessionUserId(null);
    setIsSettingsOpen(false);
  };

  const handleCreateUser = (newUserData: Omit<UserAccount, 'id'>) => {
    const newUser: UserAccount = { ...newUserData, id: `u-${Date.now()}` };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveAllUsers(updatedUsers);
  };

  const handleDeleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.isMaster || userId === activeUserId) return;

    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    saveAllUsers(updatedUsers);
    removeBoardStateForUser(userId);
  };

  const handleUpdateAccount = (userId: string, patch: Partial<UserAccount>) => {
    const updatedUsers = users.map((u) => (u.id === userId ? { ...u, ...patch } : u));
    setUsers(updatedUsers);
    saveAllUsers(updatedUsers);
  };

  /* ------------------------------------------------------- 모형 위치 이동 */
  const handleUpdateTokenPosition = useCallback(
    (tokenId: string, newX: number, newY: number, newZoneId?: string) => {
      applyBoard((prevState) => {
        const currentToken = prevState.tokens.find((t) => t.id === tokenId);
        if (!currentToken) return prevState;

        const targetZone = prevState.zones.find((z) => z.id === newZoneId);

        // 구역 안에 놓을 때는 제목/테두리를 침범하지 않도록 위치를 보정한다
        let finalX = round1(newX);
        let finalY = round1(newY);
        if (targetZone && settings.keepInsideZone) {
          const fitted = clampTokenToZone(
            currentToken,
            targetZone,
            boardMetricsRef.current,
            newX,
            newY
          );
          finalX = fitted.x;
          finalY = fitted.y;
        }

        const prevZoneId = currentToken.zoneId;
        const zoneChanged = prevZoneId !== newZoneId;

        const updatedTokens = prevState.tokens.map((t) =>
          t.id === tokenId
            ? {
                ...t,
                x: finalX,
                y: finalY,
                zoneId: newZoneId,
                updatedAt: new Date().toISOString(),
                updatedBy: activeUser.name
              }
            : t
        );

        const fromZoneName = prevState.zones.find((z) => z.id === prevZoneId)?.title || '자유 배치';
        const toZoneName = targetZone?.title || '자유 배치';

        const newLog: ActivityLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          userName: `${activeUser.name} (${activeUser.role})`,
          userEmail: activeUser.email,
          action: 'move',
          targetName: currentToken.title,
          description: zoneChanged
            ? `'${currentToken.title}' 기사를 ${toZoneName}(으)로 이동 배치`
            : `'${currentToken.title}' 위치 조정 (${finalX}%, ${finalY}%)`,
          fromZone: fromZoneName,
          toZone: toZoneName
        };

        return {
          ...prevState,
          tokens: updatedTokens,
          logs: [newLog, ...(prevState.logs || [])].slice(0, 50),
          lastSavedAt: new Date().toISOString(),
          lastSavedBy: activeUser.name
        };
      });
    },
    [applyBoard, activeUser, settings.keepInsideZone]
  );

  /* --------------------------------------------------- 모형 크기 자유 조절 */
  const handleUpdateTokenSize = useCallback(
    (tokenId: string, sizePx: number) => {
      applyBoard((prevState) => {
        const token = prevState.tokens.find((t) => t.id === tokenId);
        if (!token || getTokenSizePx(token) === sizePx) return prevState;

        const zone = prevState.zones.find((z) => z.id === token.zoneId);
        const resized = { ...token, sizePx };

        // 커진 모형이 구역 밖으로 삐져나오지 않게 위치도 함께 보정
        const fitted =
          zone && settings.keepInsideZone
            ? clampTokenToZone(resized, zone, boardMetricsRef.current, token.x, token.y)
            : { x: token.x, y: token.y };

        const updatedTokens = prevState.tokens.map((t) =>
          t.id === tokenId
            ? { ...resized, x: fitted.x, y: fitted.y, updatedAt: new Date().toISOString() }
            : t
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

        // 구역을 옮기면 소속 모형도 같이 이동하고, 크기를 바꾸면 안쪽으로 다시 맞춘다
        const dx = rect.x - zone.x;
        const dy = rect.y - zone.y;
        const updatedTokens = prevState.tokens.map((t) => {
          if (t.zoneId !== zoneId) return t;

          const moved =
            mode === 'move'
              ? { x: clamp(t.x + dx, 3, 97), y: clamp(t.y + dy, 3, 97) }
              : { x: t.x, y: t.y };

          const fitted = settings.keepInsideZone
            ? clampTokenToZone(t, updatedZone, boardMetricsRef.current, moved.x, moved.y)
            : { x: round1(moved.x), y: round1(moved.y) };

          return { ...t, x: fitted.x, y: fitted.y };
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
    [applyBoard, activeUser, settings.keepInsideZone]
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

      if (tokenData.id) {
        updatedTokens = prevState.tokens.map((t) => {
          if (t.id !== tokenData.id) return t;

          const merged = {
            ...t,
            ...tokenData,
            updatedAt: new Date().toISOString(),
            updatedBy: activeUser.name
          } as MagnetToken;

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
          title: tokenData.title || '새 기사',
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

      return addActivityLog(
        { ...prevState, tokens: updatedTokens },
        actionType,
        tokenData.title || '기사',
        tokenData.id ? '기사 모형 속성 수정' : '새 기사 모형 생성 및 보드 배치',
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
      const updatedTokens = prevState.tokens.map((token) => {
        if (!selectedIds.has(token.id)) return token;

        const merged: MagnetToken = {
          ...token,
          ...patch,
          updatedAt: now,
          updatedBy: activeUser.name
        };
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
  const handleDeleteToken = (tokenId: string) => {
    const token = boardState.tokens.find((t) => t.id === tokenId);
    if (!token) return;

    if (
      settings.confirmOnDelete &&
      !window.confirm(`'${token.title}' 모형을 삭제하시겠습니까? (Ctrl+Z 로 되돌릴 수 있습니다)`)
    ) {
      return;
    }

    applyBoard((prevState) =>
      addActivityLog(
        { ...prevState, tokens: prevState.tokens.filter((t) => t.id !== tokenId) },
        'delete',
        token.title,
        `'${token.title}' 모형 삭제 (Ctrl+Z 로 되돌리기 가능)`,
        activeUser
      )
    );

    setSelectedTokenIds((current) => current.filter((id) => id !== tokenId));
    setSelectionAnchorTokenId((current) => (current === tokenId ? null : current));
  };

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
        `구역 내 기사 ${tokensInZone.length}명 자동 정렬`,
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
        const merged = prevState.zones.map((z) =>
          z.id === zoneId ? ({ ...z, ...zoneData } as BoardZone) : z
        );
        updatedZones = merged;

        const updatedZone = merged.find((z) => z.id === zoneId);
        if (updatedZone && settings.keepInsideZone) {
          updatedTokens = prevState.tokens.map((t) => {
            if (t.zoneId !== zoneId) return t;
            const fitted = clampTokenToZone(t, updatedZone, boardMetricsRef.current, t.x, t.y);
            return { ...t, x: fitted.x, y: fitted.y };
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

  /* ------------------------------------------------------------ 구역 삭제 */
  const handleDeleteZone = (zoneId: string) => {
    const zone = boardState.zones.find((z) => z.id === zoneId);
    if (!zone) return;
    if (
      !window.confirm(
        `'${zone.title}' 구역을 삭제하시겠습니까?\n소속 기사는 자유 배치로 전환됩니다. (Ctrl+Z 로 되돌릴 수 있습니다)`
      )
    ) {
      return;
    }

    applyBoard((prevState) => {
      const target = prevState.zones.find((z) => z.id === zoneId);
      if (!target) return prevState;

      const updatedTokens = prevState.tokens.map((t) =>
        t.zoneId === zoneId ? { ...t, zoneId: undefined } : t
      );

      return addActivityLog(
        {
          ...prevState,
          zones: prevState.zones.filter((z) => z.id !== zoneId),
          tokens: updatedTokens
        },
        'delete',
        target.title,
        `'${target.title}' 구역 삭제 (Ctrl+Z 로 되돌리기 가능)`,
        activeUser
      );
    });
  };

  /* ---------------------------------------------------------------- 일정 */
  const handleUpdateScheduleStatus = (scheduleId: string, status: ScheduleItem['status']) => {
    applyBoard((prevState) => {
      const sch = prevState.schedules.find((s) => s.id === scheduleId);
      if (!sch) return prevState;

      const updatedSchedules = prevState.schedules.map((s) =>
        s.id === scheduleId ? { ...s, status } : s
      );

      const statusLabels: Record<ScheduleItem['status'], string> = {
        scheduled: '예정',
        'in-progress': '진행중',
        completed: '완료',
        cancelled: '취소'
      };

      return addActivityLog(
        { ...prevState, schedules: updatedSchedules },
        'schedule_change',
        sch.title,
        `일정 상태를 '${statusLabels[status]}'으(로) 변경`,
        activeUser
      );
    });
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

  /* ------------------------------------------------------ 명단표 인원 추가 */
  const handleRosterAddNewMember = (name: string, phone: string, role: string) => {
    applyBoard((prevState) => {
      const targetZone = prevState.zones[0];
      const draft: MagnetToken = {
        id: `mag-${Date.now()}`,
        title: name,
        subtitle: role,
        phone,
        shape: 'circle',
        color: settings.defaultMagnetColor,
        textColor: '#1c1917',
        size: settings.defaultMagnetSize,
        x: targetZone ? targetZone.x + targetZone.width / 2 : 45,
        y: targetZone ? targetZone.y + targetZone.height / 2 : 45,
        zoneId: targetZone?.id,
        fontStyle: settings.defaultFontStyle,
        status: 'assigned',
        orderNumber: prevState.tokens.length + 1,
        updatedAt: new Date().toISOString(),
        updatedBy: activeUser.name
      };

      if (targetZone && settings.keepInsideZone) {
        const fitted = clampTokenToZone(draft, targetZone, boardMetricsRef.current, draft.x, draft.y);
        draft.x = fitted.x;
        draft.y = fitted.y;
      }

      return addActivityLog(
        { ...prevState, tokens: [...prevState.tokens, draft] },
        'create',
        name,
        `명단표에서 기사 '${name}' 신규 등록`,
        activeUser
      );
    });
  };

  /* ------------------------------------------------- 배치표 복원 / 초기화 */
  const handleRestoreState = (restored: BoardState, label: string) => {
    applyBoard((prevState) =>
      addActivityLog(
        { ...restored, logs: prevState.logs },
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

  /* ------------------------------------------------------------- 로그인 전 */
  if (!isLoggedIn) {
    return (
      <LoginScreen
        users={users}
        dashboardTitle={settings.dashboardTitle}
        companyName={settings.companyName}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans select-none">
      <Navbar
        boardTitle={settings.dashboardTitle}
        companyName={settings.companyName}
        activeUser={activeUser}
        userPendingSchedulesCount={userPendingSchedulesCount}
        searchFilter={searchFilter}
        canUndo={canUndo}
        canRedo={canRedo}
        onSearchChange={setSearchFilter}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onOpenLayoutLibrary={() => setIsLayoutLibraryOpen(true)}
        onOpenScheduleHistory={() => setIsScheduleDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 relative overflow-hidden flex">
        <WhiteboardCanvas
          tokens={boardState.tokens}
          zones={boardState.zones}
          settings={settings}
          selectedTokenIds={selectedTokenIds}
          focusTokenId={isAnyModalOpen ? null : focusTokenId}
          searchFilter={searchFilter}
          onUpdateTokenPosition={handleUpdateTokenPosition}
          onUpdateTokenSize={handleUpdateTokenSize}
          onUpdateZoneRect={handleUpdateZoneRect}
          onBoardMetricsChange={handleBoardMetricsChange}
          onSelectToken={handleSelectToken}
          onSelectTokenIds={handleSelectTokenIds}
          onEditToken={(tok) => {
            setEditingToken(tok);
            setIsMagnetEditorOpen(true);
          }}
          onDeleteToken={handleDeleteToken}
          onViewSchedule={(tok) => {
            setSelectedTokenIds([tok.id]);
            setSelectionAnchorTokenId(tok.id);
            setIsScheduleDrawerOpen(true);
          }}
          onQuickStatusChange={handleQuickStatusChange}
          onEditZone={(z) => {
            setEditingZone(z);
            setIsZoneEditorOpen(true);
          }}
          onDeleteZone={handleDeleteZone}
          onAutoArrangeZone={handleAutoArrangeZone}
          onOpenRosterSheet={() => setIsRosterModalOpen(true)}
          onAddNewMagnet={() => {
            setEditingToken(null);
            setIsMagnetEditorOpen(true);
          }}
          onOpenMagnetManager={() => setIsMagnetManagerOpen(true)}
          onAddNewZone={() => {
            setEditingZone(null);
            setIsZoneEditorOpen(true);
          }}
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
        onClose={() => setIsMagnetManagerOpen(false)}
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
        user={activeUser}
        allSchedules={boardState.schedules}
        allLogs={boardState.logs}
        tokens={boardState.tokens}
        zones={boardState.zones}
        onClose={() => setIsScheduleDrawerOpen(false)}
        onUpdateScheduleStatus={handleUpdateScheduleStatus}
        onAddSchedule={handleAddSchedule}
        onSwitchUser={() => {
          setIsScheduleDrawerOpen(false);
          setIsSettingsOpen(true);
        }}
        onLocateToken={handleLocateToken}
      />

      <LayoutLibraryModal
        isOpen={isLayoutLibraryOpen}
        userId={activeUser.id}
        activeUser={activeUser}
        state={boardState}
        onClose={() => setIsLayoutLibraryOpen(false)}
        onRestoreState={handleRestoreState}
      />

      <RosterSheetModal
        isOpen={isRosterModalOpen}
        tokens={boardState.tokens}
        zones={boardState.zones}
        settings={settings}
        onClose={() => setIsRosterModalOpen(false)}
        onSelectToken={handleLocateToken}
        onAddNewMember={handleRosterAddNewMember}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        users={users}
        activeUser={activeUser}
        activeUserId={activeUserId}
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
    </div>
  );
}
