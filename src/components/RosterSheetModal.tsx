import React, { useEffect, useMemo, useState } from 'react';
import { BoardZone, InstallerRole, MagnetStatus, MagnetToken, ScheduleItem, SiteSettings } from '../types';
import { CalendarDays, Check, Phone, Search, Users, UserPlus, X } from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface RosterSheetModalProps {
  isOpen: boolean;
  tokens: MagnetToken[];
  zones: BoardZone[];
  schedules: ScheduleItem[];
  settings: SiteSettings;
  onClose: () => void;
  onSelectToken: (tokenId: string) => void;
  onOpenSchedule: (tokenId: string) => void;
  onAddNewMember: (name: string, phone: string, role: InstallerRole) => void;
  onBulkUpdate: (tokenIds: string[], patch: Partial<MagnetToken>) => void;
}

const INSTALLER_ROLES: InstallerRole[] = ['팀장', '사수', '부사수'];
const STATUS_OPTIONS: Array<{ id: MagnetStatus; label: string }> = [
  { id: 'active', label: '작업중' },
  { id: 'assigned', label: '배정됨' },
  { id: 'waiting', label: '대기' },
  { id: 'break', label: '휴식' },
  { id: 'done', label: '완료' }
];

export const RosterSheetModal: React.FC<RosterSheetModalProps> = ({
  isOpen, tokens, zones, schedules, settings, onClose, onSelectToken,
  onOpenSchedule, onAddNewMember, onBulkUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<InstallerRole>('부사수');
  const [bulkRole, setBulkRole] = useState<InstallerRole>('부사수');
  const [bulkStatus, setBulkStatus] = useState<MagnetStatus>('assigned');

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds([]);
    setSearchTerm('');
  }, [isOpen]);

  const filteredTokens = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return tokens.filter((token) =>
      !query || token.title.toLowerCase().includes(query) ||
      token.subtitle?.toLowerCase().includes(query) || token.phone?.includes(query)
    );
  }, [searchTerm, tokens]);

  if (!isOpen) return null;

  const selectedSet = new Set(selectedIds);
  const allVisibleSelected = filteredTokens.length > 0 && filteredTokens.every((token) => selectedSet.has(token.id));
  const scheduleCount = (token: MagnetToken) => schedules.filter((schedule) =>
    schedule.userId === token.assignedUserId || schedule.userName === token.title
  ).length;

  const toggleToken = (tokenId: string) => setSelectedIds((current) =>
    current.includes(tokenId) ? current.filter((id) => id !== tokenId) : [...current, tokenId]
  );

  const toggleVisible = () => {
    const visibleIds = new Set(filteredTokens.map((token) => token.id));
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !visibleIds.has(id))
      : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  const handleAddSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    onAddNewMember(newName.trim(), newPhone.trim(), newRole);
    setNewName('');
    setNewPhone('');
    setNewRole('부사수');
    setShowAddForm(false);
  };

  const applyBulk = (patch: Partial<MagnetToken>) => {
    if (selectedIds.length) onBulkUpdate(selectedIds, patch);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]" onClick={(event) => event.stopPropagation()}>
        <header className="p-5 border-b border-stone-200 bg-amber-50/60 flex items-start justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-black text-lg shadow-xs">📋</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-extrabold text-stone-900 text-base sm:text-lg truncate">{settings.rosterTitle}</h3>
                {settings.companyName && <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded whitespace-nowrap">{settings.companyName}</span>}
              </div>
              <p className="text-xs text-stone-600 mt-1">기사 이름을 더블클릭하면 해당 기사의 일정 캘린더가 열립니다.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full"><X className="w-5 h-5" /></button>
        </header>

        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="relative w-full xl:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="이름, 직책, 연락처 검색..." className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-stone-200 text-xs font-bold text-stone-700"><Users className="w-3.5 h-3.5 text-blue-600" />{selectedIds.length}명 선택</span>
            <select value={bulkRole} onChange={(event) => setBulkRole(event.target.value as InstallerRole)} className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white">{INSTALLER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select>
            <button type="button" disabled={!selectedIds.length} onClick={() => applyBulk({ subtitle: bulkRole })} className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 rounded-lg border border-blue-200">직책 일괄 변경</button>
            <select value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value as MagnetStatus)} className="px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white">{STATUS_OPTIONS.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
            <button type="button" disabled={!selectedIds.length} onClick={() => applyBulk({ status: bulkStatus })} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 rounded-lg border border-emerald-200">상태 일괄 변경</button>
            <button type="button" onClick={() => setShowAddForm((current) => !current)} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1"><UserPlus className="w-3.5 h-3.5" />{showAddForm ? '닫기' : '기사 추가'}</button>
          </div>
        </div>

        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="p-4 bg-blue-50/60 border-b border-blue-100 flex flex-wrap items-center gap-2 text-xs">
            <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="이름 *" className="px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <input value={newPhone} onChange={(event) => setNewPhone(event.target.value)} placeholder="연락처 (010-...)" className="px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={newRole} onChange={(event) => setNewRole(event.target.value as InstallerRole)} className="px-3 py-2 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">{INSTALLER_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select>
            <button type="submit" className="px-3 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs">추가 및 보드 배치</button>
          </form>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar p-5">
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs min-w-[920px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead><tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                <th className="py-2.5 px-3 text-center w-12"><button type="button" onClick={toggleVisible} title="표시된 기사 전체 선택" className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${allVisibleSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-stone-300'}`}>{allVisibleSelected && <Check className="w-3.5 h-3.5" />}</button></th>
                <th className="py-2.5 px-3 text-center w-12">No.</th><th className="py-2.5 px-3">이름 (더블클릭: 일정)</th><th className="py-2.5 px-3">직책</th><th className="py-2.5 px-3">연락처</th><th className="py-2.5 px-3">배정 구역</th><th className="py-2.5 px-3 text-center">상태</th><th className="py-2.5 px-3 text-center">일정</th><th className="py-2.5 px-3 text-right">보드</th>
              </tr></thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTokens.map((token, index) => {
                  const zone = zones.find((item) => item.id === token.zoneId);
                  const checked = selectedSet.has(token.id);
                  const status = STATUS_OPTIONS.find((item) => item.id === token.status)?.label || '완료';
                  return <tr key={token.id} className={`transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-blue-50/40'}`}>
                    <td className="py-2.5 px-3 text-center"><button type="button" onClick={() => toggleToken(token.id)} className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-stone-300'}`}>{checked && <Check className="w-3.5 h-3.5" />}</button></td>
                    <td className="py-2.5 px-3 text-center text-stone-400 font-mono">{token.orderNumber || index + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-stone-900"><button type="button" onDoubleClick={() => onOpenSchedule(token.id)} className="flex items-center gap-2 hover:text-blue-700" title="더블클릭하여 일정 캘린더 보기"><span style={{ backgroundColor: token.color }} className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs shrink-0" />{token.title}</button></td>
                    <td className="py-2.5 px-3 text-stone-700 font-bold">{INSTALLER_ROLES.includes(token.subtitle as InstallerRole) ? token.subtitle : '-'}</td>
                    <td className="py-2.5 px-3 text-stone-600 font-mono">{token.phone ? <a href={`tel:${token.phone}`} className="text-blue-600 hover:underline flex items-center gap-1"><Phone className="w-3 h-3" />{token.phone}</a> : '-'}</td>
                    <td className="py-2.5 px-3">{zone ? <span style={{ borderColor: zone.borderColor }} className="px-2 py-0.5 rounded text-[11px] font-semibold border bg-white text-stone-800 inline-block">{zone.title}</span> : <span className="text-stone-400">자유배치</span>}</td>
                    <td className="py-2.5 px-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${token.status === 'active' ? 'bg-green-100 text-green-700' : token.status === 'assigned' ? 'bg-blue-100 text-blue-700' : token.status === 'waiting' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>{status}</span></td>
                    <td className="py-2.5 px-3 text-center"><button type="button" onClick={() => onOpenSchedule(token.id)} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-md"><CalendarDays className="w-3 h-3" />{scheduleCount(token)}건</button></td>
                    <td className="py-2.5 px-3 text-right"><button type="button" onClick={() => { onSelectToken(token.id); onClose(); }} className="px-2.5 py-1 text-[11px] font-bold text-white bg-stone-800 hover:bg-blue-600 rounded-md">위치 확인</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
