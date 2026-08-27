import React, { useEffect, useState } from 'react';
import { UserAccount, SiteSettings, MagnetSize, MagnetFontStyle } from '../types';
import { useEscapeClose } from '../hooks/useEscapeClose';
import {
  Settings,
  SlidersHorizontal,
  Palette,
  UserCog,
  Users,
  Database,
  KeyRound,
  Trash2,
  UserPlus,
  ShieldCheck,
  LogOut,
  Check,
  AlertTriangle,
  X,
  FolderOpen,
  RefreshCw,
  Monitor,
  Smartphone,
  RotateCw
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: SiteSettings;
  users: UserAccount[];
  activeUser: UserAccount;
  activeUserId: string;
  /** 실제 휴대폰/태블릿에서 열렸는지 (미리보기 전용 항목을 감추는 데 사용) */
  isPhoneDevice: boolean;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<SiteSettings>) => void;
  onResetSettings: () => void;
  onCreateUser: (user: Omit<UserAccount, 'id'>) => Promise<string | null>;
  onDeleteUser: (userId: string) => Promise<string | null>;
  onUpdateAccount: (userId: string, patch: Partial<UserAccount>, currentPassword?: string) => Promise<string | null>;
  onLogout: () => void;
  onOpenLayoutLibrary: () => void;
  onResetBoard: () => void;
}

type TabId = 'general' | 'board' | 'magnet' | 'account' | 'users' | 'data' | 'reset';

const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const MAGNET_COLORS = [
  { hex: '#fef9c3', name: '아이보리' },
  { hex: '#fef08a', name: '옐로우' },
  { hex: '#bbf7d0', name: '민트' },
  { hex: '#bae6fd', name: '스카이' },
  { hex: '#fecdd3', name: '핑크' },
  { hex: '#e9d5ff', name: '퍼플' },
  { hex: '#fed7aa', name: '오렌지' },
  { hex: '#e2e8f0', name: '그레이' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  users,
  activeUser,
  activeUserId,
  isPhoneDevice,
  onClose,
  onUpdateSettings,
  onResetSettings,
  onCreateUser,
  onDeleteUser,
  onUpdateAccount,
  onLogout,
  onOpenLayoutLibrary,
  onResetBoard
}) => {
  const [tab, setTab] = useState<TabId>('account');

  /** 계정 관리에서 선택해 수정 중인 계정 */
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoginId, setEditLoginId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserAccount['role']>('작업자');
  const [editPhone, setEditPhone] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // 계정 정보 변경
  const [currentPw, setCurrentPw] = useState('');
  const [nextLoginId, setNextLoginId] = useState('');
  const [nextPw, setNextPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayPhone, setDisplayPhone] = useState('');
  const [displayDept, setDisplayDept] = useState('');

  // 새 계정
  const [newName, setNewName] = useState('');
  const [newLoginId, setNewLoginId] = useState('');
  const [newPw, setNewPw] = useState('1234');
  const [newRole, setNewRole] = useState<UserAccount['role']>('작업자');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newDept, setNewDept] = useState('');

  const isMaster = activeUser?.isMaster === true;
  const canManageAccounts = isMaster || activeUser?.isAdmin === true;

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setTab('account');
    setNotice(null);
    setCurrentPw('');
    setNextPw('');
    setConfirmPw('');
    setNextLoginId(activeUser?.loginId || '');
    setDisplayName(activeUser?.name || '');
    setDisplayPhone(activeUser?.phone || '');
    setDisplayDept(activeUser?.department || '');
  }, [isOpen, activeUser]);

  if (!isOpen) return null;

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none';
  const labelClass = 'block text-xs font-semibold text-stone-700 mb-1 whitespace-nowrap';

  /** 켜고 끄는 설정 한 줄 */
  const toggleRow = (
    label: string,
    description: string,
    value: boolean,
    onChange: (next: boolean) => void
  ) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-left"
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-stone-800 whitespace-nowrap">{label}</div>
        <div className="text-[11px] text-stone-500 truncate">{description}</div>
      </div>
      <span
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          value ? 'bg-blue-600' : 'bg-stone-300'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            value ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = nextLoginId.trim();
    if (!trimmedId) {
      setNotice({ type: 'error', text: '아이디는 비워둘 수 없습니다.' });
      return;
    }
    if (
      users.some(
        (u) => u.id !== activeUser.id && (u.loginId || '').toLowerCase() === trimmedId.toLowerCase()
      )
    ) {
      setNotice({ type: 'error', text: '이미 사용 중인 아이디입니다.' });
      return;
    }

    const patch: Partial<UserAccount> = {
      loginId: trimmedId,
      name: displayName.trim() || activeUser.name,
      phone: displayPhone.trim() || undefined,
      department: displayDept.trim() || undefined
    };

    if (nextPw || confirmPw) {
      if (nextPw.length < 3) {
        setNotice({ type: 'error', text: '새 비밀번호는 3자 이상이어야 합니다.' });
        return;
      }
      if (nextPw !== confirmPw) {
        setNotice({ type: 'error', text: '새 비밀번호 확인이 일치하지 않습니다.' });
        return;
      }
      patch.password = nextPw;
    }

    const error = await onUpdateAccount(activeUser.id, patch, currentPw);
    if (error) {
      setNotice({ type: 'error', text: error });
      return;
    }
    setCurrentPw('');
    setNextPw('');
    setConfirmPw('');
    setNotice({ type: 'success', text: '계정 정보가 저장되었습니다.' });
  };

  /** 목록에서 계정을 골라 편집 폼을 채운다 */
  const startEditUser = (user: UserAccount) => {
    if (editingUserId === user.id) {
      setEditingUserId(null);
      return;
    }
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditLoginId(user.loginId || '');
    setEditPassword('');
    setEditRole(user.role);
    setEditPhone(user.phone || '');
    setEditDept(user.department || '');
    setEditIsAdmin(user.isAdmin === true);
    setNotice(null);
  };

  /** 마스터가 다른 계정의 정보를 통째로 수정한다 */
  const handleSaveEditedUser = async (user: UserAccount) => {
    const name = editName.trim();
    const loginId = editLoginId.trim();

    if (!name || !loginId) {
      setNotice({ type: 'error', text: '이름과 로그인 아이디는 필수입니다.' });
      return;
    }
    if (
      users.some(
        (other) => other.id !== user.id && (other.loginId || '').toLowerCase() === loginId.toLowerCase()
      )
    ) {
      setNotice({ type: 'error', text: '이미 사용 중인 아이디입니다.' });
      return;
    }
    if (editPassword && editPassword.trim().length < 3) {
      setNotice({ type: 'error', text: '비밀번호는 3자 이상이어야 합니다.' });
      return;
    }

    const patch: Partial<UserAccount> = {
      name,
      loginId,
      role: editRole,
      phone: editPhone.trim() || undefined,
      department: editDept.trim() || undefined
    };
    // 마스터 계정의 관리자 권한은 항상 유지된다
    if (!user.isMaster) patch.isAdmin = editIsAdmin;
    if (editPassword.trim()) patch.password = editPassword.trim();

    const error = await onUpdateAccount(user.id, patch);
    if (error) {
      setNotice({ type: 'error', text: error });
      return;
    }

    setEditPassword('');
    setEditingUserId(null);
    setNotice({ type: 'success', text: `'${name}' 계정 정보를 저장했습니다.` });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    const id = newLoginId.trim();

    if (!name || !id) {
      setNotice({ type: 'error', text: '이름과 로그인 아이디는 필수입니다.' });
      return;
    }
    if (users.some((u) => (u.loginId || '').toLowerCase() === id.toLowerCase())) {
      setNotice({ type: 'error', text: '이미 사용 중인 아이디입니다.' });
      return;
    }
    if (!newPw.trim()) {
      setNotice({ type: 'error', text: '비밀번호를 입력해주세요.' });
      return;
    }

    const error = await onCreateUser({
      name,
      email: `${id}@local`,
      role: newRole,
      phone: newPhone.trim() || undefined,
      department: newDept.trim() || '현장 시공팀',
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      loginId: id,
      password: newPw.trim(),
      isMaster: false,
      isAdmin: newIsAdmin
    });
    if (error) {
      setNotice({ type: 'error', text: error });
      return;
    }

    setNewName('');
    setNewLoginId('');
    setNewPw('1234');
    setNewPhone('');
    setNewDept('');
    setNewIsAdmin(false);
    setNotice({ type: 'success', text: `'${name}' 계정이 추가되었습니다.` });
  };

  const handleDeleteUser = async (user: UserAccount) => {
    if (user.isMaster) {
      setNotice({ type: 'error', text: '마스터 계정은 삭제할 수 없습니다.' });
      return;
    }
    if (user.id === activeUserId) {
      setNotice({ type: 'error', text: '현재 로그인 중인 계정은 삭제할 수 없습니다.' });
      return;
    }
    if (!window.confirm(`'${user.name}' 계정을 삭제하시겠습니까?\n해당 계정의 보드 데이터도 함께 삭제됩니다.`)) {
      return;
    }
    const error = await onDeleteUser(user.id);
    if (error) {
      setNotice({ type: 'error', text: error });
      return;
    }
    setNotice({ type: 'success', text: `'${user.name}' 계정을 삭제했습니다.` });
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode; visible: boolean }[] = [
    { id: 'account', label: '내 계정', icon: <UserCog className="w-3.5 h-3.5" />, visible: true },
    { id: 'users', label: '계정 관리', icon: <Users className="w-3.5 h-3.5" />, visible: canManageAccounts },
    { id: 'general', label: '일반', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, visible: true },
    { id: 'board', label: '보드 표시', icon: <Settings className="w-3.5 h-3.5" />, visible: true },
    { id: 'magnet', label: '모형 기본값', icon: <Palette className="w-3.5 h-3.5" />, visible: true },
    { id: 'data', label: '데이터', icon: <Database className="w-3.5 h-3.5" />, visible: true },
    { id: 'reset', label: '대시보드 초기화', icon: <RefreshCw className="w-3.5 h-3.5" />, visible: true }
  ];

  return (
    <div
      className="app-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="app-modal-panel w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Settings className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-base whitespace-nowrap">설정 관리</h3>
              <p className="text-xs text-stone-500 truncate whitespace-nowrap">
                {activeUser?.name}
                {isMaster ? ' · 마스터 관리자' : activeUser?.isAdmin ? ' · 관리자' : ` · ${activeUser?.role}`} 로 접속 중
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-stone-200 bg-white px-3 shrink-0 overflow-x-auto custom-scrollbar">
          {tabs
            .filter((t) => t.visible)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTab(t.id);
                  setNotice(null);
                }}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  tab === t.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
        </div>

        {notice && (
          <div
            className={`mx-5 mt-4 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0 ${
              notice.type === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            {notice.type === 'error' ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto custom-scrollbar">
          {/* ------------------------------------------------------- 일반 */}
          {tab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>대시보드 제목</label>
                <input
                  type="text"
                  value={settings.dashboardTitle}
                  onChange={(e) => onUpdateSettings({ dashboardTitle: e.target.value })}
                  className={inputClass}
                  placeholder="예: 시공기사 배치 대시보드"
                />
                <p className="mt-1 text-[11px] text-stone-500">상단 좌측에 표시되는 사이트 이름입니다.</p>
              </div>

              <div>
                <label className={labelClass}>회사 / 현장명</label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) => onUpdateSettings({ companyName: e.target.value })}
                  className={inputClass}
                  placeholder="예: (주)유로테크"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  제목 옆 배지와 보드 좌측 상단에 표시됩니다.
                </p>
              </div>

              <div>
                <label className={labelClass}>명단표 제목</label>
                <input
                  type="text"
                  value={settings.rosterTitle}
                  onChange={(e) => onUpdateSettings({ rosterTitle: e.target.value })}
                  className={inputClass}
                  placeholder="예: 시공기사 명단"
                />
              </div>

              {/* 배경판 하단 제작 출처 표기 */}
              <div className="pt-4 border-t border-stone-200 space-y-2.5">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ showCredit: !settings.showCredit })}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-800 whitespace-nowrap">
                      제작 출처 표기
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      배경판 맨 아래에 흐리게 한 줄로 표시합니다
                    </div>
                  </div>
                  <span
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                      settings.showCredit ? 'bg-blue-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        settings.showCredit ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>

                {settings.showCredit && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className={labelClass}>표기 이름</label>
                      <input
                        type="text"
                        value={settings.creditOwner}
                        onChange={(e) => onUpdateSettings({ creditOwner: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>연도</label>
                      <input
                        type="text"
                        value={settings.creditYear}
                        onChange={(e) => onUpdateSettings({ creditYear: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>이메일</label>
                      <input
                        type="text"
                        value={settings.creditEmail}
                        onChange={(e) => onUpdateSettings({ creditEmail: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
                    onResetSettings();
                    setNotice({ type: 'success', text: '설정을 기본값으로 되돌렸습니다.' });
                  }
                }}
                className="w-full py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
              >
                설정 기본값으로 초기화
              </button>
            </div>
          )}

          {/* -------------------------------------------------- 보드 표시 */}
          {tab === 'board' && (
            <div className="space-y-2.5">
              {toggleRow(
                '격자 배경',
                '화이트보드 배경의 모눈 무늬를 표시합니다',
                settings.showGrid,
                (v) => onUpdateSettings({ showGrid: v })
              )}
              {toggleRow(
                '구역 인원수 표시',
                '구역 제목 옆에 배정 인원 / 정원을 표시합니다',
                settings.showZoneCapacity,
                (v) => onUpdateSettings({ showZoneCapacity: v })
              )}
              {toggleRow(
                '구역 설명 표시',
                '구역 제목 아래 부제목 줄을 표시합니다',
                settings.showZoneSubtitle,
                (v) => onUpdateSettings({ showZoneSubtitle: v })
              )}
              {toggleRow(
                '모형 상태 표시점',
                '모형 우측 상단의 작업 상태 색상 점을 표시합니다',
                settings.showStatusDot,
                (v) => onUpdateSettings({ showStatusDot: v })
              )}
              {toggleRow(
                '모형 직책 표시',
                '모형 안에 이름과 함께 직책/부서를 표시합니다',
                settings.showTokenSubtitle,
                (v) => onUpdateSettings({ showTokenSubtitle: v })
              )}
              {toggleRow(
                '구역 안으로 자동 정렬',
                '모형을 구역에 놓을 때 글자·테두리를 침범하지 않도록 위치를 맞춥니다',
                settings.keepInsideZone,
                (v) => onUpdateSettings({ keepInsideZone: v })
              )}

              {/* 화면 모드 */}
              <div className="pt-2">
                <label className={labelClass}>화면 모드</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['auto', '자동', <Monitor key="a" className="w-3.5 h-3.5" />],
                      ['desktop', 'PC 고정', <Monitor key="d" className="w-3.5 h-3.5" />],
                      ['mobile', '모바일', <Smartphone key="m" className="w-3.5 h-3.5" />]
                    ] as const
                  ).map(([value, label, icon]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onUpdateSettings({ viewMode: value as SiteSettings['viewMode'] })}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                        settings.viewMode === value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {icon}
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500">
                  자동은 창 너비로 판단합니다. PC에서 [모바일]을 고르면 휴대폰 화면으로 미리볼 수 있고,
                  휴대폰에서 [PC 고정]을 고르면 PC 화면 전체를 축소해서 봅니다. 데이터는 항상 같이 이어집니다.
                </p>

                {settings.viewMode === 'mobile' && !isPhoneDevice && (
                  <div className="mt-2">
                    <label className={labelClass}>모바일 미리보기 방향</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ['portrait', '세로 모드'],
                          ['landscape', '가로 모드']
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              mobileOrientation: value as SiteSettings['mobileOrientation']
                            })
                          }
                          className={`py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                            settings.mobileOrientation === value
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <RotateCw className="w-3.5 h-3.5 shrink-0" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <label className={labelClass}>검색 강조 효과</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['pulse', '테두리 깜빡임'],
                      ['bounce', '통통 튀기'],
                      ['glow', '빛나기']
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onUpdateSettings({ searchHighlight: value })}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                        settings.searchHighlight === value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500">
                  검색 시 일치하는 모형에 적용되는 애니메이션입니다.
                </p>
              </div>
            </div>
          )}

          {/* ------------------------------------------------ 모형 기본값 */}
          {tab === 'magnet' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>새 모형 기본 크기</label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      ['sm', '소'],
                      ['md', '중'],
                      ['lg', '대'],
                      ['xl', '특대']
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onUpdateSettings({ defaultMagnetSize: value as MagnetSize })}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                        settings.defaultMagnetSize === value
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>새 모형 기본 색상</label>
                <div className="grid grid-cols-8 gap-2">
                  {MAGNET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      title={c.name}
                      onClick={() => onUpdateSettings({ defaultMagnetColor: c.hex })}
                      style={{ backgroundColor: c.hex }}
                      className={`h-9 rounded-lg border transition-transform ${
                        settings.defaultMagnetColor === c.hex
                          ? 'ring-2 ring-stone-900 border-stone-800 scale-105'
                          : 'border-stone-300 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>새 모형 기본 글꼴</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['handwriting', '손글씨'],
                      ['dodum', '돋움체'],
                      ['sans', '고딕체']
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => onUpdateSettings({ defaultFontStyle: value as MagnetFontStyle })}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                        settings.defaultFontStyle === value
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-bold text-amber-900">삭제 전 확인창은 항상 사용됩니다.</p>
                <p className="mt-1 text-[11px] text-amber-700">모형·구역·시공기사·일정 등 모든 삭제 작업은 확인을 한 번 거친 뒤 실행됩니다.</p>
              </div>
            </div>
          )}

          {/* --------------------------------------------------- 내 계정 */}
          {tab === 'account' && (
            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>표시 이름</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>로그인 아이디</label>
                  <input
                    type="text"
                    value={nextLoginId}
                    onChange={(e) => setNextLoginId(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>연락처</label>
                  <input
                    type="text"
                    value={displayPhone}
                    onChange={(e) => setDisplayPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>소속 부서 / 조</label>
                  <input
                    type="text"
                    value={displayDept}
                    onChange={(e) => setDisplayDept(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <label className={labelClass}>
                  현재 비밀번호 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="변경사항 저장을 위해 입력"
                  className={inputClass}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>새 비밀번호</label>
                  <input
                    type="password"
                    value={nextPw}
                    onChange={(e) => setNextPw(e.target.value)}
                    placeholder="변경 시에만 입력"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>계정 정보 저장</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm('로그아웃 하시겠습니까?')) onLogout();
                }}
                className="w-full py-2.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>로그아웃</span>
              </button>
            </form>
          )}

          {/* ------------------------------------------ 계정 관리 (마스터 / 관리자) */}
          {tab === 'users' && canManageAccounts && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5 whitespace-nowrap">
                  <Users className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span>등록 계정 ({users.length}명)</span>
                </div>

                <p className="text-[11px] text-stone-500 mb-2">
                  계정을 누르면 이름·아이디·비밀번호·권한을 모두 수정할 수 있습니다.
                </p>

                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                  {users.map((u) => {
                    const isEditing = editingUserId === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`rounded-xl border transition-colors ${
                          isEditing
                            ? 'border-blue-500 ring-1 ring-blue-400 bg-blue-50/40'
                            : u.id === activeUserId
                            ? 'border-blue-300 bg-blue-50/40'
                            : 'border-stone-200'
                        }`}
                      >
                        <div className="p-2.5 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => startEditUser(u)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                            title="클릭하여 계정 정보 수정"
                          >
                            <div
                              style={{ backgroundColor: u.avatarColor || '#3b82f6' }}
                              className="w-9 h-9 rounded-xl text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0"
                            >
                              {u.isMaster || u.isAdmin ? (
                                <ShieldCheck className="w-4 h-4" />
                              ) : (
                                u.name.slice(0, 2)
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-stone-900 text-sm truncate whitespace-nowrap">
                                  {u.name}
                                </span>
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-stone-100 text-stone-700 whitespace-nowrap shrink-0">
                                  {u.isMaster ? '마스터' : u.isAdmin ? '관리자' : '일반'}
                                </span>
                              </div>
                              <div className="text-[11px] text-stone-500 truncate whitespace-nowrap">
                                아이디 <span className="font-mono text-stone-700">{u.loginId}</span>
                                {u.department ? ` · ${u.department}` : ''}
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => startEditUser(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isEditing
                                  ? 'bg-blue-600 text-white'
                                  : 'text-stone-500 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                              title="계정 정보 수정"
                            >
                              <UserCog className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={u.isMaster || u.id === activeUserId}
                              className="p-1.5 text-stone-500 enabled:hover:text-rose-600 enabled:hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                              title={
                                u.isMaster
                                  ? '마스터 계정은 삭제할 수 없습니다'
                                  : u.id === activeUserId
                                  ? '접속 중인 계정은 삭제할 수 없습니다'
                                  : '계정 삭제'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isEditing && (
                          <div className="px-2.5 pb-3 pt-1 border-t border-blue-200/70 space-y-2.5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className={labelClass}>이름</label>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className={inputClass}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>로그인 아이디</label>
                                <input
                                  type="text"
                                  value={editLoginId}
                                  onChange={(e) => setEditLoginId(e.target.value)}
                                  className={inputClass}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className={labelClass}>새 비밀번호</label>
                                <input
                                  type="text"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  autoComplete="off"
                                  placeholder="변경할 때만 입력"
                                  className={inputClass}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>직책 / 역할</label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as UserAccount['role'])}
                                  className={`${inputClass} bg-white`}
                                >
                                  <option value="작업자">작업자</option>
                                  <option value="시공반장">시공반장</option>
                                  <option value="현장소장">현장소장</option>
                                  <option value="대표">대표</option>
                                  <option value="게스트">게스트</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className={labelClass}>연락처</label>
                                <input
                                  type="text"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  placeholder="010-0000-0000"
                                  className={inputClass}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>소속 부서 / 조</label>
                                <input
                                  type="text"
                                  value={editDept}
                                  onChange={(e) => setEditDept(e.target.value)}
                                  className={inputClass}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={u.isMaster}
                              onClick={() => setEditIsAdmin((prev) => !prev)}
                              className="w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border border-stone-200 bg-white enabled:hover:bg-stone-50 transition-colors text-left disabled:opacity-60"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-stone-800 whitespace-nowrap">
                                  관리자 권한
                                </div>
                                <div className="text-[10px] text-stone-500 truncate">
                                  {u.isMaster
                                    ? '마스터 계정은 항상 모든 권한을 가집니다'
                                    : '계정 추가·삭제 및 설정 관리 권한'}
                                </div>
                              </div>
                              <span
                                className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 ${
                                  u.isMaster || editIsAdmin ? 'bg-blue-600' : 'bg-stone-300'
                                }`}
                                style={{ height: '1.375rem' }}
                              >
                                <span
                                  className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all ${
                                    u.isMaster || editIsAdmin ? 'left-[1.25rem]' : 'left-0.5'
                                  }`}
                                  style={{ width: '1.125rem', height: '1.125rem' }}
                                />
                              </span>
                            </button>

                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setEditingUserId(null)}
                                className="flex-1 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors whitespace-nowrap"
                              >
                                취소
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleSaveEditedUser(u)}
                                className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                              >
                                이 계정 정보 저장
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleCreateUser} className="pt-4 border-t border-stone-200 space-y-3">
                <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5 whitespace-nowrap">
                  <UserPlus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>새 계정 추가</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>
                      이름 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="예: 홍길동"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      로그인 아이디 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLoginId}
                      onChange={(e) => setNewLoginId(e.target.value)}
                      placeholder="예: hong"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>계정 권한</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewIsAdmin(false)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        !newIsAdmin ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <span className="block text-xs font-extrabold text-stone-900">일반 권한</span>
                      <span className="block mt-1 text-[10px] text-stone-500">본인 보드·일정·배치표 사용</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewIsAdmin(true)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        newIsAdmin ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-200' : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <span className="flex items-center gap-1 text-xs font-extrabold text-stone-900"><ShieldCheck className="w-3.5 h-3.5 text-amber-600" />관리자 권한</span>
                      <span className="block mt-1 text-[10px] text-stone-500">계정 생성·삭제·비밀번호 초기화 가능</span>
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-stone-500">관리자는 마스터와 같은 운영 권한을 갖지만 최초 마스터 계정과 복구키는 변경할 수 없습니다.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>
                      비밀번호 <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>직책 / 역할</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserAccount['role'])}
                      className={`${inputClass} bg-white`}
                    >
                      <option value="작업자">작업자</option>
                      <option value="시공반장">시공반장</option>
                      <option value="현장소장">현장소장</option>
                      <option value="대표">대표</option>
                      <option value="게스트">게스트</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>연락처</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>소속 부서 / 조</label>
                    <input
                      type="text"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 shrink-0" />
                  <span>계정 추가</span>
                </button>
              </form>
            </div>
          )}

          {/* --------------------------------------------------- 데이터 */}
          {tab === 'data' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLayoutLibrary();
                }}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-left"
              >
                <FolderOpen className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-stone-800 whitespace-nowrap">
                    배치표 저장 / 불러오기
                  </div>
                  <div className="text-[11px] text-stone-500">
                    현재 배치 상태를 저장하거나 이전에 저장한 배치표를 불러옵니다
                  </div>
                </div>
              </button>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-600 leading-relaxed">
                로그인한 계정의 보드·배치표·캘린더·설정은 클라우드에 저장됩니다. 비로그인 상태는 해당 브라우저에서만 사용됩니다. 파일 내보내기는 별도 백업용으로 이용하세요.
              </div>
            </div>
          )}

          {/* ------------------------------------------- 대시보드 초기화 */}
          {tab === 'reset' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h4 className="text-sm font-extrabold text-amber-900">초기화 후 기본 구성</h4>
                <ul className="mt-2 space-y-1.5 text-xs text-amber-800 list-disc pl-4">
                  <li>좌측·우측 넓은 구역 2개</li>
                  <li>각 구역 최대 수용인원 20명</li>
                  <li>각 구역에 예시 모형 2개씩(총 4개)</li>
                  <li>구역과 모형의 입력란은 어떤 내용을 적는지 알 수 있는 예시값으로 구성</li>
                </ul>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 leading-relaxed">
                현재 모형·구역·시공기사명단·캘린더 일정이 기본 데이터로 교체됩니다. 초기화 직후에는 Ctrl+Z로 되돌릴 수 있습니다.
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onResetBoard();
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                대시보드 초기화 실행
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
