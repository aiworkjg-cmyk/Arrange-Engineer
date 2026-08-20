import React, { useState, useEffect, useCallback } from 'react';
import {
  BoardState,
  MagnetToken,
  BoardZone,
  UserAccount,
  ScheduleItem,
  MagnetStatus,
  ActivityLog
} from './types';
import {
  getSavedActiveUserId,
  saveActiveUserId,
  getAllUsers,
  saveAllUsers,
  getBoardStateForUser,
  saveBoardStateForUser,
  addActivityLog
} from './utils/storage';
import { INITIAL_BOARD_STATE, INITIAL_USERS } from './data/initialData';
import { Navbar } from './components/Navbar';
import { WhiteboardCanvas } from './components/WhiteboardCanvas';
import { MagnetEditorModal } from './components/MagnetEditorModal';
import { ZoneEditorModal } from './components/ZoneEditorModal';
import { UserScheduleHistoryDrawer } from './components/UserScheduleHistoryDrawer';
import { MarkdownBackupModal } from './components/MarkdownBackupModal';
import { RosterSheetModal } from './components/RosterSheetModal';
import { AuthModal } from './components/AuthModal';

export default function App() {
  // 1. Users state
  const [users, setUsers] = useState<UserAccount[]>(() => getAllUsers());
  const [activeUserId, setActiveUserId] = useState<string>(() => getSavedActiveUserId());

  const activeUser = users.find(u => u.id === activeUserId) || users[0] || INITIAL_USERS[0];

  // 2. Board state for current active user
  const [boardState, setBoardState] = useState<BoardState>(() => getBoardStateForUser(activeUserId));

  // 3. Selection & Search state
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // 4. Modal visibilities
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isScheduleDrawerOpen, setIsScheduleDrawerOpen] = useState(false);
  const [isMarkdownModalOpen, setIsMarkdownModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isMagnetEditorOpen, setIsMagnetEditorOpen] = useState(false);
  const [isZoneEditorOpen, setIsZoneEditorOpen] = useState(false);

  // Editing targets
  const [editingToken, setEditingToken] = useState<Partial<MagnetToken> | null>(null);
  const [editingZone, setEditingZone] = useState<Partial<BoardZone> | null>(null);

  // Auto-save board state when it changes
  useEffect(() => {
    saveBoardStateForUser(activeUser.id, boardState);
  }, [boardState, activeUser.id]);

  // When active user switches, load their saved state and persist user id
  const handleSelectUser = (user: UserAccount) => {
    setActiveUserId(user.id);
    saveActiveUserId(user.id);
    const loadedState = getBoardStateForUser(user.id);
    setBoardState(loadedState);
  };

  const handleCreateNewUser = (newUserData: Omit<UserAccount, 'id'>) => {
    const newUser: UserAccount = {
      ...newUserData,
      id: `u-${Date.now()}`
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    saveAllUsers(updatedUsers);
    handleSelectUser(newUser);
  };

  // Magnet Movement Handler with Zone auto-detection & Activity Logging
  const handleUpdateTokenPosition = useCallback((tokenId: string, newX: number, newY: number, newZoneId?: string) => {
    setBoardState((prevState) => {
      const currentToken = prevState.tokens.find(t => t.id === tokenId);
      if (!currentToken) return prevState;

      const prevZoneId = currentToken.zoneId;
      const zoneChanged = prevZoneId !== newZoneId;

      const updatedTokens = prevState.tokens.map(t => {
        if (t.id === tokenId) {
          return {
            ...t,
            x: Number(newX.toFixed(1)),
            y: Number(newY.toFixed(1)),
            zoneId: newZoneId,
            updatedAt: new Date().toISOString(),
            updatedBy: activeUser.name
          };
        }
        return t;
      });

      let updatedLogs = prevState.logs;
      if (zoneChanged) {
        const fromZoneName = prevState.zones.find(z => z.id === prevZoneId)?.title || '자유 배치';
        const toZoneName = prevState.zones.find(z => z.id === newZoneId)?.title || '자유 배치';

        const newLog: ActivityLog = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          userName: `${activeUser.name} (${activeUser.role})`,
          userEmail: activeUser.email,
          action: 'move',
          targetName: currentToken.title,
          description: `'${currentToken.title}' 모형을 ${toZoneName}(으)로 이동 배치`,
          fromZone: fromZoneName,
          toZone: toZoneName
        };
        updatedLogs = [newLog, ...(prevState.logs || [])].slice(0, 50);
      }

      return {
        ...prevState,
        tokens: updatedTokens,
        logs: updatedLogs,
        lastSavedAt: new Date().toISOString(),
        lastSavedBy: activeUser.name
      };
    });
  }, [activeUser]);

  // Quick Status Change on Magnet
  const handleQuickStatusChange = (tokenId: string, status: MagnetStatus) => {
    setBoardState((prevState) => {
      const token = prevState.tokens.find(t => t.id === tokenId);
      if (!token) return prevState;

      const updatedTokens = prevState.tokens.map(t =>
        t.id === tokenId ? { ...t, status, updatedAt: new Date().toISOString() } : t
      );

      const statusLabels: Record<MagnetStatus, string> = {
        active: '작업중',
        assigned: '배정 완료',
        waiting: '현장 대기',
        break: '휴식',
        done: '작업 완료'
      };

      const updatedState = addActivityLog(
        { ...prevState, tokens: updatedTokens },
        'status_change',
        token.title,
        `상태를 '${statusLabels[status]}'으(로) 변경`,
        activeUser
      );

      return updatedState;
    });
  };

  // Add / Save Magnet Token
  const handleSaveMagnet = (tokenData: Partial<MagnetToken>) => {
    setBoardState((prevState) => {
      let updatedTokens: MagnetToken[];
      let actionType: ActivityLog['action'] = 'update';

      if (tokenData.id) {
        // Edit existing
        updatedTokens = prevState.tokens.map(t => {
          if (t.id === tokenData.id) {
            return {
              ...t,
              ...tokenData,
              updatedAt: new Date().toISOString(),
              updatedBy: activeUser.name
            } as MagnetToken;
          }
          return t;
        });
        actionType = 'update';
      } else {
        // Create new magnet
        const targetZone = prevState.zones.find(z => z.id === tokenData.zoneId) || prevState.zones[0];
        const newMagnet: MagnetToken = {
          id: `mag-${Date.now()}`,
          title: tokenData.title || '새 모형',
          subtitle: tokenData.subtitle,
          phone: tokenData.phone,
          shape: tokenData.shape || 'circle',
          color: tokenData.color || '#fef9c3',
          textColor: tokenData.textColor || '#1c1917',
          size: tokenData.size || 'md',
          x: targetZone ? targetZone.x + targetZone.width / 2 : 50,
          y: targetZone ? targetZone.y + targetZone.height / 2 : 50,
          zoneId: tokenData.zoneId,
          fontStyle: tokenData.fontStyle || 'handwriting',
          status: tokenData.status || 'assigned',
          orderNumber: prevState.tokens.length + 1,
          updatedAt: new Date().toISOString(),
          updatedBy: activeUser.name
        };
        updatedTokens = [...prevState.tokens, newMagnet];
        actionType = 'create';
      }

      const updatedState = addActivityLog(
        { ...prevState, tokens: updatedTokens },
        actionType,
        tokenData.title || '모형',
        tokenData.id ? '모형 속성(형태/색상/크기) 수정' : '새 마그넷 모형 생성 및 보드 배치',
        activeUser
      );

      return updatedState;
    });

    setIsMagnetEditorOpen(false);
    setEditingToken(null);
  };

  // Delete Magnet Token
  const handleDeleteToken = (tokenId: string) => {
    setBoardState((prevState) => {
      const token = prevState.tokens.find(t => t.id === tokenId);
      if (!token) return prevState;

      const updatedTokens = prevState.tokens.filter(t => t.id !== tokenId);
      const updatedState = addActivityLog(
        { ...prevState, tokens: updatedTokens },
        'delete',
        token.title,
        `모형 '${token.title}' 보드에서 삭제`,
        activeUser
      );

      return updatedState;
    });
  };

  // Auto-arrange all tokens inside a specific zone into a clean grid
  const handleAutoArrangeZone = (zoneId: string) => {
    setBoardState((prevState) => {
      const targetZone = prevState.zones.find(z => z.id === zoneId);
      if (!targetZone) return prevState;

      const tokensInZone = prevState.tokens.filter(t => t.zoneId === zoneId);
      if (tokensInZone.length === 0) return prevState;

      const cols = Math.min(4, Math.ceil(Math.sqrt(tokensInZone.length * 1.5)));
      const rows = Math.ceil(tokensInZone.length / cols);

      const cellW = (targetZone.width - 6) / cols;
      const cellH = (targetZone.height - 12) / Math.max(1, rows);

      const updatedTokens = prevState.tokens.map((t) => {
        const indexInZone = tokensInZone.findIndex(item => item.id === t.id);
        if (indexInZone !== -1) {
          const r = Math.floor(indexInZone / cols);
          const c = indexInZone % cols;
          return {
            ...t,
            x: Number((targetZone.x + 3 + c * cellW + cellW / 2).toFixed(1)),
            y: Number((targetZone.y + 10 + r * cellH + cellH / 2).toFixed(1)),
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });

      const updatedState = addActivityLog(
        { ...prevState, tokens: updatedTokens },
        'update',
        targetZone.title,
        `구역 내 인원 ${tokensInZone.length}명 바둑판 자동 정렬 완료`,
        activeUser
      );

      return updatedState;
    });
  };

  // Save Zone
  const handleSaveZone = (zoneData: Partial<BoardZone>) => {
    setBoardState((prevState) => {
      let updatedZones: BoardZone[];

      if (zoneData.id) {
        updatedZones = prevState.zones.map(z =>
          z.id === zoneData.id ? ({ ...z, ...zoneData } as BoardZone) : z
        );
      } else {
        const newZone: BoardZone = {
          id: `zone-${Date.now()}`,
          title: zoneData.title || '새 구역',
          code: zoneData.code || `Z-0${prevState.zones.length + 1}`,
          subtitle: zoneData.subtitle,
          description: zoneData.description,
          maxCapacity: zoneData.maxCapacity,
          x: 20 + (prevState.zones.length % 3) * 25,
          y: 20 + Math.floor(prevState.zones.length / 3) * 30,
          width: 25,
          height: 35,
          bgColor: zoneData.bgColor || 'rgba(239, 246, 255, 0.7)',
          borderColor: zoneData.borderColor || '#93c5fd',
          headerColor: zoneData.headerColor || '#2563eb'
        };
        updatedZones = [...prevState.zones, newZone];
      }

      const updatedState = addActivityLog(
        { ...prevState, zones: updatedZones },
        zoneData.id ? 'update' : 'create',
        zoneData.title || '구역',
        zoneData.id ? '구역 속성 수정' : '새 보드 구역 생성',
        activeUser
      );

      return updatedState;
    });

    setIsZoneEditorOpen(false);
    setEditingZone(null);
  };

  // Delete Zone
  const handleDeleteZone = (zoneId: string) => {
    setBoardState((prevState) => {
      const zone = prevState.zones.find(z => z.id === zoneId);
      if (!zone) return prevState;

      // Unassign tokens from deleted zone
      const updatedTokens = prevState.tokens.map(t =>
        t.zoneId === zoneId ? { ...t, zoneId: undefined } : t
      );
      const updatedZones = prevState.zones.filter(z => z.id !== zoneId);

      const updatedState = addActivityLog(
        { ...prevState, zones: updatedZones, tokens: updatedTokens },
        'delete',
        zone.title,
        `'${zone.title}' 구역 삭제 및 소속 모형 자유 배치 전환`,
        activeUser
      );

      return updatedState;
    });
  };

  // Schedules Update
  const handleUpdateScheduleStatus = (scheduleId: string, status: ScheduleItem['status']) => {
    setBoardState((prevState) => {
      const sch = prevState.schedules.find(s => s.id === scheduleId);
      if (!sch) return prevState;

      const updatedSchedules = prevState.schedules.map(s =>
        s.id === scheduleId ? { ...s, status } : s
      );

      const statusLabels: Record<ScheduleItem['status'], string> = {
        'scheduled': '예정',
        'in-progress': '진행중',
        'completed': '완료',
        'cancelled': '취소'
      };

      const updatedState = addActivityLog(
        { ...prevState, schedules: updatedSchedules },
        'schedule_change',
        sch.title,
        `일정 상태를 '${statusLabels[status]}'으(로) 변경`,
        activeUser
      );

      return updatedState;
    });
  };

  const handleAddSchedule = (newSchData: Omit<ScheduleItem, 'id'>) => {
    setBoardState((prevState) => {
      const newSchedule: ScheduleItem = {
        ...newSchData,
        id: `sch-${Date.now()}`
      };

      const updatedState = addActivityLog(
        { ...prevState, schedules: [newSchedule, ...prevState.schedules] },
        'schedule_change',
        newSchedule.title,
        `새 일정 [${newSchedule.date} / ${newSchedule.userName}] 등록`,
        activeUser
      );

      return updatedState;
    });
  };

  // Roster Quick Add
  const handleRosterAddNewMember = (name: string, phone: string, role: string) => {
    const targetZone = boardState.zones[0];
    const newMagnet: MagnetToken = {
      id: `mag-${Date.now()}`,
      title: name,
      subtitle: role,
      phone,
      shape: 'circle',
      color: '#fef9c3',
      textColor: '#1c1917',
      size: 'md',
      x: targetZone ? targetZone.x + targetZone.width / 2 : 45,
      y: targetZone ? targetZone.y + targetZone.height / 2 : 45,
      zoneId: targetZone?.id,
      fontStyle: 'handwriting',
      status: 'assigned',
      orderNumber: boardState.tokens.length + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: activeUser.name
    };

    setBoardState((prevState) => {
      return addActivityLog(
        { ...prevState, tokens: [...prevState.tokens, newMagnet] },
        'create',
        name,
        `명단표에서 인원 '${name}' 신규 등록 및 자석 배치`,
        activeUser
      );
    });
  };

  // Restore State from Markdown / Backup
  const handleRestoreState = (restored: BoardState) => {
    setBoardState(restored);
    saveBoardStateForUser(activeUser.id, restored);
  };

  // Count active user's pending schedules
  const userPendingSchedulesCount = boardState.schedules.filter(s => {
    if (s.status === 'completed' || s.status === 'cancelled') return false;
    if (activeUser.role === '게스트') return true;
    return s.userId === activeUser.id || s.userName.includes(activeUser.name);
  }).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans select-none">
      {/* 1. Header Navigation */}
      <Navbar
        boardTitle={boardState.title}
        activeUser={activeUser}
        userPendingSchedulesCount={userPendingSchedulesCount}
        searchFilter={searchFilter}
        onSearchChange={setSearchFilter}
        onOpenAddMagnet={() => {
          setEditingToken(null);
          setIsMagnetEditorOpen(true);
        }}
        onOpenAddZone={() => {
          setEditingZone(null);
          setIsZoneEditorOpen(true);
        }}
        onOpenMarkdownBackup={() => setIsMarkdownModalOpen(true)}
        onOpenScheduleHistory={() => setIsScheduleDrawerOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onResetBoard={() => {
          if (window.confirm('보드를 기본 데이터 상태로 초기화하시겠습니까?')) {
            setBoardState(JSON.parse(JSON.stringify(INITIAL_BOARD_STATE)));
          }
        }}
      />

      {/* 2. Interactive Whiteboard Canvas Area */}
      <main className="flex-1 relative overflow-hidden flex">
        <WhiteboardCanvas
          tokens={boardState.tokens}
          zones={boardState.zones}
          activeUser={activeUser}
          selectedTokenId={selectedTokenId}
          searchFilter={searchFilter}
          onUpdateTokenPosition={handleUpdateTokenPosition}
          onSelectToken={(tok) => setSelectedTokenId(tok ? tok.id : null)}
          onEditToken={(tok) => {
            setEditingToken(tok);
            setIsMagnetEditorOpen(true);
          }}
          onDeleteToken={handleDeleteToken}
          onViewSchedule={(tok) => {
            setSelectedTokenId(tok.id);
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
        />
      </main>

      {/* 3. Modals & Portals */}
      {/* Magnet Add / Edit Modal */}
      <MagnetEditorModal
        isOpen={isMagnetEditorOpen}
        token={editingToken}
        zones={boardState.zones}
        onClose={() => {
          setIsMagnetEditorOpen(false);
          setEditingToken(null);
        }}
        onSave={handleSaveMagnet}
      />

      {/* Zone Add / Edit Modal */}
      <ZoneEditorModal
        isOpen={isZoneEditorOpen}
        zone={editingZone}
        onClose={() => {
          setIsZoneEditorOpen(false);
          setEditingZone(null);
        }}
        onSave={handleSaveZone}
      />

      {/* User Personal Schedule & Activity History Drawer */}
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
          setIsAuthModalOpen(true);
        }}
        onLocateToken={(tokId) => setSelectedTokenId(tokId)}
      />

      {/* Markdown Import/Export Backup Modal */}
      <MarkdownBackupModal
        isOpen={isMarkdownModalOpen}
        state={boardState}
        activeUser={activeUser}
        onClose={() => setIsMarkdownModalOpen(false)}
        onRestoreState={handleRestoreState}
      />

      {/* Attached Roster Directory Sheet Modal */}
      <RosterSheetModal
        isOpen={isRosterModalOpen}
        tokens={boardState.tokens}
        zones={boardState.zones}
        onClose={() => setIsRosterModalOpen(false)}
        onSelectToken={(tokenId) => setSelectedTokenId(tokenId)}
        onAddNewMember={handleRosterAddNewMember}
      />

      {/* Login & User Switch Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        users={users}
        activeUserId={activeUserId}
        onClose={() => setIsAuthModalOpen(false)}
        onSelectUser={handleSelectUser}
        onCreateNewUser={handleCreateNewUser}
      />
    </div>
  );
}
