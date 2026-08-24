import React, { useState } from 'react';
import { UserAccount, ScheduleItem, ActivityLog, MagnetToken, BoardZone } from '../types';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, Plus, User, ArrowRight, History, Shield, Phone, Sparkles, Filter, ChevronRight, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface UserScheduleHistoryDrawerProps {
  isOpen: boolean;
  user: UserAccount;
  allSchedules: ScheduleItem[];
  allLogs: ActivityLog[];
  tokens: MagnetToken[];
  zones: BoardZone[];
  onClose: () => void;
  onUpdateScheduleStatus: (scheduleId: string, status: ScheduleItem['status']) => void;
  onAddSchedule: (schedule: Omit<ScheduleItem, 'id'>) => void;
  onSwitchUser: () => void;
  onLocateToken: (tokenId: string) => void;
}

export const UserScheduleHistoryDrawer: React.FC<UserScheduleHistoryDrawerProps> = ({
  isOpen,
  user,
  allSchedules,
  allLogs,
  tokens,
  zones,
  onClose,
  onUpdateScheduleStatus,
  onAddSchedule,
  onSwitchUser,
  onLocateToken
}) => {
  const [activeTab, setActiveTab] = useState<'schedules' | 'history' | 'addSchedule'>('schedules');
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'today' | 'pending' | 'completed'>('all');

  // Form states for new schedule
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTimeRange, setNewTimeRange] = useState('09:00 ~ 18:00');
  const [newZoneId, setNewZoneId] = useState(zones[0]?.id || '');
  const [newLocation, setNewLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  // Filter schedules for this user (or if representative / manager, can see all but highlights user's)
  const isManager = user.role === '대표' || user.role === '현장소장';
  
  const userSchedules = allSchedules.filter(s => {
    if (user.role === '게스트') return true;
    if (s.userId === user.id || s.userName.includes(user.name)) return true;
    return false;
  });

  // Filter logs related to this user
  const userLogs = allLogs.filter(l => {
    if (user.role === '게스트') return true;
    return (
      l.userName.includes(user.name) ||
      l.targetName.includes(user.name) ||
      (user.email && l.userEmail === user.email)
    );
  });

  // Find user's linked magnet on board
  const myMagnet = tokens.find(t => t.id === user.assignedMagnetId || t.title === user.name);

  const handleStatusToggle = (sch: ScheduleItem) => {
    let nextStatus: ScheduleItem['status'] = 'in-progress';
    if (sch.status === 'scheduled') nextStatus = 'in-progress';
    else if (sch.status === 'in-progress') {
      nextStatus = 'completed';
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      } catch (e) {}
    } else if (sch.status === 'completed') nextStatus = 'scheduled';

    onUpdateScheduleStatus(sch.id, nextStatus);
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const selectedZone = zones.find(z => z.id === newZoneId);

    onAddSchedule({
      userId: user.id,
      userName: user.name,
      title: newTitle.trim(),
      date: newDate,
      timeRange: newTimeRange,
      zoneId: newZoneId,
      zoneName: selectedZone?.title || '미지정 구역',
      role: user.role,
      status: 'scheduled',
      location: newLocation.trim() || '현장 작업대',
      notes: newNotes.trim() || undefined
    });

    setNewTitle('');
    setNewNotes('');
    setActiveTab('schedules');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md md:max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Profile Section */}
        <div className="p-5 border-b border-stone-200 bg-stone-50/90 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-full bg-blue-100 text-blue-700">
                내 계정 포털
              </span>
              <span className="text-xs text-stone-500 font-mono">
                {new Date().toLocaleDateString('ko-KR', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                style={{ backgroundColor: user.avatarColor || '#3b82f6' }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm border-2 border-white"
              >
                {user.name.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-900 text-lg">{user.name}</h3>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded bg-stone-200 text-stone-700">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-stone-500 mt-0.5">
                  <span>{user.department || '현장 시공팀'}</span>
                  {user.phone && <span>• {user.phone}</span>}
                </div>
              </div>
            </div>

            <button
              onClick={onSwitchUser}
              className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              계정 전환
            </button>
          </div>

          {/* Connected Magnet status card */}
          {myMagnet ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200/80 shadow-xs">
              <div className="flex items-center gap-2">
                <div
                  style={{ backgroundColor: myMagnet.color }}
                  className="w-6 h-6 rounded-full border border-stone-300 flex items-center justify-center text-[10px] font-bold shadow-xs"
                >
                  📍
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-stone-800">보드 모형 배치 위치:</span>{' '}
                  <span className="text-blue-600 font-bold">
                    {zones.find(z => z.id === myMagnet.zoneId)?.title || '자유 배치'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  onLocateToken(myMagnet.id);
                  onClose();
                }}
                className="px-2 py-1 text-[11px] font-bold text-white bg-stone-800 hover:bg-stone-900 rounded-md transition-colors"
              >
                보드에서 찾기
              </button>
            </div>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
              보드에 등록된 전용 모형이 없습니다. 화면 하단의 [새 모형 추가] 버튼으로 나만의 자석을 만들어보세요!
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 bg-white px-5">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'schedules'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>배정된 일정 ({userSchedules.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>작업 및 이동 이력 ({userLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('addSchedule')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'addSchedule'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>일정 추가</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {/* 1. Schedules Tab */}
          {activeTab === 'schedules' && (
            <div className="space-y-3">
              {userSchedules.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-stone-200 rounded-2xl">
                  <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                  <p className="font-semibold text-stone-700 text-sm">배정된 일정이 없습니다</p>
                  <p className="text-xs text-stone-400 mt-1">
                    새로운 현장 작업 일정을 등록해보세요.
                  </p>
                  <button
                    onClick={() => setActiveTab('addSchedule')}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    ➕ 새 일정 배정하기
                  </button>
                </div>
              ) : (
                userSchedules.map((sch) => {
                  const statusBadge: Record<ScheduleItem['status'], { label: string; bg: string; text: string }> = {
                    'scheduled': { label: '예정', bg: 'bg-amber-100', text: 'text-amber-800' },
                    'in-progress': { label: '진행중', bg: 'bg-blue-100', text: 'text-blue-800' },
                    'completed': { label: '완료됨', bg: 'bg-green-100', text: 'text-green-800' },
                    'cancelled': { label: '취소', bg: 'bg-stone-100', text: 'text-stone-600' }
                  };
                  const currentBadge = statusBadge[sch.status] || statusBadge.scheduled;

                  return (
                    <div
                      key={sch.id}
                      className={`p-4 rounded-xl border transition-all ${
                        sch.status === 'completed'
                          ? 'bg-stone-50/70 border-stone-200 opacity-80'
                          : sch.status === 'in-progress'
                          ? 'bg-blue-50/40 border-blue-200 shadow-xs'
                          : 'bg-white border-stone-200 shadow-xs hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentBadge.bg} ${currentBadge.text}`}>
                              {currentBadge.label}
                            </span>
                            <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                              {sch.zoneName}
                            </span>
                          </div>
                          <h4 className="font-bold text-stone-900 text-sm mt-1.5">
                            {sch.title}
                          </h4>
                        </div>

                        <button
                          onClick={() => handleStatusToggle(sch)}
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
                            sch.status === 'completed'
                              ? 'bg-green-600 text-white'
                              : sch.status === 'in-progress'
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{sch.status === 'completed' ? '완료됨' : sch.status === 'in-progress' ? '완료처리' : '작업시작'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-stone-100 text-xs text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-stone-400" />
                          <span>{sch.date} ({sch.timeRange})</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span className="truncate">{sch.location}</span>
                        </div>
                      </div>

                      {sch.notes && (
                        <div className="mt-2 text-xs text-stone-500 bg-stone-100/80 p-2 rounded-lg italic">
                          "{sch.notes}"
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 2. Activity History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {userLogs.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  기록된 작업 및 배치 이력이 없습니다.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                  {userLogs.map((log) => {
                    const actionIcon: Record<string, string> = {
                      create: '➕',
                      move: '🔄',
                      update: '✏️',
                      delete: '🗑️',
                      schedule_change: '📅',
                      status_change: '⚡',
                      import: '📥'
                    };

                    return (
                      <div key={log.id} className="relative group">
                        {/* Timeline node */}
                        <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-xs flex items-center justify-center text-[8px]" />

                        <div className="p-3 bg-white rounded-xl border border-stone-200/90 shadow-2xs hover:border-stone-300 transition-colors">
                          <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
                            <span className="font-semibold text-stone-700">
                              {actionIcon[log.action] || '📌'} {log.userName}
                            </span>
                            <span className="font-mono">{log.timestamp}</span>
                          </div>

                          <p className="text-xs font-bold text-stone-800">
                            {log.targetName}
                          </p>

                          <p className="text-xs text-stone-600 mt-0.5">
                            {log.description}
                          </p>

                          {log.fromZone && log.toZone && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] bg-blue-50 text-blue-800 rounded font-medium">
                              <span>{log.fromZone}</span>
                              <ArrowRight className="w-3 h-3 text-blue-500" />
                              <span>{log.toZone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Add Schedule Tab */}
          {activeTab === 'addSchedule' && (
            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  일정 / 작업명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 2구역 싱크대 도어 피팅 및 검수"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    작업 일자
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    시간대
                  </label>
                  <input
                    type="text"
                    value={newTimeRange}
                    onChange={(e) => setNewTimeRange(e.target.value)}
                    placeholder="예: 09:00 ~ 17:00"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  배정 구역
                </label>
                <select
                  value={newZoneId}
                  onChange={(e) => setNewZoneId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                >
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.code ? `[${z.code}] ` : ''}{z.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  현장 위치
                </label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="예: SK테크노파크 D동 2라인"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  작업 특이사항 / 메모
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  placeholder="작업자 준수사항, 필요한 공구 및 자재 등을 기록하세요."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>일정 등록 완료</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
