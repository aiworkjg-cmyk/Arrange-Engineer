import React, { useEffect, useMemo, useState } from 'react';
import { BoardZone, MagnetToken, ScheduleItem } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus, Search, UserRound, X } from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface UserScheduleHistoryDrawerProps {
  isOpen: boolean;
  allSchedules: ScheduleItem[];
  tokens: MagnetToken[];
  zones: BoardZone[];
  initialTokenId: string | null;
  onClose: () => void;
  onUpdateScheduleStatus: (scheduleId: string, status: ScheduleItem['status']) => void;
  onAddSchedule: (schedule: Omit<ScheduleItem, 'id'>) => void;
  onLocateToken: (tokenId: string) => void;
}

const STATUS_LABELS: Record<ScheduleItem['status'], string> = {
  scheduled: '예정',
  'in-progress': '진행중',
  completed: '완료',
  cancelled: '취소'
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayIso = () => formatLocalDate(new Date());

export const UserScheduleHistoryDrawer: React.FC<UserScheduleHistoryDrawerProps> = ({
  isOpen,
  allSchedules,
  tokens,
  zones,
  initialTokenId,
  onClose,
  onUpdateScheduleStatus,
  onAddSchedule,
  onLocateToken
}) => {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedTokenId, setSelectedTokenId] = useState('all');
  const [tokenQuery, setTokenQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTokenId, setNewTokenId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState(todayIso());
  const [newEndDate, setNewEndDate] = useState(todayIso());
  const [newTimeRange, setNewTimeRange] = useState('09:00 ~ 18:00');
  const [newZoneId, setNewZoneId] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    const initial = initialTokenId && tokens.some((token) => token.id === initialTokenId)
      ? initialTokenId
      : 'all';
    setSelectedTokenId(initial);
    setNewTokenId(initial === 'all' ? tokens[0]?.id || '' : initial);
    setNewZoneId(zones[0]?.id || '');
  }, [initialTokenId, isOpen, tokens, zones]);

  const matchesToken = (schedule: ScheduleItem, token: MagnetToken) =>
    schedule.userName === token.title || (!!token.assignedUserId && schedule.userId === token.assignedUserId);

  const selectedToken = tokens.find((token) => token.id === selectedTokenId);
  const filteredSchedules = useMemo(() => {
    if (!selectedToken) return allSchedules;
    return allSchedules.filter((schedule) => matchesToken(schedule, selectedToken));
  }, [allSchedules, selectedToken]);

  const visibleTokens = useMemo(() => {
    const query = tokenQuery.trim().toLowerCase();
    return tokens.filter((token) => !query || token.title.toLowerCase().includes(query) || token.subtitle?.toLowerCase().includes(query));
  }, [tokenQuery, tokens]);

  const calendarDays = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  if (!isOpen) return null;

  const schedulesForDate = (date: string) => filteredSchedules.filter((schedule) =>
    date >= schedule.date && date <= (schedule.endDate || schedule.date)
  );

  const moveMonth = (delta: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  const handleCreateSchedule = (event: React.FormEvent) => {
    event.preventDefault();
    const token = tokens.find((item) => item.id === newTokenId);
    if (!token || !newTitle.trim()) return;
    const zone = zones.find((item) => item.id === newZoneId);
    const startDate = newStartDate <= newEndDate ? newStartDate : newEndDate;
    const endDate = newStartDate <= newEndDate ? newEndDate : newStartDate;

    onAddSchedule({
      userId: token.assignedUserId,
      userName: token.title,
      title: newTitle.trim(),
      date: startDate,
      endDate,
      timeRange: newTimeRange,
      zoneId: zone?.id,
      zoneName: zone?.title || '미지정 구역',
      role: token.subtitle || '부사수',
      status: 'scheduled',
      location: newLocation.trim() || zone?.title || '현장',
      notes: newNotes.trim() || undefined
    });
    setSelectedTokenId(token.id);
    setMonth(new Date(`${startDate}T00:00:00`));
    setNewTitle('');
    setNewNotes('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/50 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-[1500px] h-[min(900px,95vh)] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
        <header className="px-5 py-4 border-b border-stone-200 bg-stone-50/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center"><CalendarDays className="w-5 h-5" /></div>
            <div><h2 className="font-extrabold text-stone-900">일정 캘린더</h2><p className="text-xs text-stone-500">기사별 일정과 여러 날짜에 걸친 현장 배정을 한눈에 관리합니다.</p></div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-stone-200 text-stone-500"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[240px_minmax(600px,1fr)_330px]">
          <aside className="min-h-0 border-b xl:border-b-0 xl:border-r border-stone-200 flex flex-col bg-stone-50/50">
            <div className="p-3 border-b border-stone-200">
              <label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" /><input value={tokenQuery} onChange={(event) => setTokenQuery(event.target.value)} placeholder="시공기사 이름 검색" className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500" /></label>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              <button type="button" onClick={() => setSelectedTokenId('all')} className={`w-full p-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between ${selectedTokenId === 'all' ? 'bg-violet-600 text-white' : 'hover:bg-white text-stone-700'}`}><span>전체 기사</span><span>{allSchedules.length}</span></button>
              {visibleTokens.map((token) => {
                const count = allSchedules.filter((schedule) => matchesToken(schedule, token)).length;
                return <button key={token.id} type="button" onClick={() => { setSelectedTokenId(token.id); setNewTokenId(token.id); }} className={`w-full p-2.5 rounded-xl text-left flex items-center gap-2 ${selectedTokenId === token.id ? 'bg-blue-100 ring-1 ring-blue-300' : 'hover:bg-white'}`}>
                  <span style={{ backgroundColor: token.color }} className="w-7 h-7 rounded-full border border-stone-300 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-stone-800 truncate">{token.title}</span><span className="block text-[10px] text-stone-500 truncate">{token.subtitle || '부사수'}</span></span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{count}</span>
                </button>;
              })}
            </div>
          </aside>

          <main className="min-h-0 flex flex-col p-3 sm:p-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveMonth(-1)} className="p-2 rounded-lg hover:bg-stone-100"><ChevronLeft className="w-4 h-4" /></button>
                <button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-200 hover:bg-stone-50">오늘</button>
                <button type="button" onClick={() => moveMonth(1)} className="p-2 rounded-lg hover:bg-stone-100"><ChevronRight className="w-4 h-4" /></button>
              </div>
              <h3 className="text-lg font-extrabold text-stone-900">{month.getFullYear()}년 {month.getMonth() + 1}월</h3>
              <button type="button" onClick={() => setShowAddForm((current) => !current)} className="px-3 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" />일정 추가</button>
            </div>

            <div className="grid grid-cols-7 border border-stone-200 rounded-t-xl overflow-hidden shrink-0">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => <div key={day} className={`py-2 text-center text-[11px] font-bold bg-stone-100 ${index === 0 ? 'text-rose-600' : index === 6 ? 'text-blue-600' : 'text-stone-600'}`}>{day}</div>)}
            </div>
            <div className="flex-1 min-h-[520px] grid grid-cols-7 grid-rows-6 border-x border-b border-stone-200 rounded-b-xl overflow-hidden">
              {calendarDays.map((date) => {
                const iso = formatLocalDate(date);
                const events = schedulesForDate(iso);
                const inMonth = date.getMonth() === month.getMonth();
                const isToday = iso === todayIso();
                return <div key={iso} className={`min-w-0 min-h-0 border-r border-b border-stone-100 p-1.5 overflow-hidden ${inMonth ? 'bg-white' : 'bg-stone-50/70'}`}>
                  <div className={`w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-full mb-1 ${isToday ? 'bg-violet-600 text-white' : inMonth ? 'text-stone-700' : 'text-stone-300'}`}>{date.getDate()}</div>
                  <div className="space-y-1">
                    {events.slice(0, 4).map((schedule) => {
                      const token = tokens.find((item) => matchesToken(schedule, item));
                      return <div key={schedule.id} title={`${schedule.userName} · ${schedule.title} · ${schedule.date}~${schedule.endDate || schedule.date}`} style={{ borderLeftColor: token?.color || '#8b5cf6' }} className="truncate border-l-4 bg-violet-50 text-violet-900 px-1.5 py-1 rounded-r text-[9px] font-bold">{schedule.userName} · {schedule.title}</div>;
                    })}
                    {events.length > 4 && <div className="text-[9px] font-bold text-stone-400 px-1">+{events.length - 4}개 더보기</div>}
                  </div>
                </div>;
              })}
            </div>
          </main>

          <aside className="min-h-0 border-t xl:border-t-0 xl:border-l border-stone-200 flex flex-col bg-stone-50/50">
            {showAddForm ? (
              <form onSubmit={handleCreateSchedule} className="p-4 overflow-y-auto custom-scrollbar space-y-3">
                <div><h3 className="font-bold text-stone-900">새 일정 배정</h3><p className="text-[11px] text-stone-500 mt-1">시작일과 종료일을 지정하면 여러 날짜에 길게 표시됩니다.</p></div>
                <div><label className="block text-xs font-bold text-stone-700 mb-1">시공기사</label><select value={newTokenId} onChange={(event) => setNewTokenId(event.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white" required><option value="">기사 선택</option>{tokens.map((token) => <option key={token.id} value={token.id}>{token.title} · {token.subtitle || '부사수'}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-stone-700 mb-1">일정 / 현장명</label><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="예: 광명 현장 싱크대 시공" className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300" required /></div>
                <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-bold text-stone-700 mb-1">시작일</label><input type="date" value={newStartDate} onChange={(event) => { setNewStartDate(event.target.value); if (event.target.value > newEndDate) setNewEndDate(event.target.value); }} className="w-full px-2 py-2 text-xs rounded-lg border border-stone-300" /></div><div><label className="block text-xs font-bold text-stone-700 mb-1">종료일</label><input type="date" min={newStartDate} value={newEndDate} onChange={(event) => setNewEndDate(event.target.value)} className="w-full px-2 py-2 text-xs rounded-lg border border-stone-300" /></div></div>
                <div><label className="block text-xs font-bold text-stone-700 mb-1">시간</label><input value={newTimeRange} onChange={(event) => setNewTimeRange(event.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300" /></div>
                <div><label className="block text-xs font-bold text-stone-700 mb-1">구역</label><select value={newZoneId} onChange={(event) => setNewZoneId(event.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"><option value="">미지정</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.title}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-stone-700 mb-1">현장 위치</label><input value={newLocation} onChange={(event) => setNewLocation(event.target.value)} placeholder="현장 주소 또는 위치" className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300" /></div>
                <div><label className="block text-xs font-bold text-stone-700 mb-1">메모</label><textarea value={newNotes} onChange={(event) => setNewNotes(event.target.value)} rows={3} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 resize-none" /></div>
                <div className="flex gap-2"><button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-2 text-xs font-bold rounded-lg bg-stone-200 text-stone-700">취소</button><button type="submit" className="flex-1 py-2 text-xs font-bold rounded-lg bg-violet-600 text-white">일정 등록</button></div>
              </form>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="p-4 border-b border-stone-200"><h3 className="font-bold text-stone-900">{selectedToken ? `${selectedToken.title} 일정` : '전체 일정'}</h3><p className="text-[11px] text-stone-500 mt-1">{filteredSchedules.length}건의 배정 일정</p></div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                  {filteredSchedules.map((schedule) => {
                    const token = tokens.find((item) => matchesToken(schedule, item));
                    return <div key={schedule.id} className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
                      <div className="flex items-start justify-between gap-2"><div><span className="text-[10px] font-bold text-violet-700">{schedule.userName}</span><h4 className="text-xs font-extrabold text-stone-900 mt-0.5">{schedule.title}</h4></div><select value={schedule.status} onChange={(event) => onUpdateScheduleStatus(schedule.id, event.target.value as ScheduleItem['status'])} className="text-[10px] px-1.5 py-1 rounded border border-stone-200 bg-white">{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
                      <div className="mt-2 space-y-1 text-[10px] text-stone-500"><div className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{schedule.date}{schedule.endDate && schedule.endDate !== schedule.date ? ` ~ ${schedule.endDate}` : ''}</div><div className="flex items-center gap-1"><Clock className="w-3 h-3" />{schedule.timeRange}</div><div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{schedule.location}</div></div>
                      {token && <button type="button" onClick={() => { onLocateToken(token.id); onClose(); }} className="mt-2 text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-1"><UserRound className="w-3 h-3" />보드에서 기사 찾기</button>}
                    </div>;
                  })}
                  {filteredSchedules.length === 0 && <div className="py-12 text-center text-xs text-stone-400">배정된 일정이 없습니다.</div>}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
