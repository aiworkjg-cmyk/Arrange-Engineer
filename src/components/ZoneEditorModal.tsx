import React, { useState, useEffect } from 'react';
import { BoardZone } from '../types';
import { X, Layout, Palette } from 'lucide-react';

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

export const ZoneEditorModal: React.FC<ZoneEditorModalProps> = ({
  isOpen,
  zone,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number | undefined>(undefined);
  const [selectedTheme, setSelectedTheme] = useState(ZONE_THEMES[0]);

  useEffect(() => {
    if (zone) {
      setTitle(zone.title || '');
      setCode(zone.code || '');
      setSubtitle(zone.subtitle || '');
      setDescription(zone.description || '');
      setMaxCapacity(zone.maxCapacity);
      const match = ZONE_THEMES.find(t => t.header === zone.headerColor) || ZONE_THEMES[0];
      setSelectedTheme(match);
    } else {
      setTitle('');
      setCode('');
      setSubtitle('');
      setDescription('');
      setMaxCapacity(10);
      setSelectedTheme(ZONE_THEMES[0]);
    }
  }, [zone, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('구역명을 입력해주세요.');
      return;
    }

    onSave({
      id: zone?.id,
      title: title.trim(),
      code: code.trim() || undefined,
      subtitle: subtitle.trim() || undefined,
      description: description.trim() || undefined,
      maxCapacity: maxCapacity ? Number(maxCapacity) : undefined,
      bgColor: selectedTheme.bg,
      borderColor: selectedTheme.border,
      headerColor: selectedTheme.header
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-stone-800 text-base">
              {zone?.id ? '구역 속성 수정' : '새 보드 구역 추가'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                구역명 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 1구역 (전단 5조)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
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
            <label className="block text-xs font-semibold text-stone-700 mb-1">
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

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              테마 색상
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ZONE_THEMES.map((theme) => (
                <button
                  key={theme.name}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  style={{ backgroundColor: theme.bg, borderColor: theme.border }}
                  className={`p-2 rounded-lg border text-left text-xs font-medium transition-all ${
                    selectedTheme.header === theme.header
                      ? 'ring-2 ring-blue-600 font-bold shadow-xs'
                      : 'hover:opacity-90'
                  }`}
                >
                  <span
                    style={{ backgroundColor: theme.header }}
                    className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle"
                  />
                  <span className="truncate">{theme.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
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
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
