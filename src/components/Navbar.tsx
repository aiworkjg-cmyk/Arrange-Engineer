import React from 'react';
import { UserAccount, BoardState, ScheduleItem } from '../types';
import { Plus, Layout, FileText, UserCheck, Calendar, Search, Sparkles, HardDrive, Shield, RefreshCw } from 'lucide-react';

interface NavbarProps {
  boardTitle: string;
  activeUser: UserAccount;
  userPendingSchedulesCount: number;
  searchFilter: string;
  onSearchChange: (query: string) => void;
  onOpenAddMagnet: () => void;
  onOpenAddZone: () => void;
  onOpenMarkdownBackup: () => void;
  onOpenScheduleHistory: () => void;
  onOpenAuthModal: () => void;
  onResetBoard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  boardTitle,
  activeUser,
  userPendingSchedulesCount,
  searchFilter,
  onSearchChange,
  onOpenAddMagnet,
  onOpenAddZone,
  onOpenMarkdownBackup,
  onOpenScheduleHistory,
  onOpenAuthModal,
  onResetBoard
}) => {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40 select-none shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Left Brand & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
            🧲
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-stone-900 text-sm sm:text-base truncate">
                {boardTitle}
              </h1>
              <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                실시간 드래그&배치
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden sm:block truncate">
              자석 모형 자유 배치 • 일정 및 작업 이력 관리 • 마크다운 로컬 백업
            </p>
          </div>
        </div>

        {/* Center Search Input */}
        <div className="hidden lg:flex items-center relative w-64">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="모형 이름, 직책, 구역 검색..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          />
          {searchFilter && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 text-xs text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Add Magnet */}
          <button
            onClick={onOpenAddMagnet}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
            title="새 모형 자석 추가"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>모형 추가</span>
          </button>

          {/* Add Zone */}
          <button
            onClick={onOpenAddZone}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all"
            title="새 구역 추가"
          >
            <Layout className="w-3.5 h-3.5" />
            <span className="hidden md:inline">구역 추가</span>
          </button>

          {/* Markdown Backup / Restore */}
          <button
            onClick={onOpenMarkdownBackup}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl transition-all"
            title="마크다운 백업 및 복원"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">마크다운 백업</span>
          </button>

          {/* User Schedule & History Portal Button */}
          <button
            onClick={onOpenScheduleHistory}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">내 일정 / 작업 이력</span>
            <span className="sm:hidden">내 일정</span>
            {userPendingSchedulesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                {userPendingSchedulesCount}
              </span>
            )}
          </button>

          {/* Active User Account Switcher */}
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 p-1 sm:pl-1.5 sm:pr-2.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 transition-colors"
            title="계정 전환 및 로그인"
          >
            <div
              style={{ backgroundColor: activeUser.avatarColor || '#3b82f6' }}
              className="w-6 h-6 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-2xs"
            >
              {activeUser.name.slice(0, 1)}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none">
              <span className="text-xs font-bold text-stone-900">{activeUser.name}</span>
              <span className="text-[10px] text-stone-500">{activeUser.role}</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
