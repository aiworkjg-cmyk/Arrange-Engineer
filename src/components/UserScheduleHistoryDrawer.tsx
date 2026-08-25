import React, { useEffect, useMemo, useState } from 'react';
import { BoardSnapshot, BoardZone, InstallerProfile, MagnetToken, ScheduleItem } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Filter, FolderOpen, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface Props {
  isOpen: boolean;
  allSchedules: ScheduleItem[];
  installers: InstallerProfile[];
  tokens: MagnetToken[];
  zones: BoardZone[];
  snapshots: BoardSnapshot[];
  initialTokenId: string | null;
  onClose: () => void;
  onAddSchedule: (schedule: Omit<ScheduleItem, 'id'>) => void;
  onUpdateSchedule: (scheduleId: string, patch: Partial<ScheduleItem>) => void;
  onDeleteSchedule: (scheduleId: string) => boolean;
  onLocateToken: (tokenId: string) => void;
  onApplySnapshot: (snapshot: BoardSnapshot) => void;
}

const STATUS_LABELS: Record<ScheduleItem['status'], string> = { scheduled: '예정', 'in-progress': '진행중', completed: '완료', cancelled: '취소' };
const STATUS_STYLES: Record<ScheduleItem['status'], string> = {
  scheduled: 'bg-violet-50 text-violet-900 border-violet-500',
  'in-progress': 'bg-blue-50 text-blue-900 border-blue-500',
  completed: 'bg-emerald-50 text-emerald-900 border-emerald-500',
  cancelled: 'bg-stone-100 text-stone-500 border-stone-400 line-through'
};
const fieldClass = 'w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500';
const isLayout = (schedule: ScheduleItem) => schedule.kind === 'layout' || !!schedule.snapshotId;
const layoutFirst = (a: ScheduleItem, b: ScheduleItem) => Number(isLayout(b)) - Number(isLayout(a));
const formatLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

const ScheduleForm: React.FC<ScheduleFormProps> = ({ schedule, defaultDate, defaultInstallerId, installers, zones, onCancel, onSubmit }) => {
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
    const date = startDate <= endDate ? startDate : endDate;
    const normalizedEnd = startDate <= endDate ? endDate : startDate;
    onSubmit({ kind: 'installer', userId: installer.id, userName: installer.name, title: title.trim(), date, endDate: normalizedEnd, timeRange: timeRange.trim() || '시간 미정', zoneId: zone?.id, zoneName: zone?.title || '미지정 구역', role: installer.role, status, location: location.trim() || zone?.title || '현장', notes: notes.trim() || undefined });
  };
  return <form onSubmit={submit} className="p-4 overflow-y-auto custom-scrollbar space-y-3">
    <div><h3 className="font-bold text-stone-900">{schedule ? '일정 간편 수정' : '새 일정 배정'}</h3><p className="text-[11px] text-stone-500 mt-1">기간을 지정하면 여러 날짜에 걸쳐 표시됩니다.</p></div>
    <label className="block text-xs font-bold text-stone-700">시공기사<select value={installerId} onChange={(e) => setInstallerId(e.target.value)} className={`${fieldClass} mt-1`} required><option value="">기사 선택</option>{installers.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role || '직책 미설정'}</option>)}</select></label>
    <label className="block text-xs font-bold text-stone-700">일정 / 현장명<input value={title} onChange={(e) => setTitle(e.target.value)} className={`${fieldClass} mt-1`} required autoFocus /></label>
    <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-stone-700">시작일<input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} className={`${fieldClass} mt-1`} /></label><label className="text-xs font-bold text-stone-700">종료일<input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${fieldClass} mt-1`} /></label></div>
    <label className="block text-xs font-bold text-stone-700">시간<input value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className={`${fieldClass} mt-1`} /></label>
    <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold text-stone-700">구역<select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={`${fieldClass} mt-1`}><option value="">미지정</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.title}</option>)}</select></label><label className="text-xs font-bold text-stone-700">상태<select value={status} onChange={(e) => setStatus(e.target.value as ScheduleItem['status'])} className={`${fieldClass} mt-1`}>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
    <label className="block text-xs font-bold text-stone-700">현장 위치<input value={location} onChange={(e) => setLocation(e.target.value)} className={`${fieldClass} mt-1`} /></label>
    <label className="block text-xs font-bold text-stone-700">상세 설명<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={`${fieldClass} mt-1 resize-none`} /></label>
    <div className="flex gap-2"><button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-bold rounded-lg bg-stone-200 text-stone-700">취소</button><button type="submit" className="flex-1 py-2 text-xs font-bold rounded-lg bg-violet-600 text-white">{schedule ? '수정 저장' : '일정 등록'}</button></div>
  </form>;
};

const SnapshotPreview: React.FC<{ snapshot: BoardSnapshot; onClose: () => void; onApply: () => void }> = ({ snapshot, onClose, onApply }) => (
  <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-stone-900/60" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col" onMouseDown={(event) => event.stopPropagation()}>
      <header className="px-5 py-4 border-b border-stone-200 bg-amber-50 flex items-center justify-between gap-3"><div><h3 className="font-extrabold text-stone-900">배치 미리보기 · {snapshot.name}</h3><p className="text-xs text-stone-500 mt-1">캘린더는 뒤에 그대로 유지됩니다. 아래 화면은 읽기 전용입니다.</p></div><button type="button" onClick={onClose} aria-label="배치 미리보기 닫기" className="p-2 rounded-full hover:bg-amber-100 text-stone-500"><X className="w-5 h-5" /></button></header>
      <div className="p-5 overflow-auto bg-stone-100">
        <div className="relative w-full aspect-[16/9] min-h-[520px] bg-white border-2 border-stone-300 rounded-xl overflow-hidden shadow-inner">
          {snapshot.state.zones.map((zone) => <div key={zone.id} className="absolute rounded-xl border-2 overflow-hidden" style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.width}%`, height: `${zone.height}%`, backgroundColor: zone.bgColor, borderColor: zone.borderColor }}><div className="px-2 py-1 text-[11px] font-extrabold text-white truncate" style={{ backgroundColor: zone.headerColor }}>{zone.title}</div></div>)}
          {snapshot.state.tokens.map((token) => <div key={token.id} title={token.title} className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center border-2 shadow-md text-center overflow-hidden ${token.shape === 'circle' ? 'rounded-full' : token.shape === 'pill' ? 'rounded-full px-2' : token.shape === 'hexagon' ? '[clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]' : 'rounded-xl'}`} style={{ left: `${token.x}%`, top: `${token.y}%`, width: token.shape === 'pill' || token.shape === 'rounded-rect' ? `${(token.sizePx || 82) * 1.25}px` : `${token.sizePx || 82}px`, height: `${token.sizePx || 82}px`, backgroundColor: token.color, color: token.textColor, borderColor: token.borderColor || '#a8a29e' }}><span className="px-1 text-[11px] font-extrabold truncate max-w-full">{token.title}</span>{token.subtitle && <span className="px-1 text-[9px] truncate max-w-full">{token.subtitle}</span>}</div>)}
          {!snapshot.state.tokens.length && <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-stone-400">저장 당시 모형이 없는 배치표입니다.</div>}
        </div>
      </div>
      <footer className="px-5 py-3 border-t border-stone-200 bg-white flex items-center justify-between"><span className="text-xs text-stone-500">모형 {snapshot.tokenCount}개 · 구역 {snapshot.zoneCount}개</span><div className="flex gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-lg bg-stone-100 text-stone-700">닫기</button><button type="button" onClick={onApply} className="px-4 py-2 text-xs font-extrabold rounded-lg bg-amber-500 text-white">이 배치를 대시보드에 적용</button></div></footer>
    </div>
  </div>
);

export const UserScheduleHistoryDrawer: React.FC<Props> = ({
  isOpen, allSchedules, installers, tokens, zones, snapshots, initialTokenId, onClose,
  onAddSchedule, onUpdateSchedule, onDeleteSchedule, onLocateToken, onApplySnapshot
}) => {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedInstallerId, setSelectedInstallerId] = useState('all');
  const [installerQuery, setInstallerQuery] = useState('');
  const [scheduleQuery, setScheduleQuery] = useState('');
  const [onlyWithSchedules, setOnlyWithSchedules] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ScheduleItem['status']>('all');
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ scheduleId?: string; defaultDate?: string } | null>(null);
  const [layoutDate, setLayoutDate] = useState<string | null>(null);
  const [layoutSnapshotId, setLayoutSnapshotId] = useState('');
  const [dayPopupDate, setDayPopupDate] = useState<string | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<BoardSnapshot | null>(null);
  const [contextMenu, setContextMenu] = useState<{ scheduleId: string; x: number; y: number } | null>(null);
  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const sourceToken = initialTokenId ? tokens.find((token) => token.id === initialTokenId) : undefined;
    const match = installers.find((item) => item.id === initialTokenId) || installers.find((item) => item.id === sourceToken?.assignedUserId || item.name === sourceToken?.title);
    setSelectedInstallerId(match?.id || 'all');
    setEditor(null); setLayoutDate(null); setSelectedScheduleId(null); setContextMenu(null); setDayPopupDate(null); setPreviewSnapshot(null);
  }, [initialTokenId, installers, isOpen, tokens]);

  const matchesInstaller = (schedule: ScheduleItem, installer: InstallerProfile) => schedule.userId === installer.id || schedule.userName === installer.name;
  const visibleInstallers = useMemo(() => {
    const query = installerQuery.trim().toLowerCase();
    return installers.filter((installer) => (!query || `${installer.name} ${installer.role}`.toLowerCase().includes(query)) && (!onlyWithSchedules || allSchedules.some((schedule) => !isLayout(schedule) && matchesInstaller(schedule, installer))));
  }, [allSchedules, installerQuery, installers, onlyWithSchedules]);
  const filteredSchedules = useMemo(() => {
    const installer = installers.find((item) => item.id === selectedInstallerId);
    const query = scheduleQuery.trim().toLowerCase();
    return allSchedules.filter((schedule) => (isLayout(schedule) || !installer || matchesInstaller(schedule, installer)) && (statusFilter === 'all' || schedule.status === statusFilter) && (!query || `${schedule.userName} ${schedule.title} ${schedule.location} ${schedule.notes || ''}`.toLowerCase().includes(query)));
  }, [allSchedules, installers, scheduleQuery, selectedInstallerId, statusFilter]);
  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [month]);

  if (!isOpen) return null;
  const selectedSchedule = allSchedules.find((item) => item.id === selectedScheduleId);
  const editingSchedule = editor?.scheduleId ? allSchedules.find((item) => item.id === editor.scheduleId) : undefined;
  const defaultInstallerId = selectedInstallerId === 'all' ? undefined : selectedInstallerId;
  const schedulesForDate = (date: string) => filteredSchedules.filter((item) => date >= item.date && date <= (item.endDate || item.date)).sort(layoutFirst);
  const openSchedule = (schedule: ScheduleItem) => {
    if (isLayout(schedule)) {
      const snapshot = snapshots.find((item) => item.id === schedule.snapshotId);
      if (snapshot) setPreviewSnapshot(snapshot); else window.alert('연결된 저장 배치표가 삭제되어 미리볼 수 없습니다.');
    } else {
      setSelectedScheduleId(schedule.id); setEditor(null); setLayoutDate(null); setDayPopupDate(null);
    }
  };
  const deleteSchedule = (scheduleId: string) => {
    if (!onDeleteSchedule(scheduleId)) return;
    if (selectedScheduleId === scheduleId) setSelectedScheduleId(null);
    if (editor?.scheduleId === scheduleId) setEditor(null);
    setContextMenu(null);
  };
  const registerLayoutForDate = (targetDate: string) => {
    const snapshot = snapshots.find((item) => item.id === layoutSnapshotId);
    if (!snapshot || !targetDate) return;
    onAddSchedule({ kind: 'layout', snapshotId: snapshot.id, snapshotName: snapshot.name, userId: 'layout', userName: '배치', title: `배치 · ${snapshot.name}`, date: targetDate, endDate: targetDate, timeRange: '종일', zoneName: '전체 보드', role: '배치', status: 'scheduled', location: '저장된 배치표', notes: `${snapshot.tokenCount}개 모형 · ${snapshot.zoneCount}개 구역` });
  };
  const registerLayout = () => {
    if (!layoutDate) return;
    registerLayoutForDate(layoutDate);
    setLayoutDate(null); setLayoutSnapshotId('');
  };
  const dayEvents = dayPopupDate ? schedulesForDate(dayPopupDate) : [];

  return <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/50 backdrop-blur-xs">
    <div className="w-full max-w-[1540px] h-[min(920px,95vh)] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col" onClick={() => setContextMenu(null)}>
      <header className="px-5 py-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><CalendarDays className="w-5 h-5" /></div><div><h2 className="font-extrabold text-stone-900">일정 캘린더</h2><p className="text-xs text-stone-500">날짜 더블클릭: 배치·기사 일정 등록 · 배치 더블클릭: 대시보드 미리보기 · 일정 우클릭: 수정/삭제</p></div></div>
        <button type="button" onClick={onClose} aria-label="캘린더 닫기" className="p-2 rounded-full hover:bg-stone-200 text-stone-500"><X className="w-5 h-5" /></button>
      </header>
      <div className="px-4 py-2.5 border-b border-stone-200 bg-white flex flex-wrap items-center gap-2"><label className="relative min-w-48 flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" /><input value={scheduleQuery} onChange={(e) => setScheduleQuery(e.target.value)} placeholder="일정명, 기사, 위치, 설명 검색" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300" /></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"><option value="all">전체 상태</option>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[240px_minmax(620px,1fr)_340px]">
        <aside className="min-h-0 border-b xl:border-b-0 xl:border-r border-stone-200 flex flex-col bg-stone-50/50">
          <div className="p-3 border-b border-stone-200 space-y-2"><label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" /><input value={installerQuery} onChange={(e) => setInstallerQuery(e.target.value)} placeholder="시공기사 검색" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300 bg-white" /></label><label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer"><input type="checkbox" checked={onlyWithSchedules} onChange={(e) => setOnlyWithSchedules(e.target.checked)} className="accent-violet-600" /><Filter className="w-3.5 h-3.5" />일정 있는 기사만</label></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1"><button type="button" onClick={() => setSelectedInstallerId('all')} className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between ${selectedInstallerId === 'all' ? 'bg-violet-600 text-white' : 'hover:bg-white text-stone-700'}`}><span>전체 기사</span><span>{allSchedules.length}</span></button>{visibleInstallers.map((installer) => { const count = allSchedules.filter((item) => !isLayout(item) && matchesInstaller(item, installer)).length; return <button key={installer.id} type="button" onClick={() => setSelectedInstallerId(installer.id)} className={`w-full p-2.5 rounded-xl text-left flex items-center gap-2 ${selectedInstallerId === installer.id ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-white'}`}><span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[10px] flex items-center justify-center">{installer.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold truncate">{installer.name}</span><span className="block text-[10px] text-stone-500">{installer.role}</span></span><span className="text-[10px] font-bold text-blue-700">{count}</span></button>; })}</div>
        </aside>
        <main className="min-h-0 flex flex-col p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3"><div className="flex items-center gap-1"><button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-stone-100"><ChevronLeft className="w-4 h-4" /></button><button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-200">오늘</button><button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-stone-100"><ChevronRight className="w-4 h-4" /></button></div><h3 className="text-lg font-extrabold text-stone-900">{month.getFullYear()}년 {month.getMonth() + 1}월</h3><div className="flex gap-1"><button type="button" onClick={() => { setLayoutDate(todayIso()); setLayoutSnapshotId(snapshots[0]?.id || ''); setEditor(null); }} className="px-3 py-2 text-xs font-bold text-amber-900 bg-amber-200 rounded-lg flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" />배치표 등록</button><button type="button" onClick={() => { setEditor({ defaultDate: todayIso() }); setLayoutDate(null); }} className="px-3 py-2 text-xs font-bold text-white bg-violet-600 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" />일정 추가</button></div></div>
          <div className="grid grid-cols-7 border border-stone-200 rounded-t-xl overflow-hidden shrink-0">{['일','월','화','수','목','금','토'].map((day, index) => <div key={day} className={`py-2 text-center text-[11px] font-bold bg-stone-100 ${index === 0 ? 'text-rose-600' : index === 6 ? 'text-blue-600' : 'text-stone-600'}`}>{day}</div>)}</div>
          <div className="flex-1 min-h-[520px] grid grid-cols-7 grid-rows-6 border-x border-b border-stone-200 rounded-b-xl overflow-hidden">{calendarDays.map((date) => { const iso = formatLocalDate(date); const events = schedulesForDate(iso); const inMonth = date.getMonth() === month.getMonth(); return <div key={iso} onDoubleClick={() => { setDayPopupDate(iso); setLayoutSnapshotId(snapshots[0]?.id || ''); }} title="더블클릭하여 배치표와 기사 일정 등록" className={`min-w-0 min-h-0 border-r border-b border-stone-100 p-1.5 overflow-hidden cursor-pointer ${inMonth ? 'bg-white' : 'bg-stone-50/70'}`}><div className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-full mb-1 ${iso === todayIso() ? 'bg-violet-600 text-white' : inMonth ? 'text-stone-700' : 'text-stone-300'}`}>{date.getDate()}</div><div className="space-y-1">{events.slice(0, 4).map((schedule) => <button key={schedule.id} type="button" onDoubleClick={(e) => { e.stopPropagation(); openSchedule(schedule); }} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ scheduleId: schedule.id, x: e.clientX, y: e.clientY }); }} className={`w-full text-left truncate border-l-4 px-1.5 py-1 rounded-r text-[9px] font-bold ${isLayout(schedule) ? 'bg-amber-100 text-amber-950 border-amber-500' : STATUS_STYLES[schedule.status]}`} title={isLayout(schedule) ? `배치 · ${schedule.snapshotName || schedule.title}` : `${schedule.userName} · ${schedule.title}`}>{isLayout(schedule) ? `📋 배치 · ${schedule.snapshotName || schedule.title}` : `${schedule.userName} · ${schedule.title}`}</button>)}{events.length > 4 && <div className="text-[9px] font-bold text-violet-600 px-1">+{events.length - 4}개 · 날짜 더블클릭</div>}</div></div>; })}</div>
        </main>
        <aside className="min-h-0 border-t xl:border-t-0 xl:border-l border-stone-200 flex flex-col bg-stone-50/50">
          {layoutDate ? <div className="p-4 space-y-4"><div><h3 className="font-extrabold text-stone-900">배치표 등록</h3><p className="text-[11px] text-stone-500 mt-1">저장된 배치표를 지정 날짜 맨 위에 표시합니다.</p></div>{snapshots.length ? <><label className="block text-xs font-bold text-stone-700">적용 날짜<input type="date" value={layoutDate} onChange={(e) => setLayoutDate(e.target.value)} className={`${fieldClass} mt-1`} /></label><label className="block text-xs font-bold text-stone-700">저장 배치표<select value={layoutSnapshotId} onChange={(e) => setLayoutSnapshotId(e.target.value)} className={`${fieldClass} mt-1`}><option value="">배치표 선택</option>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.name}</option>)}</select></label><div className="flex gap-2"><button type="button" onClick={() => setLayoutDate(null)} className="flex-1 py-2 text-xs font-bold rounded-lg bg-stone-200">취소</button><button type="button" disabled={!layoutSnapshotId} onClick={registerLayout} className="flex-1 py-2 text-xs font-bold rounded-lg bg-amber-500 text-white disabled:opacity-40">캘린더 적용</button></div></> : <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">먼저 상단 배치표 저장 메뉴에서 배치표를 저장해 주세요.</div>}</div> : editor ? <ScheduleForm key={`${editor.scheduleId || 'new'}-${editor.defaultDate || ''}`} schedule={editingSchedule} defaultDate={editor.defaultDate} defaultInstallerId={defaultInstallerId} installers={installers} zones={zones} onCancel={() => setEditor(null)} onSubmit={(data) => { if (editingSchedule) onUpdateSchedule(editingSchedule.id, data); else onAddSchedule(data); setEditor(null); }} /> : selectedSchedule && !isLayout(selectedSchedule) ? <div className="p-4 overflow-y-auto custom-scrollbar"><div className="flex items-start justify-between gap-2"><div><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[selectedSchedule.status]}`}>{STATUS_LABELS[selectedSchedule.status]}</span><h3 className="mt-2 text-base font-extrabold text-stone-900">{selectedSchedule.title}</h3><p className="text-xs font-bold text-violet-700 mt-1">{selectedSchedule.userName} · {selectedSchedule.role}</p></div><button type="button" onClick={() => setSelectedScheduleId(null)} className="p-1 text-stone-400"><X className="w-4 h-4" /></button></div><div className="mt-4 space-y-2 text-xs text-stone-600"><p className="flex gap-2"><CalendarDays className="w-4 h-4" />{selectedSchedule.date}{selectedSchedule.endDate && selectedSchedule.endDate !== selectedSchedule.date ? ` ~ ${selectedSchedule.endDate}` : ''}</p><p className="flex gap-2"><Clock className="w-4 h-4" />{selectedSchedule.timeRange}</p><p className="flex gap-2"><MapPin className="w-4 h-4" />{selectedSchedule.location} · {selectedSchedule.zoneName}</p></div><div className="mt-4 p-3 rounded-xl bg-white border border-stone-200 text-xs whitespace-pre-wrap">{selectedSchedule.notes || '상세 설명 없음'}</div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setEditor({ scheduleId: selectedSchedule.id })} className="py-2 text-xs font-bold rounded-lg bg-violet-600 text-white">간편 수정</button><button type="button" onClick={() => deleteSchedule(selectedSchedule.id)} className="py-2 text-xs font-bold rounded-lg bg-rose-100 text-rose-700">삭제</button></div>{(() => { const token = tokens.find((item) => item.assignedUserId === selectedSchedule.userId || item.title === selectedSchedule.userName); return token ? <button type="button" onClick={() => { onLocateToken(token.id); onClose(); }} className="mt-2 w-full py-2 text-xs font-bold rounded-lg border border-blue-300 text-blue-700">대시보드에서 모형 찾기</button> : null; })()}</div> : <div className="m-auto p-6 text-center text-xs text-stone-400"><CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />일정 또는 배치표를 선택하세요.</div>}
        </aside>
      </div>
    </div>
    {dayPopupDate && <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-stone-900/50" onMouseDown={(e) => { if (e.target === e.currentTarget) setDayPopupDate(null); }}>
      <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" onMouseDown={(e) => e.stopPropagation()}>
        <header className="p-4 border-b flex items-center justify-between"><div><h3 className="font-extrabold text-stone-900">{dayPopupDate} 배치 및 일정 등록</h3><p className="text-xs text-stone-500">상단에서 배치표를 등록하고 하단에서 기사 일정을 배정할 수 있습니다.</p></div><button type="button" onClick={() => setDayPopupDate(null)} aria-label="날짜 등록창 닫기" className="p-2 rounded-full hover:bg-stone-100"><X className="w-4 h-4" /></button></header>
        <div className="overflow-y-auto custom-scrollbar">
          <section className="p-4 bg-amber-50 border-b border-amber-200"><div className="flex items-center gap-2 mb-3"><FolderOpen className="w-4 h-4 text-amber-700" /><h4 className="text-sm font-extrabold text-amber-950">배치표 등록</h4></div>{snapshots.length ? <div className="flex flex-col sm:flex-row gap-2"><select value={layoutSnapshotId} onChange={(e) => setLayoutSnapshotId(e.target.value)} className={`${fieldClass} flex-1`}><option value="">저장 배치표 선택</option>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.name}</option>)}</select><button type="button" disabled={!layoutSnapshotId} onClick={() => registerLayoutForDate(dayPopupDate)} className="px-5 py-2 text-xs font-extrabold rounded-lg bg-amber-500 text-white disabled:opacity-40">{dayPopupDate}에 배치 등록</button></div> : <p className="p-3 rounded-lg bg-white border border-amber-200 text-xs text-amber-900">먼저 상단의 배치표 저장/불러오기에서 이름을 정해 배치표를 저장해 주세요.</p>}</section>
          {dayEvents.length > 0 && <section className="p-4 border-b border-stone-200"><h4 className="text-sm font-extrabold text-stone-900 mb-2">등록된 항목 {dayEvents.length}개</h4><div className="space-y-2">{dayEvents.map((schedule) => <button key={schedule.id} type="button" onDoubleClick={() => openSchedule(schedule)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ scheduleId: schedule.id, x: e.clientX, y: e.clientY }); }} className={`w-full p-3 rounded-xl border text-left ${isLayout(schedule) ? 'bg-amber-50 border-amber-300' : 'bg-white border-stone-200 hover:border-violet-300'}`}><p className={`text-xs font-extrabold ${isLayout(schedule) ? 'text-amber-900' : 'text-stone-900'}`}>{isLayout(schedule) ? `📋 배치 · ${schedule.snapshotName || schedule.title}` : schedule.title}</p><p className="mt-1 text-[11px] text-stone-500">{isLayout(schedule) ? '더블클릭하여 대시보드 미리보기' : `${schedule.userName} · ${schedule.timeRange} · ${schedule.location}`}</p></button>)}</div></section>}
          <section className="bg-violet-50/40"><ScheduleForm key={`day-${dayPopupDate}-${dayEvents.length}`} defaultDate={dayPopupDate} defaultInstallerId={defaultInstallerId} installers={installers} zones={zones} onCancel={() => setDayPopupDate(null)} onSubmit={(data) => onAddSchedule(data)} /></section>
        </div>
      </div>
    </div>}
    {previewSnapshot && <SnapshotPreview snapshot={previewSnapshot} onClose={() => setPreviewSnapshot(null)} onApply={() => { onApplySnapshot(previewSnapshot); setPreviewSnapshot(null); }} />}
    {contextMenu && (() => { const schedule = allSchedules.find((item) => item.id === contextMenu.scheduleId); if (!schedule) return null; return <div className="fixed z-[80] w-44 bg-white rounded-xl shadow-2xl border border-stone-200 py-1" style={{ left: Math.min(contextMenu.x, window.innerWidth - 190), top: Math.min(contextMenu.y, window.innerHeight - 180) }} onClick={(e) => e.stopPropagation()}>{isLayout(schedule) ? <button type="button" onClick={() => { openSchedule(schedule); setContextMenu(null); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-amber-50 flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5" />배치 미리보기</button> : <button type="button" onClick={() => { setEditor({ scheduleId: schedule.id }); setDayPopupDate(null); setContextMenu(null); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-stone-50">간편 수정</button>}<button type="button" onClick={() => deleteSchedule(schedule.id)} className="w-full px-3 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />삭제</button></div>; })()}
  </div>;
};
