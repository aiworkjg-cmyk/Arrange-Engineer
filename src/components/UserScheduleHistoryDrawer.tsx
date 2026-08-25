import React, { useEffect, useMemo, useState } from 'react';
import { BoardZone, InstallerProfile, MagnetToken, ScheduleItem } from '../types';
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Edit3,
  Filter, MapPin, Plus, Search, Trash2, UserRound, X
} from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface UserScheduleHistoryDrawerProps {
  isOpen: boolean;
  allSchedules: ScheduleItem[];
  installers: InstallerProfile[];
  tokens: MagnetToken[];
  zones: BoardZone[];
  initialTokenId: string | null;
  onClose: () => void;
  onAddSchedule: (schedule: Omit<ScheduleItem, 'id'>) => void;
  onUpdateSchedule: (scheduleId: string, patch: Partial<ScheduleItem>) => void;
  onDeleteSchedule: (scheduleId: string) => boolean;
  onLocateToken: (tokenId: string) => void;
}

const STATUS_LABELS: Record<ScheduleItem['status'], string> = {
  scheduled: '예정', 'in-progress': '진행중', completed: '완료', cancelled: '취소'
};
const STATUS_STYLES: Record<ScheduleItem['status'], string> = {
  scheduled: 'bg-violet-50 text-violet-900 border-violet-500',
  'in-progress': 'bg-blue-50 text-blue-900 border-blue-500',
  completed: 'bg-emerald-50 text-emerald-900 border-emerald-500',
  cancelled: 'bg-stone-100 text-stone-500 border-stone-400 line-through'
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const todayIso = () => formatLocalDate(new Date());

interface ScheduleFormProps {
  schedule?: ScheduleItem;
  defaultDate?: string;
  defaultInstallerId?: string;
  installers: InstallerProfile[];
  zones: BoardZone[];
  onCancel: () => void;
  onSubmit: (data: Omit<ScheduleItem, 'id'>) => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  schedule, defaultDate, defaultInstallerId, installers, zones, onCancel, onSubmit
}) => {
  const initialInstaller = installers.find((item) => item.id === defaultInstallerId) || installers[0];
  const [installerId, setInstallerId] = useState(schedule?.userId || initialInstaller?.id || '');
  const [title, setTitle] = useState(schedule?.title || '');
  const [startDate, setStartDate] = useState(schedule?.date || defaultDate || todayIso());
  const [endDate, setEndDate] = useState(schedule?.endDate || schedule?.date || defaultDate || todayIso());
  const [timeRange, setTimeRange] = useState(schedule?.timeRange || '09:00 ~ 18:00');
  const [zoneId, setZoneId] = useState(schedule?.zoneId || zones[0]?.id || '');
  const [location, setLocation] = useState(schedule?.location || '');
  const [status, setStatus] = useState<ScheduleItem['status']>(schedule?.status || 'scheduled');
  const [notes, setNotes] = useState(schedule?.notes || '');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const installer = installers.find((item) => item.id === installerId);
    if (!installer || !title.trim()) return;
    const zone = zones.find((item) => item.id === zoneId);
    const normalizedStart = startDate <= endDate ? startDate : endDate;
    const normalizedEnd = startDate <= endDate ? endDate : startDate;
    onSubmit({
      userId: installer.id,
      userName: installer.name,
      title: title.trim(),
      date: normalizedStart,
      endDate: normalizedEnd,
      timeRange: timeRange.trim() || '시간 미정',
      zoneId: zone?.id,
      zoneName: zone?.title || '미지정 구역',
      role: installer.role,
      status,
      location: location.trim() || zone?.title || '현장',
      notes: notes.trim() || undefined
    });
  };

  const fieldClass = 'w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500';
  return <form onSubmit={submit} className="p-4 overflow-y-auto custom-scrollbar space-y-3">
    <div><h3 className="font-bold text-stone-900">{schedule ? '일정 간편 수정' : '새 일정 배정'}</h3><p className="text-[11px] text-stone-500 mt-1">기간을 지정하면 여러 날짜에 걸쳐 표시됩니다.</p></div>
    <label className="block text-xs font-bold text-stone-700">시공기사<select value={installerId} onChange={(e) => setInstallerId(e.target.value)} className={`${fieldClass} mt-1`} required><option value="">기사 선택</option>{installers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></label>
    <label className="block text-xs font-bold text-stone-700">일정 / 현장명<input value={title} onChange={(e) => setTitle(e.target.value)} className={`${fieldClass} mt-1`} required autoFocus /></label>
    <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-stone-700">시작일<input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} className={`${fieldClass} mt-1`} /></label><label className="text-xs font-bold text-stone-700">종료일<input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${fieldClass} mt-1`} /></label></div>
    <label className="block text-xs font-bold text-stone-700">시간<input value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className={`${fieldClass} mt-1`} /></label>
    <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-stone-700">구역<select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={`${fieldClass} mt-1`}><option value="">미지정</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.title}</option>)}</select></label><label className="text-xs font-bold text-stone-700">상태<select value={status} onChange={(e) => setStatus(e.target.value as ScheduleItem['status'])} className={`${fieldClass} mt-1`}>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
    <label className="block text-xs font-bold text-stone-700">현장 위치<input value={location} onChange={(e) => setLocation(e.target.value)} className={`${fieldClass} mt-1`} placeholder="주소 또는 현장 위치" /></label>
    <label className="block text-xs font-bold text-stone-700">상세 설명<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={`${fieldClass} mt-1 resize-none`} /></label>
    <div className="flex gap-2"><button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-bold rounded-lg bg-stone-200 text-stone-700">취소</button><button type="submit" className="flex-1 py-2 text-xs font-bold rounded-lg bg-violet-600 text-white">{schedule ? '수정 저장' : '일정 등록'}</button></div>
  </form>;
};

export const UserScheduleHistoryDrawer: React.FC<UserScheduleHistoryDrawerProps> = ({
  isOpen, allSchedules, installers, tokens, zones, initialTokenId, onClose,
  onAddSchedule, onUpdateSchedule, onDeleteSchedule, onLocateToken
}) => {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedInstallerId, setSelectedInstallerId] = useState('all');
  const [installerQuery, setInstallerQuery] = useState('');
  const [scheduleQuery, setScheduleQuery] = useState('');
  const [onlyWithSchedules, setOnlyWithSchedules] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ScheduleItem['status']>('all');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ scheduleId?: string; defaultDate?: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ scheduleId: string; x: number; y: number } | null>(null);

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const sourceToken = initialTokenId ? tokens.find((token) => token.id === initialTokenId) : undefined;
    const match = installers.find((item) => item.id === initialTokenId) ||
      installers.find((item) => item.id === sourceToken?.assignedUserId || item.name === sourceToken?.title);
    setSelectedInstallerId(match?.id || 'all');
    setEditor(null);
    setSelectedScheduleId(null);
    setContextMenu(null);
  }, [initialTokenId, installers, isOpen, tokens]);

  const scheduleMatchesInstaller = (schedule: ScheduleItem, installer: InstallerProfile) =>
    schedule.userId === installer.id || schedule.userName === installer.name;
  const visibleInstallers = useMemo(() => {
    const query = installerQuery.trim().toLowerCase();
    return installers.filter((installer) => {
      const matchesQuery = !query || installer.name.toLowerCase().includes(query) || installer.role.toLowerCase().includes(query);
      return matchesQuery && (!onlyWithSchedules || allSchedules.some((schedule) => scheduleMatchesInstaller(schedule, installer)));
    });
  }, [allSchedules, installerQuery, installers, onlyWithSchedules]);

  const filteredSchedules = useMemo(() => {
    const installer = installers.find((item) => item.id === selectedInstallerId);
    const query = scheduleQuery.trim().toLowerCase();
    return allSchedules.filter((schedule) =>
      (!installer || scheduleMatchesInstaller(schedule, installer)) &&
      (statusFilter === 'all' || schedule.status === statusFilter) &&
      (!query || `${schedule.userName} ${schedule.title} ${schedule.location} ${schedule.notes || ''}`.toLowerCase().includes(query))
    );
  }, [allSchedules, installers, scheduleQuery, selectedInstallerId, statusFilter]);

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [month]);

  if (!isOpen) return null;
  const selectedSchedule = allSchedules.find((item) => item.id === selectedScheduleId);
  const editingSchedule = editor?.scheduleId ? allSchedules.find((item) => item.id === editor.scheduleId) : undefined;
  const defaultInstallerId = selectedInstallerId === 'all' ? undefined : selectedInstallerId;
  const schedulesForDate = (date: string) => filteredSchedules.filter((item) => date >= item.date && date <= (item.endDate || item.date));
  const deleteSchedule = (scheduleId: string) => {
    if (!onDeleteSchedule(scheduleId)) return;
    if (selectedScheduleId === scheduleId) setSelectedScheduleId(null);
    if (editor?.scheduleId === scheduleId) setEditor(null);
    setContextMenu(null);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/50 backdrop-blur-xs">
    <div className="w-full max-w-[1540px] h-[min(920px,95vh)] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col" onClick={() => setContextMenu(null)}>
      <header className="px-5 py-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><CalendarDays className="w-5 h-5" /></div><div><h2 className="font-extrabold text-stone-900">일정 캘린더</h2><p className="text-xs text-stone-500">빈 날짜 더블클릭: 일정 추가 · 일정 더블클릭: 상세보기 · 우클릭: 간편수정/삭제</p></div></div>
        <button type="button" onClick={onClose} aria-label="캘린더 닫기" className="p-2 rounded-full hover:bg-stone-200 text-stone-500"><X className="w-5 h-5" /></button>
      </header>

      <div className="px-4 py-2.5 border-b border-stone-200 bg-white flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" /><input value={scheduleQuery} onChange={(e) => setScheduleQuery(e.target.value)} placeholder="일정명, 기사, 위치, 설명 검색" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300" /></label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"><option value="all">전체 상태</option>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-stone-500">{Object.entries(STATUS_LABELS).map(([id, label]) => <span key={id} className={`px-2 py-1 rounded border-l-4 ${STATUS_STYLES[id as ScheduleItem['status']]}`}>{label}</span>)}</div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[240px_minmax(620px,1fr)_340px]">
        <aside className="min-h-0 border-b xl:border-b-0 xl:border-r border-stone-200 flex flex-col bg-stone-50/50">
          <div className="p-3 border-b border-stone-200 space-y-2"><label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" /><input value={installerQuery} onChange={(e) => setInstallerQuery(e.target.value)} placeholder="시공기사 검색" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300 bg-white" /></label><label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer"><input type="checkbox" checked={onlyWithSchedules} onChange={(e) => setOnlyWithSchedules(e.target.checked)} className="accent-violet-600" /><Filter className="w-3.5 h-3.5" />일정 있는 기사만</label></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"><button type="button" onClick={() => setSelectedInstallerId('all')} className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between ${selectedInstallerId === 'all' ? 'bg-violet-600 text-white' : 'hover:bg-white text-stone-700'}`}><span>전체 기사</span><span>{allSchedules.length}</span></button>{visibleInstallers.map((installer) => { const count = allSchedules.filter((item) => scheduleMatchesInstaller(item, installer)).length; return <button key={installer.id} type="button" onClick={() => setSelectedInstallerId(installer.id)} className={`w-full p-2.5 rounded-xl text-left flex items-center gap-2 ${selectedInstallerId === installer.id ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-white'}`}><span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[10px] flex items-center justify-center">{installer.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold truncate">{installer.name}</span><span className="block text-[10px] text-stone-500">{installer.role}</span></span><span className="text-[10px] font-bold text-blue-700">{count}</span></button>; })}</div>
        </aside>

        <main className="min-h-0 flex flex-col p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3"><div className="flex items-center gap-1"><button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-stone-100"><ChevronLeft className="w-4 h-4" /></button><button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-200">오늘</button><button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-stone-100"><ChevronRight className="w-4 h-4" /></button></div><h3 className="text-lg font-extrabold text-stone-900">{month.getFullYear()}년 {month.getMonth() + 1}월</h3><button type="button" onClick={() => setEditor({ defaultDate: todayIso() })} className="px-3 py-2 text-xs font-bold text-white bg-violet-600 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" />일정 추가</button></div>
          <div className="grid grid-cols-7 border border-stone-200 rounded-t-xl overflow-hidden shrink-0">{['일','월','화','수','목','금','토'].map((day, index) => <div key={day} className={`py-2 text-center text-[11px] font-bold bg-stone-100 ${index === 0 ? 'text-rose-600' : index === 6 ? 'text-blue-600' : 'text-stone-600'}`}>{day}</div>)}</div>
          <div className="flex-1 min-h-[520px] grid grid-cols-7 grid-rows-6 border-x border-b border-stone-200 rounded-b-xl overflow-hidden">{calendarDays.map((date) => { const iso = formatLocalDate(date); const events = schedulesForDate(iso); const inMonth = date.getMonth() === month.getMonth(); return <div key={iso} onDoubleClick={() => setEditor({ defaultDate: iso })} title="빈 영역을 더블클릭하여 일정 추가" className={`min-w-0 min-h-0 border-r border-b border-stone-100 p-1.5 overflow-hidden cursor-crosshair ${inMonth ? 'bg-white' : 'bg-stone-50/70'}`}><div className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-full mb-1 ${iso === todayIso() ? 'bg-violet-600 text-white' : inMonth ? 'text-stone-700' : 'text-stone-300'}`}>{date.getDate()}</div><div className="space-y-1">{events.slice(0, 4).map((schedule) => <button key={schedule.id} type="button" onDoubleClick={(e) => { e.stopPropagation(); setSelectedScheduleId(schedule.id); setEditor(null); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ scheduleId: schedule.id, x: e.clientX, y: e.clientY }); }} className={`w-full text-left truncate border-l-4 px-1.5 py-1 rounded-r text-[9px] font-bold cursor-pointer ${STATUS_STYLES[schedule.status]}`} title={`${schedule.userName} · ${schedule.title}`}>{schedule.userName} · {schedule.title}</button>)}{events.length > 4 && <div className="text-[9px] font-bold text-stone-400 px-1">+{events.length - 4}개 더보기</div>}</div></div>; })}</div>
        </main>

        <aside className="min-h-0 border-t xl:border-t-0 xl:border-l border-stone-200 flex flex-col bg-stone-50/50">
          {editor ? <ScheduleForm key={`${editor.scheduleId || 'new'}-${editor.defaultDate || ''}`} schedule={editingSchedule} defaultDate={editor.defaultDate} defaultInstallerId={defaultInstallerId} installers={installers} zones={zones} onCancel={() => setEditor(null)} onSubmit={(data) => { if (editingSchedule) onUpdateSchedule(editingSchedule.id, data); else onAddSchedule(data); setEditor(null); }} /> : selectedSchedule ? <div className="p-4 overflow-y-auto custom-scrollbar"><div className="flex items-start justify-between gap-2"><div><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[selectedSchedule.status]}`}>{STATUS_LABELS[selectedSchedule.status]}</span><h3 className="mt-2 text-base font-extrabold text-stone-900">{selectedSchedule.title}</h3><p className="text-xs font-bold text-violet-700 mt-1">{selectedSchedule.userName} · {selectedSchedule.role}</p></div><button type="button" onClick={() => setSelectedScheduleId(null)} className="p-1 text-stone-400"><X className="w-4 h-4" /></button></div><div className="mt-4 space-y-2 text-xs text-stone-600"><p className="flex gap-2"><CalendarDays className="w-4 h-4" />{selectedSchedule.date}{selectedSchedule.endDate && selectedSchedule.endDate !== selectedSchedule.date ? ` ~ ${selectedSchedule.endDate}` : ''}</p><p className="flex gap-2"><Clock className="w-4 h-4" />{selectedSchedule.timeRange}</p><p className="flex gap-2"><MapPin className="w-4 h-4" />{selectedSchedule.location} · {selectedSchedule.zoneName}</p></div><div className="mt-4 p-3 rounded-xl bg-white border border-stone-200"><h4 className="text-xs font-bold text-stone-700">상세 설명</h4><p className="mt-2 text-xs text-stone-600 whitespace-pre-wrap">{selectedSchedule.notes || '등록된 상세 설명이 없습니다.'}</p></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setEditor({ scheduleId: selectedSchedule.id })} className="py-2 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg flex items-center justify-center gap-1"><Edit3 className="w-3.5 h-3.5" />수정</button><button type="button" onClick={() => deleteSchedule(selectedSchedule.id)} className="py-2 text-xs font-bold text-rose-700 bg-rose-50 rounded-lg flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" />삭제</button></div></div> : <div className="flex-1 min-h-0 flex flex-col"><div className="p-4 border-b border-stone-200"><h3 className="font-bold text-stone-900">조회된 일정</h3><p className="text-[11px] text-stone-500 mt-1">{filteredSchedules.length}건 · 더블클릭하면 상세보기</p></div><div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">{filteredSchedules.map((schedule) => { const token = tokens.find((item) => item.assignedUserId === schedule.userId || item.title === schedule.userName); return <button key={schedule.id} type="button" onDoubleClick={() => setSelectedScheduleId(schedule.id)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ scheduleId: schedule.id, x: e.clientX, y: e.clientY }); }} className="w-full text-left p-3 rounded-xl bg-white border border-stone-200"><div className="flex justify-between gap-2"><div><span className="text-[10px] font-bold text-violet-700">{schedule.userName}</span><h4 className="text-xs font-extrabold mt-0.5">{schedule.title}</h4></div><span className="text-[10px] font-bold">{STATUS_LABELS[schedule.status]}</span></div><p className="mt-2 text-[10px] text-stone-500">{schedule.date}{schedule.endDate && schedule.endDate !== schedule.date ? ` ~ ${schedule.endDate}` : ''} · {schedule.location}</p>{token && <span onClick={(e) => { e.stopPropagation(); onLocateToken(token.id); onClose(); }} className="mt-2 text-[10px] font-bold text-blue-700 flex items-center gap-1"><UserRound className="w-3 h-3" />보드에서 모형 찾기</span>}</button>; })}{!filteredSchedules.length && <div className="py-12 text-center text-xs text-stone-400">조건에 맞는 일정이 없습니다.</div>}</div></div>}
        </aside>
      </div>
    </div>

    {contextMenu && (() => { const schedule = allSchedules.find((item) => item.id === contextMenu.scheduleId); if (!schedule) return null; return <div onClick={(e) => e.stopPropagation()} style={{ left: Math.min(contextMenu.x, window.innerWidth - 190), top: Math.min(contextMenu.y, window.innerHeight - 190) }} className="fixed z-[80] w-44 p-1.5 rounded-xl bg-white border border-stone-200 shadow-2xl"><div className="px-2 py-1.5 text-[10px] font-bold text-stone-500 truncate">{schedule.title}</div><button type="button" onClick={() => { setEditor({ scheduleId: schedule.id }); setContextMenu(null); }} className="w-full px-2 py-2 text-left text-xs font-bold hover:bg-blue-50 rounded-lg flex items-center gap-2"><Edit3 className="w-3.5 h-3.5 text-blue-600" />간단 수정</button><button type="button" onClick={() => { onUpdateSchedule(schedule.id, { status: 'completed' }); setContextMenu(null); }} className="w-full px-2 py-2 text-left text-xs font-bold hover:bg-emerald-50 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />완료 처리</button><button type="button" onClick={() => deleteSchedule(schedule.id)} className="w-full px-2 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />일정 삭제</button></div>; })()}
  </div>;
};
