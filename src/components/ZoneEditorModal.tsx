import React, { useState, useEffect } from 'react';
import { BoardZone } from '../types';
import { X, Layout, Maximize2 } from 'lucide-react';

interface ZoneEditorModalProps {
  isOpen: boolean;
  zone: Partial<BoardZone> | null;
  onClose: () => void;
  onSave: (zoneData: Partial<BoardZone>) => void;
}

const ZONE_THEMES = [
  { name: '블루 (전단/가공)', bg: 'rgba(239, 246, 255, 0.7)', border: '#93c5fd', header: '#2563eb' },
  { name: '그린 (후단/조립)', bg: 'rgba(240, 253, 244, 0.7)', border: '#86efac', header: '#16a34a' },
  { name: '앰버 (물류/출하)', bg: 'rgba(254, 243, 199, 0.7)', border: '#fde047', header: '#d97706' },
  { name: '로즈 (A/S/긴급)', bg: 'rgba(254, 226, 226, 0.7)', border: '#fca5a5', header: '#dc2626' },
  { name: '퍼플 (특수/정비)', bg: 'rgba(243, 232, 255, 0.7)', border: '#d8b4fe', header: '#9333ea' },
  { name: '슬레이트 (대기/휴식)', bg: 'rgba(241, 245, 249, 0.8)', border: '#cbd5e1', header: '#475569' }
];

const MIN_WIDTH = 10;
const MIN_HEIGHT = 12;

const DEFAULT_RECT = { x: 20, y: 20, width: 25, height: 35 };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Number(n.toFixed(1));

export const ZoneEditorModal: React.FC<ZoneEditorModalProps> = ({
  isOpen,
  zone,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number | undefined>(undefined);
  const [selectedTheme, setSelectedTheme] = useState(ZONE_THEMES[0]);

  // 크기(보드 대비 %). 위치는 보드에서 마우스로만 조정한다.
  const [width, setWidth] = useState(DEFAULT_RECT.width);
  const [height, setHeight] = useState(DEFAULT_RECT.height);

  useEffect(() => {
    if (!isOpen) return;

    if (zone) {
      setTitle(zone.title || '');
      setCode(zone.code || '');
      setSubtitle(zone.subtitle || '');
      setMaxCapacity(zone.maxCapacity);
      setSelectedTheme(ZONE_THEMES.find((t) => t.header === zone.headerColor) || ZONE_THEMES[0]);
      setWidth(zone.width ?? DEFAULT_RECT.width);
      setHeight(zone.height ?? DEFAULT_RECT.height);
    } else {
      setTitle('');
      setCode('');
      setSubtitle('');
      setMaxCapacity(20);
      setSelectedTheme(ZONE_THEMES[0]);
      setWidth(DEFAULT_RECT.width);
      setHeight(DEFAULT_RECT.height);
    }
  }, [zone, isOpen]);

  // ESC 로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('구역명을 입력해주세요.');
      return;
    }

    // 보드 밖으로 벗어나지 않도록 보정한 뒤 저장
    const safeWidth = clamp(Number.isFinite(width) ? width : (zone?.width ?? DEFAULT_RECT.width), MIN_WIDTH, 100);
    const safeHeight = clamp(Number.isFinite(height) ? height : (zone?.height ?? DEFAULT_RECT.height), MIN_HEIGHT, 100);
    const safeCapacity = Number.isFinite(maxCapacity) && Number(maxCapacity) > 0 ? Number(maxCapacity) : undefined;

    onSave({
      id: zone?.id,
      title: title.trim(),
      code: code.trim() || undefined,
      subtitle: subtitle.trim() || undefined,
      maxCapacity: safeCapacity,
      bgColor: selectedTheme.bg,
      borderColor: selectedTheme.border,
      headerColor: selectedTheme.header,
      width: round1(safeWidth),
      height: round1(safeHeight)
    });
  };

  const numberField = (
    label: string,
    value: number,
    setValue: (n: number) => void,
    min: number,
    max: number
  ) => (
    <div>
      <label className="block text-[11px] font-semibold text-stone-600 mb-1 whitespace-nowrap">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isFinite(parsed)) setValue(clamp(parsed, min, max));
          }}
          className="w-full pl-2.5 pr-6 py-1.5 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-stone-400 pointer-events-none">
          %
        </span>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Layout className="w-5 h-5 text-blue-600 shrink-0" />
            <h3 className="font-bold text-stone-800 text-base whitespace-nowrap truncate">
              {zone?.id ? '구역 속성 수정' : '새 보드 구역 추가'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1 whitespace-nowrap">
                구역명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 1구역 (전단 5조)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 whitespace-nowrap">
                코드 (약어)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="예: A-01"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 whitespace-nowrap">
              부제목 / 설명
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="예: 메인 가공 및 전단 라인 (목표 50세트)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* 크기 조정 */}
          <div className="p-3 rounded-xl border border-stone-200 bg-stone-50/70 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-700 whitespace-nowrap">
              <Maximize2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>사이즈 조정</span>
              <span className="font-medium text-[11px] text-stone-400">(보드 전체 대비 비율)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {numberField('너비 W', width, setWidth, MIN_WIDTH, 100)}
              {numberField('높이 H', height, setHeight, MIN_HEIGHT, 100)}
            </div>

            <p className="text-[11px] text-stone-500">구역 위치는 보드에서 구역 상단을 드래그해 조정하세요.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5 whitespace-nowrap">
              테마 색상
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ZONE_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                  className={`p-2 rounded-lg border text-left text-xs font-medium transition-all whitespace-nowrap ${
                    selectedTheme.header === theme.header
                      ? 'ring-2 ring-blue-600 font-bold shadow-xs'
                      : 'hover:opacity-90'
                  }`}
                >
                  <span
                    style={{ backgroundColor: theme.header }}
                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                  />
                  <span>{theme.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 whitespace-nowrap">
              최대 수용 정원 (선택)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxCapacity || ''}
              onChange={(e) => setMaxCapacity(e.target.value ? Number(e.target.value) : undefined)}
              placeholder="예: 10"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg whitespace-nowrap"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm whitespace-nowrap"
            >
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
