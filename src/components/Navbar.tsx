import React from 'react';
import { UserAccount } from '../types';
import { HardHat, FolderOpen, Calendar, Search, Undo2, Redo2, Settings, ShieldCheck, LogIn } from 'lucide-react';

interface NavbarProps {
  boardTitle: string;
  companyName: string;
  activeUser: UserAccount;
  isLoggedIn: boolean;
  userPendingSchedulesCount: number;
  searchFilter: string;
  canUndo: boolean;
  canRedo: boolean;
  onSearchChange: (query: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenLayoutLibrary: () => void;
  onOpenScheduleHistory: () => void;
  onOpenSettings: () => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  boardTitle,
  companyName,
  activeUser,
  isLoggedIn,
  userPendingSchedulesCount,
  searchFilter,
  canUndo,
  canRedo,
  onSearchChange,
  onUndo,
  onRedo,
  onOpenLayoutLibrary,
  onOpenScheduleHistory,
  onOpenSettings,
  onOpenLogin
}) => {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40 select-none shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* 좌측 로고 & 제목 */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <HardHat className="w-5 h-5" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-extrabold text-stone-900 text-sm sm:text-base truncate whitespace-nowrap">
                {boardTitle}
              </h1>
              {companyName && (
                <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap shrink-0">
                  {companyName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 중앙 검색 */}
        <div className="hidden lg:flex items-center relative w-60 shrink-0">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="기사 이름, 직책, 연락처 검색..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-xs text-stone-400 hover:text-stone-600"
              title="검색어 지우기"
            >
              ✕
            </button>
          )}
        </div>

        {/* 우측 액션 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center bg-stone-100 rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1.5 rounded-lg text-stone-600 enabled:hover:bg-white enabled:hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="되돌리기 (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1.5 rounded-lg text-stone-600 enabled:hover:bg-white enabled:hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="다시 실행 (Ctrl+Shift+Z / Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 배치표 저장 / 불러오기 */}
          <button
            type="button"
            onClick={onOpenLayoutLibrary}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-all whitespace-nowrap shrink-0"
            title="현재 배치표를 저장하거나 저장된 배치표를 불러옵니다"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="hidden sm:inline">배치표 저장/불러오기</span>
          </button>

          {/* 일정 캘린더 */}
          <button
            type="button"
            onClick={onOpenScheduleHistory}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-all whitespace-nowrap shrink-0"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="hidden sm:inline">일정 캘린더</span>
            <span className="sm:hidden">캘린더</span>
            {userPendingSchedulesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                {userPendingSchedulesCount}
              </span>
            )}
          </button>

          {/* 계정 / 로그인 */}
          {isLoggedIn ? (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2 p-1 sm:pl-1.5 sm:pr-2.5 rounded-xl border border-stone-200 hover:border-blue-300 bg-stone-50 hover:bg-blue-50 transition-colors shrink-0 group"
              title="사이트 설정 관리"
            >
              <div style={{ backgroundColor: activeUser.avatarColor || '#3b82f6' }} className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
                {activeUser.isMaster ? <ShieldCheck className="w-3.5 h-3.5" /> : activeUser.name.slice(0, 1)}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-stone-900 whitespace-nowrap">{activeUser.name}</span>
                <span className="text-[10px] text-stone-500 whitespace-nowrap">{activeUser.isMaster ? '마스터 관리자' : activeUser.role}</span>
              </div>
              <Settings className="w-3.5 h-3.5 text-stone-400 group-hover:text-blue-600 transition-colors shrink-0" />
            </button>
          ) : (
            <button type="button" onClick={onOpenLogin} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs whitespace-nowrap">
              <LogIn className="w-3.5 h-3.5" /> 로그인
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
