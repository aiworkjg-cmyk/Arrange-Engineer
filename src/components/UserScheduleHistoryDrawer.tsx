import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BoardSnapshot, BoardZone, InstallerProfile, MagnetToken, ScheduleItem } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Filter, FolderOpen, MapPin, Plus, Search, Trash2, X } from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';
import { useDoubleTap } from '../hooks/useDoubleTap';
import { DEFAULT_BOARD_WIDTH, DEFAULT_BOARD_HEIGHT } from '../utils/layout';

interface Props {
  isOpen: boolean;
  isMobile: boolean;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="text-xs font-bold text-stone-700">시작일<input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} className={`${fieldClass} mt-1`} /></label><label className="text-xs font-bold text-stone-700">종료일<input type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`${fieldClass} mt-1`} /></label></div>
    <label className="block text-xs font-bold text-stone-700">시간<input value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className={`${fieldClass} mt-1`} /></label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="text-xs font-bold text-stone-700">구역<select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={`${fieldClass} mt-1`}><option value="">미지정</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.title}</option>)}</select></label><label className="text-xs font-bold text-stone-700">상태<select value={status} onChange={(e) => setStatus(e.target.value as ScheduleItem['status'])} className={`${fieldClass} mt-1`}>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
    <label className="block text-xs font-bold text-stone-700">현장 위치<input value={location} onChange={(e) => setLocation(e.target.value)} className={`${fieldClass} mt-1`} /></label>
    <label className="block text-xs font-bold text-stone-700">상세 설명<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className={`${fieldClass} mt-1 resize-none`} /></label>
    <div className="flex gap-2"><button type="button" onClick={onCancel} className="flex-1 py-2 text-xs font-bold rounded-lg bg-stone-200 text-stone-700">취소</button><button type="submit" className="flex-1 py-2 text-xs font-bold rounded-lg bg-violet-600 text-white">{schedule ? '수정 저장' : '일정 등록'}</button></div>
  </form>;
};

/**
 * 저장된 배치표를 대시보드와 똑같은 비율(1600x1000 고정 보드)로 축소해 보여준다.
 * 컨테이너 너비에 맞춰 배율만 조절하므로 구역/모형 비율이 깨지지 않는다.
 */
const ScaledBoardPreview: React.FC<{ snapshot: BoardSnapshot }> = ({ snapshot }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      if (width > 0) setScale(width / DEFAULT_BOARD_WIDTH);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full bg-white border-2 border-stone-300 rounded-xl overflow-hidden shadow-inner"
      style={{ aspectRatio: `${DEFAULT_BOARD_WIDTH} / ${DEFAULT_BOARD_HEIGHT}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: DEFAULT_BOARD_WIDTH, height: DEFAULT_BOARD_HEIGHT, transform: `scale(${scale})` }}
      >
        {snapshot.state.zones.map((zone) => (
          <div
            key={zone.id}
            className="absolute rounded-xl border-2 overflow-hidden"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.width}%`,
              height: `${zone.height}%`,
              backgroundColor: zone.bgColor,
              borderColor: zone.borderColor
            }}
          >
            <div
              className="px-3 py-1.5 text-[15px] font-extrabold text-white truncate"
              style={{ backgroundColor: zone.headerColor }}
            >
              {zone.title}
            </div>
          </div>
        ))}

        {snapshot.state.tokens.map((token) => {
          const size = token.sizePx || 82;
          const width = token.shape === 'pill' || token.shape === 'rounded-rect' ? size * 1.3 : size;
          return (
            <div
              key={token.id}
              title={token.title}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center border-2 shadow-md text-center overflow-hidden ${
                token.shape === 'circle'
                  ? 'rounded-full'
                  : token.shape === 'pill'
                  ? 'rounded-full px-2'
                  : token.shape === 'hexagon'
                  ? '[clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]'
                  : 'rounded-xl'
              }`}
              style={{
                left: `${token.x}%`,
                top: `${token.y}%`,
                width: `${width}px`,
                height: `${size}px`,
                backgroundColor: token.color,
                color: token.textColor,
                borderColor: token.borderColor || '#a8a29e'
              }}
            >
              <span className="px-1 text-[14px] font-extrabold truncate max-w-full leading-tight">
                {token.title}
              </span>
              {token.subtitle && (
                <span className="px-1 text-[11px] truncate max-w-full leading-tight">
                  {token.subtitle}
                </span>
              )}
            </div>
          );
        })}

        {!snapshot.state.tokens.length && (
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-stone-400">
            저장 당시 모형이 없는 배치표입니다.
          </div>
        )}
      </div>
    </div>
  );
};

interface BottomPreviewShellProps {
  title: string;
  subtitle: string;
  tone: 'amber' | 'violet';
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const BottomPreviewShell: React.FC<BottomPreviewShellProps> = ({ title, subtitle, tone, closeLabel, onClose, children, footer }) => {
  const headerClass = tone === 'amber' ? 'bg-amber-50' : 'bg-violet-50';
  const hoverClass = tone === 'amber' ? 'hover:bg-amber-100' : 'hover:bg-violet-100';
  return (
    <div className="fixed inset-x-0 bottom-0 z-[75] flex justify-center px-2 pt-2 sm:px-3 sm:pt-3 pointer-events-none">
      <div className="app-modal-panel pointer-events-auto w-full max-w-5xl max-h-[78vh] bg-white rounded-t-2xl shadow-[0_-16px_55px_rgba(28,25,23,0.32)] border border-b-0 border-stone-300 overflow-hidden flex flex-col">
        <header className={`px-4 sm:px-5 py-3 border-b border-stone-200 flex items-center justify-between gap-3 ${headerClass}`}>
          <div className="min-w-0"><h3 className="font-extrabold text-stone-900 truncate">{title}</h3><p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">{subtitle}</p></div>
          <button type="button" onClick={onClose} aria-label={closeLabel} className={`p-2 rounded-full text-stone-500 shrink-0 ${hoverClass}`}><X className="w-5 h-5" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y bg-stone-100">{children}</div>
        {footer && <footer className="px-3 sm:px-5 py-3 border-t border-stone-200 bg-white shrink-0">{footer}</footer>}
      </div>
    </div>
  );
};

const SnapshotPreview: React.FC<{ snapshot: BoardSnapshot; onClose: () => void; onApply: () => void }> = ({ snapshot, onClose, onApply }) => (
  <BottomPreviewShell
    title={`배치 미리보기 · ${snapshot.name}`}
    subtitle="캘린더를 배경으로 유지한 읽기 전용 미리보기입니다."
    tone="amber"
    closeLabel="배치 미리보기 닫기"
    onClose={onClose}
    footer={<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"><span className="text-xs text-stone-500">모형 {snapshot.tokenCount}개 · 구역 {snapshot.zoneCount}개</span><div className="grid grid-cols-2 gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold rounded-lg bg-stone-100 text-stone-700">닫기</button><button type="button" onClick={onApply} className="px-4 py-2 text-xs font-extrabold rounded-lg bg-amber-500 text-white">대시보드에 적용</button></div></div>}
  >
    <div className="p-2 sm:p-4"><ScaledBoardPreview snapshot={snapshot} /></div>
  </BottomPreviewShell>
);

interface SchedulePreviewProps {
  schedule: ScheduleItem;
  token?: MagnetToken;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLocateToken: () => void;
}

const SchedulePreview: React.FC<SchedulePreviewProps> = ({ schedule, token, onClose, onEdit, onDelete, onLocateToken }) => (
  <BottomPreviewShell
    title={`일정 상세 · ${schedule.title}`}
    subtitle="배치 미리보기와 같은 하단창에서 일정 내용을 확인합니다."
    tone="violet"
    closeLabel="일정 상세 닫기"
    onClose={onClose}
    footer={<div className="grid grid-cols-2 sm:flex sm:justify-end gap-2"><button type="button" onClick={onEdit} className="px-4 py-2 text-xs font-bold rounded-lg bg-violet-600 text-white">간편 수정</button><button type="button" onClick={onDelete} className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-100 text-rose-700">삭제</button></div>}
  >
    <div className="p-3 sm:p-5 space-y-3 bg-white">
      <div className="flex flex-wrap items-center gap-2"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[schedule.status]}`}>{STATUS_LABELS[schedule.status]}</span><span className="text-xs font-extrabold text-violet-700">{schedule.userName} · {schedule.role}</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-stone-700">
        <p className="flex items-start gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200"><CalendarDays className="w-4 h-4 shrink-0 text-violet-600" /><span>{schedule.date}{schedule.endDate && schedule.endDate !== schedule.date ? ` ~ ${schedule.endDate}` : ''}</span></p>
        <p className="flex items-start gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200"><Clock className="w-4 h-4 shrink-0 text-violet-600" /><span>{schedule.timeRange}</span></p>
        <p className="flex items-start gap-2 p-3 rounded-xl bg-stone-50 border border-stone-200"><MapPin className="w-4 h-4 shrink-0 text-violet-600" /><span>{schedule.location} · {schedule.zoneName}</span></p>
      </div>
      <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-xs whitespace-pre-wrap text-stone-700">{schedule.notes || '상세 설명 없음'}</div>
      {token && <button type="button" onClick={onLocateToken} className="w-full py-2.5 text-xs font-bold rounded-lg border border-blue-300 bg-blue-50 text-blue-700">대시보드에서 모형 찾기</button>}
    </div>
  </BottomPreviewShell>
);

export const UserScheduleHistoryDrawer: React.FC<Props> = ({
  isOpen,
  isMobile, allSchedules, installers, tokens, zones, snapshots, initialTokenId, onClose,
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
  const [dayAddMode, setDayAddMode] = useState<'layout' | 'installer' | null>(null);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [previewSnapshot, setPreviewSnapshot] = useState<BoardSnapshot | null>(null);
  const [previewScheduleId, setPreviewScheduleId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ scheduleId: string; x: number; y: number } | null>(null);
  /**
   * PC 더블클릭 / 모바일 두 번 터치를 같은 동작으로 묶는다.
   * (모바일 브라우저는 dblclick 이 오지 않는 경우가 있어 간격을 직접 잰다)
   */
  const lastTapRef = useRef(0);
  const dayTapProps = (run: () => void, stop = false) => ({
    onDoubleClick: (event: React.MouseEvent) => {
      if (stop) event.stopPropagation();
      run();
    },
    onPointerUp: (event: React.PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      if (stop) event.stopPropagation();
      const now = Date.now();
      if (now - lastTapRef.current < 320) {
        lastTapRef.current = 0;
        run();
      } else {
        lastTapRef.current = now;
      }
    }
  });

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const sourceToken = initialTokenId ? tokens.find((token) => token.id === initialTokenId) : undefined;
    const match = installers.find((item) => item.id === initialTokenId) || installers.find((item) => item.id === sourceToken?.assignedUserId || item.name === sourceToken?.title);
    setSelectedInstallerId(match?.id || 'all');
    setEditor(null); setLayoutDate(null); setSelectedScheduleId(null); setContextMenu(null); setDayPopupDate(null); setDayAddMode(null); setSelectedDayDate(null); setPreviewSnapshot(null); setPreviewScheduleId(null);
  }, [initialTokenId, installers, isOpen, tokens]);

  const matchesInstaller = (schedule: ScheduleItem, installer: InstallerProfile) => schedule.userId === installer.id || schedule.userName === installer.name;
  const visibleInstallers = useMemo(() => {
    const query = installerQuery.trim().toLowerCase();
    return installers.filter((installer) => (!query || `${installer.name} ${installer.role}`.toLowerCase().includes(query)) && (!onlyWithSchedules || allSchedules.some((schedule) => !isLayout(schedule) && matchesInstaller(schedule, installer))));
  }, [allSchedules, installerQuery, installers, onlyWithSchedules]);
  const filteredSchedules = useMemo(() => {
    const installer = installers.find((item) => item.id === selectedInstallerId);
    const query = scheduleQuery.trim().toLowerCase();
    return allSchedules.filter((schedule) => {
      const matchesType = selectedInstallerId === 'layouts'
        ? isLayout(schedule)
        : installer
          ? !isLayout(schedule) && matchesInstaller(schedule, installer)
          : true;
      return matchesType && (statusFilter === 'all' || schedule.status === statusFilter) && (!query || `${schedule.userName} ${schedule.title} ${schedule.location} ${schedule.notes || ''}`.toLowerCase().includes(query));
    });
  }, [allSchedules, installers, scheduleQuery, selectedInstallerId, statusFilter]);
  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first); start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  }, [month]);

  if (!isOpen) return null;
  const selectedSchedule = allSchedules.find((item) => item.id === selectedScheduleId);
  const previewSchedule = allSchedules.find((item) => item.id === previewScheduleId && !isLayout(item));
  const editingSchedule = editor?.scheduleId ? allSchedules.find((item) => item.id === editor.scheduleId) : undefined;
  const defaultInstallerId = selectedInstallerId === 'all' || selectedInstallerId === 'layouts' ? undefined : selectedInstallerId;
  const schedulesForDate = (date: string) => filteredSchedules.filter((item) => date >= item.date && date <= (item.endDate || item.date)).sort(layoutFirst);
  const allSchedulesForDate = (date: string) => allSchedules.filter((item) => date >= item.date && date <= (item.endDate || item.date)).sort(layoutFirst);
  const openSchedule = (schedule: ScheduleItem) => {
    setDayPopupDate(null); setDayAddMode(null); setSelectedDayDate(null); setContextMenu(null);
    if (isLayout(schedule)) {
      setPreviewScheduleId(null);
      const snapshot = snapshots.find((item) => item.id === schedule.snapshotId);
      if (snapshot) setPreviewSnapshot(snapshot); else window.alert('연결된 저장 배치표가 삭제되어 미리볼 수 없습니다.');
    } else {
      setPreviewSnapshot(null); setSelectedScheduleId(null); setPreviewScheduleId(schedule.id); setEditor(null); setLayoutDate(null);
    }
  };
  const deleteSchedule = (scheduleId: string) => {
    if (!onDeleteSchedule(scheduleId)) return;
    if (selectedScheduleId === scheduleId) setSelectedScheduleId(null);
    if (previewScheduleId === scheduleId) setPreviewScheduleId(null);
    if (editor?.scheduleId === scheduleId) setEditor(null);
    setContextMenu(null);
  };
  const registerLayoutForDate = (targetDate: string, revealDay = false) => {
    const snapshot = snapshots.find((item) => item.id === layoutSnapshotId);
    if (!snapshot || !targetDate) return;
    onAddSchedule({ kind: 'layout', snapshotId: snapshot.id, snapshotName: snapshot.name, userId: 'layout', userName: '배치', title: `배치 · ${snapshot.name}`, date: targetDate, endDate: targetDate, timeRange: '종일', zoneName: '전체 보드', role: '배치', status: 'scheduled', location: '저장된 배치표', notes: `${snapshot.tokenCount}개 모형 · ${snapshot.zoneCount}개 구역` });
    setLayoutSnapshotId('');
    if (revealDay) {
      setDayAddMode(null);
      setSelectedDayDate(null);
    }
  };
  const registerLayout = () => {
    if (!layoutDate) return;
    registerLayoutForDate(layoutDate);
    setLayoutDate(null); setLayoutSnapshotId('');
  };
  const dayEvents = dayPopupDate ? allSchedulesForDate(dayPopupDate) : [];
  const dayLayouts = dayEvents.filter(isLayout);
  const dayInstallerSchedules = dayEvents.filter((schedule) => !isLayout(schedule));
  const selectedDayEvents = selectedDayDate ? allSchedulesForDate(selectedDayDate) : [];
  const selectedDayLayouts = selectedDayEvents.filter(isLayout);
  const selectedDayInstallerSchedules = selectedDayEvents.filter((schedule) => !isLayout(schedule));
  const layoutCount = allSchedules.filter(isLayout).length;
  const installerScheduleCount = allSchedules.length - layoutCount;
  const previewToken = previewSchedule ? tokens.find((item) => item.assignedUserId === previewSchedule.userId || item.title === previewSchedule.userName) : undefined;

  return <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/50 backdrop-blur-xs">
    <div className="app-modal-panel w-full max-w-[1540px] h-[min(920px,95vh)] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col" onClick={() => setContextMenu(null)}>
      <header className="px-5 py-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><CalendarDays className="w-5 h-5" /></div><div><h2 className="font-extrabold text-stone-900">일정 캘린더</h2><p className="hidden lg:block text-xs text-stone-500">날짜 빈 공간 더블클릭: 하단에서 등록 내역 확인·신규 등록 · 일정 더블클릭: 상세보기</p></div></div>
        <button type="button" onClick={onClose} aria-label="캘린더 닫기" className="p-2 rounded-full hover:bg-stone-200 text-stone-500"><X className="w-5 h-5" /></button>
      </header>
      <div className="px-4 py-2.5 border-b border-stone-200 bg-white flex flex-wrap items-center gap-2"><label className="relative min-w-48 flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" /><input value={scheduleQuery} onChange={(e) => setScheduleQuery(e.target.value)} placeholder="일정명, 기사, 위치, 설명 검색" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300" /></label><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"><option value="all">전체 상태</option>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
      <div className="responsive-split flex-1 min-h-0 overflow-y-auto xl:overflow-hidden custom-scrollbar grid grid-cols-1 xl:grid-cols-[240px_minmax(620px,1fr)_340px]">
        <aside className="pane-installers min-h-0 border-b xl:border-b-0 xl:border-r border-stone-200 flex flex-col bg-stone-50/50">
          <div className="p-3 border-b border-stone-200 space-y-2"><label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" /><input value={installerQuery} onChange={(e) => setInstallerQuery(e.target.value)} placeholder="시공기사 검색" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300 bg-white" /></label><label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer"><input type="checkbox" checked={onlyWithSchedules} onChange={(e) => setOnlyWithSchedules(e.target.checked)} className="accent-violet-600" /><Filter className="w-3.5 h-3.5" />일정 있는 기사만</label></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            <button type="button" onClick={() => setSelectedInstallerId('all')} className={`w-full p-2.5 rounded-xl text-left text-xs font-bold ${selectedInstallerId === 'all' ? 'bg-violet-600 text-white' : 'hover:bg-white text-stone-700'}`}><span className="block">전체 항목</span><span className={`mt-1 flex gap-1.5 text-[10px] ${selectedInstallerId === 'all' ? 'text-violet-100' : 'text-stone-500'}`}><span>배치 {layoutCount}</span><span>·</span><span>기사 일정 {installerScheduleCount}</span></span></button>
            <button type="button" onClick={() => setSelectedInstallerId('layouts')} className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs font-bold ${selectedInstallerId === 'layouts' ? 'bg-amber-200 text-amber-950 ring-1 ring-amber-400' : 'hover:bg-amber-50 text-amber-900'}`}><span className="flex items-center gap-2"><FolderOpen className="w-4 h-4" />배치만 보기</span><span className="px-2 py-0.5 rounded-full bg-white/70 text-[10px]">{layoutCount}</span></button>
            <div className="pt-2 pb-1 px-2 text-[10px] font-extrabold text-stone-400">시공기사별 일정</div>
            {visibleInstallers.map((installer) => { const count = allSchedules.filter((item) => !isLayout(item) && matchesInstaller(item, installer)).length; return <button key={installer.id} type="button" onClick={() => setSelectedInstallerId(installer.id)} className={`w-full p-2.5 rounded-xl text-left flex items-center gap-2 ${selectedInstallerId === installer.id ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-white'}`}><span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[10px] flex items-center justify-center">{installer.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold truncate">{installer.name}</span><span className="block text-[10px] text-stone-500">{installer.role}</span></span><span className="text-[10px] font-bold text-blue-700">{count}</span></button>; })}
          </div>
        </aside>
        <main className="pane-calendar min-h-0 flex flex-col p-3 sm:p-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3"><div className="flex items-center gap-1"><button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-2 rounded-lg hover:bg-stone-100"><ChevronLeft className="w-4 h-4" /></button><button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-200">오늘</button><button type="button" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="p-2 rounded-lg hover:bg-stone-100"><ChevronRight className="w-4 h-4" /></button></div><h3 className="text-lg font-extrabold text-stone-900">{month.getFullYear()}년 {month.getMonth() + 1}월</h3><div className="flex gap-1"><button type="button" onClick={() => { setSelectedDayDate(null); setLayoutDate(todayIso()); setLayoutSnapshotId(snapshots[0]?.id || ''); setEditor(null); }} className="px-3 py-2 text-xs font-bold text-amber-900 bg-amber-200 rounded-lg flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" />배치표 등록</button><button type="button" onClick={() => { setSelectedDayDate(null); setEditor({ defaultDate: todayIso() }); setLayoutDate(null); }} className="px-3 py-2 text-xs font-bold text-white bg-violet-600 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" />일정 추가</button></div></div>
          <div className="grid grid-cols-7 border border-stone-200 rounded-t-xl overflow-hidden shrink-0">{['일','월','화','수','목','금','토'].map((day, index) => <div key={day} className={`py-2 text-center text-[11px] font-bold bg-stone-100 ${index === 0 ? 'text-rose-600' : index === 6 ? 'text-blue-600' : 'text-stone-600'}`}>{day}</div>)}</div>
          <div className="calendar-grid flex-1 min-h-[360px] sm:min-h-[520px] grid grid-cols-7 grid-rows-6 border-x border-b border-stone-200 rounded-b-xl overflow-hidden">{calendarDays.map((date) => {
            const iso = formatLocalDate(date);
            const events = schedulesForDate(iso);
            const layoutEvents = events.filter(isLayout);
            const installerEvents = events.filter((schedule) => !isLayout(schedule));
            const hiddenEventsCount = events.length - Math.min(layoutEvents.length, 1) - Math.min(installerEvents.length, 2);
            const inMonth = date.getMonth() === month.getMonth();
            const hasRegisteredItems = allSchedulesForDate(iso).length > 0;
            const openDay = () => {
              setLayoutSnapshotId('');
              setDayAddMode(null);
              setSelectedDayDate(null);
              setSelectedScheduleId(null);
              setEditor(null);
              setLayoutDate(null);
              setDayPopupDate(iso);
            };
            const isSelectedDay = selectedDayDate === iso || dayPopupDate === iso;
            return <div key={iso} onClick={() => { if (hasRegisteredItems) { setSelectedDayDate(iso); setEditor(null); setLayoutDate(null); } }} {...dayTapProps(openDay)} title="날짜 빈 공간을 더블클릭하여 등록 내역 확인 또는 신규 등록" className={`calendar-cell min-w-0 min-h-0 border-r border-b p-1.5 overflow-hidden cursor-pointer flex flex-col transition-colors ${isSelectedDay ? 'bg-violet-50 border-violet-300 ring-2 ring-inset ring-violet-500' : inMonth ? 'bg-white border-stone-100 hover:bg-violet-50/40' : 'bg-stone-50/70 border-stone-100'}`}>
              <div className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-full mb-1 shrink-0 ${iso === todayIso() ? 'bg-violet-600 text-white' : isSelectedDay ? 'bg-violet-200 text-violet-900' : inMonth ? 'text-stone-700' : 'text-stone-300'}`}>{date.getDate()}</div>
              <div className="flex-1 min-h-0 space-y-0.5 overflow-hidden">
                {layoutEvents.length > 0 && (
                  <div className="calendar-event w-full truncate rounded px-1.5 py-0.5 text-[10px] font-extrabold bg-amber-100 text-amber-950 border-l-4 border-amber-500">
                    배치 {layoutEvents.length}건
                  </div>
                )}
                {installerEvents.length > 0 && (
                  <div className="calendar-event w-full truncate rounded px-1.5 py-0.5 text-[10px] font-extrabold bg-violet-100 text-violet-950 border-l-4 border-violet-500">
                    일정 {installerEvents.length}건
                  </div>
                )}
              </div>
            </div>;
          })}</div>
        </main>
        <aside className="pane-detail min-h-0 border-t xl:border-t-0 xl:border-l border-stone-200 flex flex-col bg-stone-50/50">
          {selectedDayDate ? <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-start justify-between gap-2"><div><h3 className="font-extrabold text-stone-900">{selectedDayDate} 등록 내역</h3><p className="text-[11px] text-stone-500 mt-1">배치 {selectedDayLayouts.length}개 · 기사 일정 {selectedDayInstallerSchedules.length}개</p></div><button type="button" onClick={() => setSelectedDayDate(null)} aria-label="날짜 내역 닫기" className="p-1.5 rounded-full text-stone-400 hover:bg-stone-200"><X className="w-4 h-4" /></button></div>
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-3"><h4 className="text-xs font-extrabold text-amber-950 mb-2">등록된 배치</h4>{selectedDayLayouts.length ? <div className="space-y-2">{selectedDayLayouts.map((schedule) => <button key={schedule.id} type="button" onClick={() => setSelectedScheduleId(schedule.id)} {...dayTapProps(() => openSchedule(schedule))} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ scheduleId: schedule.id, x: e.clientX, y: e.clientY }); }} className={`w-full p-2.5 rounded-lg border bg-white text-left transition-all ${selectedScheduleId === schedule.id ? 'border-amber-500 ring-2 ring-amber-400' : 'border-amber-200 hover:border-amber-400'}`}><span className="block text-xs font-extrabold text-amber-950 truncate">{schedule.snapshotName || schedule.title}</span><span className="block mt-1 text-[10px] text-stone-500">더블클릭 미리보기 · 우클릭 삭제</span></button>)}</div> : <p className="text-xs text-amber-700">등록된 배치 없음</p>}</section>
            <section className="rounded-xl border border-violet-200 bg-violet-50 p-3"><h4 className="text-xs font-extrabold text-violet-950 mb-2">등록된 기사 일정</h4>{selectedDayInstallerSchedules.length ? <div className="space-y-2">{selectedDayInstallerSchedules.map((schedule) => <button key={schedule.id} type="button" onClick={() => setSelectedScheduleId(schedule.id)} {...dayTapProps(() => openSchedule(schedule))} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ scheduleId: schedule.id, x: e.clientX, y: e.clientY }); }} className={`w-full p-2.5 rounded-lg border bg-white text-left transition-all ${selectedScheduleId === schedule.id ? 'border-violet-500 ring-2 ring-violet-400' : 'border-violet-200 hover:border-violet-400'}`}><span className="block text-xs font-extrabold text-stone-900 truncate">{schedule.title}</span><span className="block mt-1 text-[10px] text-stone-500">{schedule.userName} · {schedule.timeRange}</span></button>)}</div> : <p className="text-xs text-violet-700">등록된 기사 일정 없음</p>}</section>
            <div className="pt-2 border-t border-stone-200"><p className="text-xs font-extrabold text-stone-800 mb-2">추가 등록</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setDayPopupDate(selectedDayDate); setDayAddMode('layout'); setLayoutSnapshotId(''); }} className="py-2.5 rounded-lg bg-amber-500 text-white text-xs font-extrabold">배치 추가</button><button type="button" onClick={() => { setDayPopupDate(selectedDayDate); setDayAddMode('installer'); }} className="py-2.5 rounded-lg bg-violet-600 text-white text-xs font-extrabold">기사 일정 추가</button></div></div>
          </div> : layoutDate ? <div className="p-4 space-y-4"><div><h3 className="font-extrabold text-stone-900">배치표 등록</h3><p className="text-[11px] text-stone-500 mt-1">저장된 배치표를 지정 날짜 맨 위에 표시합니다.</p></div>{snapshots.length ? <><label className="block text-xs font-bold text-stone-700">적용 날짜<input type="date" value={layoutDate} onChange={(e) => setLayoutDate(e.target.value)} className={`${fieldClass} mt-1`} /></label><label className="block text-xs font-bold text-stone-700">저장 배치표<select value={layoutSnapshotId} onChange={(e) => setLayoutSnapshotId(e.target.value)} className={`${fieldClass} mt-1`}><option value="">배치표 선택</option>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.name}</option>)}</select></label><div className="flex gap-2"><button type="button" onClick={() => setLayoutDate(null)} className="flex-1 py-2 text-xs font-bold rounded-lg bg-stone-200">취소</button><button type="button" disabled={!layoutSnapshotId} onClick={registerLayout} className="flex-1 py-2 text-xs font-bold rounded-lg bg-amber-500 text-white disabled:opacity-40">캘린더 적용</button></div></> : <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">먼저 상단 배치표 저장 메뉴에서 배치표를 저장해 주세요.</div>}</div> : editor ? <ScheduleForm key={`${editor.scheduleId || 'new'}-${editor.defaultDate || ''}`} schedule={editingSchedule} defaultDate={editor.defaultDate} defaultInstallerId={defaultInstallerId} installers={installers} zones={zones} onCancel={() => setEditor(null)} onSubmit={(data) => { if (editingSchedule) onUpdateSchedule(editingSchedule.id, data); else onAddSchedule(data); setEditor(null); }} /> : selectedSchedule && !isLayout(selectedSchedule) ? <div className="p-4 overflow-y-auto custom-scrollbar"><div className="flex items-start justify-between gap-2"><div><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_STYLES[selectedSchedule.status]}`}>{STATUS_LABELS[selectedSchedule.status]}</span><h3 className="mt-2 text-base font-extrabold text-stone-900">{selectedSchedule.title}</h3><p className="text-xs font-bold text-violet-700 mt-1">{selectedSchedule.userName} · {selectedSchedule.role}</p></div><button type="button" onClick={() => setSelectedScheduleId(null)} className="p-1 text-stone-400"><X className="w-4 h-4" /></button></div><div className="mt-4 space-y-2 text-xs text-stone-600"><p className="flex gap-2"><CalendarDays className="w-4 h-4" />{selectedSchedule.date}{selectedSchedule.endDate && selectedSchedule.endDate !== selectedSchedule.date ? ` ~ ${selectedSchedule.endDate}` : ''}</p><p className="flex gap-2"><Clock className="w-4 h-4" />{selectedSchedule.timeRange}</p><p className="flex gap-2"><MapPin className="w-4 h-4" />{selectedSchedule.location} · {selectedSchedule.zoneName}</p></div><div className="mt-4 p-3 rounded-xl bg-white border border-stone-200 text-xs whitespace-pre-wrap">{selectedSchedule.notes || '상세 설명 없음'}</div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => setEditor({ scheduleId: selectedSchedule.id })} className="py-2 text-xs font-bold rounded-lg bg-violet-600 text-white">간편 수정</button><button type="button" onClick={() => deleteSchedule(selectedSchedule.id)} className="py-2 text-xs font-bold rounded-lg bg-rose-100 text-rose-700">삭제</button></div>{(() => { const token = tokens.find((item) => item.assignedUserId === selectedSchedule.userId || item.title === selectedSchedule.userName); return token ? <button type="button" onClick={() => { onLocateToken(token.id); onClose(); }} className="mt-2 w-full py-2 text-xs font-bold rounded-lg border border-blue-300 text-blue-700">대시보드에서 모형 찾기</button> : null; })()}</div> : <div className="m-auto p-6 text-center text-xs text-stone-400"><CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />일정 또는 배치표를 선택하세요.</div>}
        </aside>
      </div>
    </div>
    {dayPopupDate && <div className={isMobile
      ? "fixed inset-x-0 bottom-0 z-[65] flex justify-center px-2 pt-2 pointer-events-none"
      : "fixed inset-0 z-[65] flex items-center justify-center p-6 bg-stone-900/40 pointer-events-none"}>
      <div className={isMobile
        ? "app-modal-panel pointer-events-auto w-full max-w-2xl max-h-[68vh] bg-white rounded-t-2xl shadow-[0_-12px_45px_rgba(28,25,23,0.28)] border border-b-0 border-stone-300 overflow-hidden flex flex-col"
        : "pointer-events-auto w-full max-w-5xl max-h-[88vh] bg-white rounded-2xl shadow-2xl border border-stone-300 overflow-hidden flex flex-col"}>
        <header className="px-4 py-3 border-b flex items-center justify-between bg-stone-50"><div><h3 className="font-extrabold text-stone-900">{dayPopupDate} 등록 내역 및 신규 등록</h3><p className="text-[11px] text-stone-500">배치 {dayLayouts.length}개 · 기사 일정 {dayInstallerSchedules.length}개</p></div><button type="button" onClick={() => { setDayPopupDate(null); setDayAddMode(null); }} aria-label="날짜 작업창 닫기" className="p-2 rounded-full hover:bg-stone-200"><X className="w-4 h-4" /></button></header>
        <div className={isMobile
          ? "min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y custom-scrollbar bg-stone-50"
          : "min-h-0 grid grid-cols-2 items-start bg-stone-50 overflow-hidden"}>
          <section className={isMobile
            ? "p-3 sm:p-4 border-b border-stone-200 space-y-3"
            : "p-4 border-r border-stone-200 space-y-3 min-h-0 overflow-y-auto custom-scrollbar max-h-[70vh]"}>
            <h4 className="text-xs font-extrabold text-stone-800">등록된 건 확인</h4>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5"><p className="text-[11px] font-extrabold text-amber-950 mb-2">배치 {dayLayouts.length}개</p>{dayLayouts.length ? <div className="space-y-1.5">{dayLayouts.map((schedule) => <button key={schedule.id} type="button" onClick={() => openSchedule(schedule)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ scheduleId: schedule.id, x: e.clientX, y: e.clientY }); }} className="w-full p-2 rounded-lg border border-amber-200 bg-white text-left"><span className="block text-xs font-bold text-amber-950 truncate">{schedule.snapshotName || schedule.title}</span><span className="block text-[9px] text-stone-500 mt-0.5">눌러서 배치 미리보기</span></button>)}</div> : <p className="text-[11px] text-amber-700">등록된 배치 없음</p>}</div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-2.5"><p className="text-[11px] font-extrabold text-violet-950 mb-2">기사 일정 {dayInstallerSchedules.length}개</p>{dayInstallerSchedules.length ? <div className="space-y-1.5">{dayInstallerSchedules.map((schedule) => <button key={schedule.id} type="button" onClick={() => openSchedule(schedule)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ scheduleId: schedule.id, x: e.clientX, y: e.clientY }); }} className="w-full p-2 rounded-lg border border-violet-200 bg-white text-left"><span className="block text-xs font-bold text-stone-900 truncate">{schedule.title}</span><span className="block text-[9px] text-stone-500 mt-0.5">{schedule.userName} · {schedule.timeRange} · 눌러서 상세보기</span></button>)}</div> : <p className="text-[11px] text-violet-700">등록된 기사 일정 없음</p>}</div>
          </section>
          <section className={isMobile
            ? "p-3 sm:p-4 space-y-3"
            : "p-4 space-y-3 min-h-0 overflow-y-auto custom-scrollbar max-h-[70vh]"}>
            <h4 className="text-xs font-extrabold text-stone-800">신규 등록</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button type="button" onClick={() => setDayAddMode('layout')} className={`p-3 rounded-xl border-2 text-left ${dayAddMode === 'layout' ? 'border-amber-500 bg-amber-100' : 'border-amber-200 bg-white hover:bg-amber-50'}`}><FolderOpen className="w-4 h-4 text-amber-700 mb-1" /><span className="block text-xs font-extrabold text-amber-950">배치 신규 등록</span></button>
              <button type="button" onClick={() => setDayAddMode('installer')} className={`p-3 rounded-xl border-2 text-left ${dayAddMode === 'installer' ? 'border-violet-500 bg-violet-100' : 'border-violet-200 bg-white hover:bg-violet-50'}`}><CalendarDays className="w-4 h-4 text-violet-700 mb-1" /><span className="block text-xs font-extrabold text-violet-950">기사 일정 신규 등록</span></button>
            </div>
            {!dayAddMode && <div className="p-4 rounded-xl border border-dashed border-stone-300 bg-white text-center text-xs text-stone-500">신규 등록할 종류를 선택하세요.</div>}
            {dayAddMode === 'layout' && <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-3">{snapshots.length ? <div className="space-y-2"><select value={layoutSnapshotId} onChange={(e) => setLayoutSnapshotId(e.target.value)} className={fieldClass}><option value="">저장 배치표 선택</option>{snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{snapshot.name}</option>)}</select><button type="button" disabled={!layoutSnapshotId} onClick={() => registerLayoutForDate(dayPopupDate, true)} className="w-full px-5 py-2.5 text-xs font-extrabold rounded-lg bg-amber-500 text-white disabled:opacity-40">배치 등록</button></div> : <p className="p-3 rounded-lg bg-white border border-amber-200 text-xs text-amber-900">먼저 배치표 저장/불러오기에서 배치표를 저장해 주세요.</p>}</div>}
            {dayAddMode === 'installer' && <div className="rounded-xl border-2 border-violet-200 bg-white overflow-hidden"><ScheduleForm key={`day-${dayPopupDate}-${dayEvents.length}`} defaultDate={dayPopupDate} defaultInstallerId={defaultInstallerId} installers={installers} zones={zones} onCancel={() => setDayAddMode(null)} onSubmit={(data) => { onAddSchedule(data); setDayAddMode(null); setSelectedDayDate(null); }} /></div>}
          </section>
        </div>
      </div>
    </div>}
    {previewSnapshot && <SnapshotPreview snapshot={previewSnapshot} onClose={() => setPreviewSnapshot(null)} onApply={() => { onApplySnapshot(previewSnapshot); setPreviewSnapshot(null); }} />}
    {previewSchedule && <SchedulePreview schedule={previewSchedule} token={previewToken} onClose={() => setPreviewScheduleId(null)} onEdit={() => { setPreviewScheduleId(null); setEditor({ scheduleId: previewSchedule.id }); }} onDelete={() => deleteSchedule(previewSchedule.id)} onLocateToken={() => { if (!previewToken) return; setPreviewScheduleId(null); onLocateToken(previewToken.id); onClose(); }} />}
    {contextMenu && (() => { const schedule = allSchedules.find((item) => item.id === contextMenu.scheduleId); if (!schedule) return null; return <div className="fixed z-[80] w-44 bg-white rounded-xl shadow-2xl border border-stone-200 py-1" style={{ left: Math.min(contextMenu.x, window.innerWidth - 190), top: Math.min(contextMenu.y, window.innerHeight - 180) }} onClick={(e) => e.stopPropagation()}>{isLayout(schedule) ? <button type="button" onClick={() => { openSchedule(schedule); setContextMenu(null); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-amber-50 flex items-center gap-2"><FolderOpen className="w-3.5 h-3.5" />배치 미리보기</button> : <button type="button" onClick={() => { setSelectedDayDate(null); setEditor({ scheduleId: schedule.id }); setDayPopupDate(null); setContextMenu(null); }} className="w-full px-3 py-2 text-left text-xs font-bold hover:bg-stone-50">간편 수정</button>}<button type="button" onClick={() => deleteSchedule(schedule.id)} className="w-full px-3 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" />삭제</button></div>; })()}
  </div>;
};
