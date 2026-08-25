import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CircleCheck, CirclePlus, LocateFixed, Pencil, Phone, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  InstallerProfile,
  InstallerRole,
  InstallerStatus,
  MagnetToken,
  ScheduleItem,
  SiteSettings
} from '../types';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface RosterSheetModalProps {
  isOpen: boolean;
  installers: InstallerProfile[];
  tokens: MagnetToken[];
  schedules: ScheduleItem[];
  settings: SiteSettings;
  onClose: () => void;
  onAddInstaller: () => void;
  onEditInstaller: (installer: InstallerProfile) => void;
  onDeleteInstallers: (installerIds: string[]) => void;
  onBulkUpdate: (installerIds: string[], patch: Partial<InstallerProfile>) => void;
  onCreateMagnet: (installer: InstallerProfile) => void;
  onLocateMagnet: (tokenId: string) => void;
}

const INSTALLER_ROLES: InstallerRole[] = ['팀장', '사수', '부사수'];
const STATUS_OPTIONS: Array<{ id: InstallerStatus; label: string; className: string }> = [
  { id: 'available', label: '배정 가능', className: 'bg-emerald-100 text-emerald-700' },
  { id: 'assigned', label: '배정 중', className: 'bg-blue-100 text-blue-700' },
  { id: 'leave', label: '휴무', className: 'bg-amber-100 text-amber-700' },
  { id: 'inactive', label: '비활성', className: 'bg-stone-200 text-stone-600' }
];

export const RosterSheetModal: React.FC<RosterSheetModalProps> = ({
  isOpen,
  installers,
  tokens,
  schedules,
  settings,
  onClose,
  onAddInstaller,
  onEditInstaller,
  onDeleteInstallers,
  onBulkUpdate,
  onCreateMagnet,
  onLocateMagnet
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRole, setBulkRole] = useState<InstallerRole>('부사수');
  const [bulkStatus, setBulkStatus] = useState<InstallerStatus>('available');

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds([]);
    setSearchTerm('');
  }, [isOpen]);

  useEffect(() => {
    const existingIds = new Set(installers.map((installer) => installer.id));
    setSelectedIds((current) => current.filter((id) => existingIds.has(id)));
  }, [installers]);

  const filteredInstallers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return installers.filter((installer) =>
      !query ||
      installer.name.toLowerCase().includes(query) ||
      installer.role.toLowerCase().includes(query) ||
      installer.phone?.includes(query) ||
      installer.email?.toLowerCase().includes(query)
    );
  }, [installers, searchTerm]);

  if (!isOpen) return null;

  const selectedSet = new Set(selectedIds);
  const allVisibleSelected =
    filteredInstallers.length > 0 && filteredInstallers.every((installer) => selectedSet.has(installer.id));

  const toggleInstaller = (installerId: string) => {
    setSelectedIds((current) =>
      current.includes(installerId)
        ? current.filter((id) => id !== installerId)
        : [...current, installerId]
    );
  };

  const toggleVisible = () => {
    const visibleIds = new Set(filteredInstallers.map((installer) => installer.id));
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.has(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const scheduleCount = (installer: InstallerProfile) =>
    schedules.filter(
      (schedule) => schedule.userId === installer.id || schedule.userName === installer.name
    ).length;

  const matchingMagnet = (installer: InstallerProfile) =>
    tokens.find((token) => token.assignedUserId === installer.id) ||
    tokens.find((token) => token.title === installer.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]" onClick={(event) => event.stopPropagation()}>
        <header className="p-5 border-b border-stone-200 bg-emerald-50/60 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-extrabold text-stone-900 text-base sm:text-lg truncate">{settings.rosterTitle || '시공기사 명단'}</h3>
                {settings.companyName && <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded whitespace-nowrap">{settings.companyName}</span>}
              </div>
              <p className="text-xs text-stone-600 mt-1">기사 이름을 더블클릭하면 직책·상태·개인정보 상세 설정이 열립니다. 모형 목록과는 독립적으로 관리됩니다.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full"><X className="w-5 h-5" /></button>
        </header>

        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="relative w-full xl:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="이름, 직책, 연락처, 이메일 검색" className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700">{selectedIds.length}명 선택</span>
            <select value={bulkRole} onChange={(event) => setBulkRole(event.target.value as InstallerRole)} className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white">{INSTALLER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select>
            <button type="button" disabled={!selectedIds.length} onClick={() => onBulkUpdate(selectedIds, { role: bulkRole })} className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 rounded-lg border border-blue-200">직책 일괄 변경</button>
            <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as InstallerStatus)} className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white">{STATUS_OPTIONS.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
            <button type="button" disabled={!selectedIds.length} onClick={() => onBulkUpdate(selectedIds, { status: bulkStatus })} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 rounded-lg border border-emerald-200">상태 일괄 변경</button>
            <button type="button" disabled={!selectedIds.length} onClick={() => onDeleteInstallers(selectedIds)} className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 rounded-lg border border-rose-200 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />선택 삭제</button>
            <button type="button" onClick={onAddInstaller} className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" />기사 추가</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar p-5">
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs min-w-[1060px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead><tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                <th className="py-2.5 px-3 text-center w-12"><button type="button" onClick={toggleVisible} title="표시된 기사 전체 선택" className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${allVisibleSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300'}`}>{allVisibleSelected && <Check className="w-3.5 h-3.5" />}</button></th>
                <th className="py-2.5 px-3 text-center w-12">No.</th><th className="py-2.5 px-3">이름 (더블클릭: 상세 설정)</th><th className="py-2.5 px-3">직책</th><th className="py-2.5 px-3">연락처</th><th className="py-2.5 px-3">이메일</th><th className="py-2.5 px-3 text-center">상태</th><th className="py-2.5 px-3 text-center">모형</th><th className="py-2.5 px-3 text-center">배정 일정</th><th className="py-2.5 px-3 text-right">관리</th>
              </tr></thead>
              <tbody className="divide-y divide-stone-100">
                {filteredInstallers.map((installer, index) => {
                  const checked = selectedSet.has(installer.id);
                  const status = STATUS_OPTIONS.find((item) => item.id === installer.status) || STATUS_OPTIONS[0];
                  const magnet = matchingMagnet(installer);
                  return <tr key={installer.id} className={`transition-colors ${checked ? 'bg-emerald-50' : 'hover:bg-emerald-50/40'}`}>
                    <td className="py-2.5 px-3 text-center"><button type="button" onClick={() => toggleInstaller(installer.id)} className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300'}`}>{checked && <Check className="w-3.5 h-3.5" />}</button></td>
                    <td className="py-2.5 px-3 text-center text-stone-400 font-mono">{index + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-stone-900"><button type="button" onDoubleClick={() => onEditInstaller(installer)} className="hover:text-emerald-700 cursor-default" title="더블클릭하여 상세 설정">{installer.name}</button></td>
                    <td className="py-2.5 px-3 text-stone-700 font-bold">{installer.role}</td>
                    <td className="py-2.5 px-3 text-stone-600 font-mono">{installer.phone ? <a href={`tel:${installer.phone}`} className="text-blue-600 hover:underline inline-flex items-center gap-1"><Phone className="w-3 h-3" />{installer.phone}</a> : '-'}</td>
                    <td className="py-2.5 px-3 text-stone-600">{installer.email || '-'}</td>
                    <td className="py-2.5 px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.className}`}>{status.label}</span></td>
                    <td className="py-2.5 px-3 text-center">{magnet ? <button type="button" onClick={() => onLocateMagnet(magnet.id)} title="보드에서 모형 찾기" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"><CircleCheck className="w-3 h-3" />생성됨<LocateFixed className="w-3 h-3" /></button> : <button type="button" onClick={() => onCreateMagnet(installer)} title="기본 설정으로 모형 생성" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"><CirclePlus className="w-3 h-3" />모형 생성</button>}</td>
                    <td className="py-2.5 px-3 text-center"><span className="inline-flex items-center gap-1 text-violet-700 font-bold"><CalendarDays className="w-3 h-3" />{scheduleCount(installer)}건</span></td>
                    <td className="py-2.5 px-3 text-right"><div className="inline-flex gap-1"><button type="button" onClick={() => onEditInstaller(installer)} title="상세 설정" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"><Pencil className="w-3.5 h-3.5" /></button><button type="button" onClick={() => onDeleteInstallers([installer.id])} title="기사 삭제" className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button></div></td>
                  </tr>;
                })}
              </tbody>
            </table>
            {filteredInstallers.length === 0 && <div className="py-16 text-center text-sm text-stone-400">등록된 시공기사가 없습니다.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
