import React, { useEffect, useMemo, useState } from 'react';
import { Check, LayoutList, Pencil, Plus, Search, Trash2, Wand2, X } from 'lucide-react';
import { BoardZone, MagnetToken } from '../types';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface ZoneManagerModalProps {
  isOpen: boolean;
  zones: BoardZone[];
  tokens: MagnetToken[];
  onAdd: () => void;
  onEdit: (zone: BoardZone) => void;
  onDelete: (zoneIds: string[]) => void;
  onApplyBulk: (zoneIds: string[], patch: Partial<BoardZone>) => void;
  onClose: () => void;
}

const THEMES = [
  { name: '블루', bgColor: 'rgba(239, 246, 255, 0.7)', borderColor: '#93c5fd', headerColor: '#2563eb' },
  { name: '그린', bgColor: 'rgba(240, 253, 244, 0.7)', borderColor: '#86efac', headerColor: '#16a34a' },
  { name: '앰버', bgColor: 'rgba(254, 243, 199, 0.7)', borderColor: '#fde047', headerColor: '#d97706' },
  { name: '로즈', bgColor: 'rgba(254, 226, 226, 0.7)', borderColor: '#fca5a5', headerColor: '#dc2626' },
  { name: '퍼플', bgColor: 'rgba(243, 232, 255, 0.7)', borderColor: '#d8b4fe', headerColor: '#9333ea' },
  { name: '슬레이트', bgColor: 'rgba(241, 245, 249, 0.8)', borderColor: '#cbd5e1', headerColor: '#475569' }
];

type BulkField = 'theme' | 'capacity' | 'size';

export const ZoneManagerModal: React.FC<ZoneManagerModalProps> = ({
  isOpen,
  zones,
  tokens,
  onAdd,
  onEdit,
  onDelete,
  onApplyBulk,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [enabled, setEnabled] = useState<Record<BulkField, boolean>>({ theme: false, capacity: false, size: false });
  const [themeIndex, setThemeIndex] = useState(0);
  const [capacity, setCapacity] = useState(10);
  const [width, setWidth] = useState(25);
  const [height, setHeight] = useState(35);

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIds([]);
  }, [isOpen]);

  useEffect(() => {
    const existingIds = new Set(zones.map((zone) => zone.id));
    setSelectedIds((current) => current.filter((id) => existingIds.has(id)));
  }, [zones]);

  const visibleZones = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return zones.filter((zone) =>
      !normalizedQuery ||
      zone.title.toLowerCase().includes(normalizedQuery) ||
      zone.code?.toLowerCase().includes(normalizedQuery) ||
      zone.subtitle?.toLowerCase().includes(normalizedQuery)
    );
  }, [query, zones]);

  if (!isOpen) return null;

  const selectedSet = new Set(selectedIds);
  const allSelected = zones.length > 0 && zones.every((zone) => selectedSet.has(zone.id));
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  const toggleZone = (zoneId: string) => {
    setSelectedIds((current) =>
      current.includes(zoneId) ? current.filter((id) => id !== zoneId) : [...current, zoneId]
    );
  };

  const applyBulk = () => {
    if (!selectedIds.length || !enabledCount) return;
    const patch: Partial<BoardZone> = {};
    if (enabled.theme) {
      const theme = THEMES[themeIndex];
      patch.bgColor = theme.bgColor;
      patch.borderColor = theme.borderColor;
      patch.headerColor = theme.headerColor;
    }
    if (enabled.capacity) patch.maxCapacity = capacity;
    if (enabled.size) {
      patch.width = width;
      patch.height = height;
    }
    onApplyBulk(selectedIds, patch);
  };

  const fieldClass = (field: BulkField) =>
    `rounded-xl border p-3 transition-colors ${enabled[field] ? 'border-amber-300 bg-amber-50/60' : 'border-stone-200 bg-stone-50/60'}`;

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/55 backdrop-blur-xs" onClick={onClose}>
      <div className="app-modal-panel w-full max-w-6xl h-[min(760px,92vh)] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-200 bg-amber-50/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><LayoutList className="w-5 h-5" /></div>
            <div><h2 className="font-extrabold text-stone-900">구역 관리</h2><p className="text-xs text-stone-500 mt-0.5">전체 구역을 확인하고 생성·삭제·일괄 변경할 수 있습니다.</p></div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-stone-200 text-stone-500"><X className="w-5 h-5" /></button>
        </header>

        <div className="responsive-split flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(360px,0.95fr)_minmax(440px,1.05fr)]">
          <section className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-200">
            <div className="p-4 space-y-3 border-b border-stone-100">
              <div className="flex items-center justify-between gap-2"><div><span className="font-bold text-sm text-stone-800">전체 구역</span><span className="ml-2 text-xs text-stone-500">{zones.length}개 중 {selectedIds.length}개 선택</span></div><div className="flex gap-1"><button type="button" onClick={onAdd} className="px-2.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" />추가</button><button type="button" disabled={!selectedIds.length} onClick={() => onDelete(selectedIds)} className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 border border-rose-200 rounded-lg flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />삭제</button></div></div>
              <label className="relative block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="구역명, 코드, 설명 검색" className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500" /></label>
            </div>

            <div className="px-3 pt-3"><button type="button" onClick={() => setSelectedIds(allSelected ? [] : zones.map((zone) => zone.id))} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left font-bold text-xs ${allSelected ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}><span className={`w-5 h-5 rounded-md border flex items-center justify-center ${allSelected ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-stone-300'}`}>{allSelected && <Check className="w-3.5 h-3.5" />}</span>전체 구역 선택<span className="ml-auto text-[11px] font-medium text-stone-500">{zones.length}개</span></button></div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {visibleZones.map((zone) => {
                const checked = selectedSet.has(zone.id);
                const count = tokens.filter((token) => token.zoneId === zone.id).length;
                return <div key={zone.id} onClick={() => toggleZone(zone.id)} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${checked ? 'border-amber-300 bg-amber-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                  <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-stone-300'}`}>{checked && <Check className="w-3.5 h-3.5" />}</span>
                  <span style={{ backgroundColor: zone.headerColor }} className="w-2 h-10 rounded-full shrink-0" />
                  <span className="min-w-0 flex-1"><button type="button" onClick={(event) => { event.stopPropagation(); onEdit(zone); }} className="group flex items-center gap-1.5 max-w-full font-bold text-sm text-stone-900 hover:text-amber-700"><span className="truncate">{zone.title}</span><Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100" /></button><span className="block text-[11px] text-stone-500 truncate">{zone.code || '코드 없음'} · 모형 {count}개 · 정원 {zone.maxCapacity || '-'}명</span></span>
                  <span className="text-[10px] font-mono text-stone-400">{zone.width}×{zone.height}%</span>
                </div>;
              })}
              {!visibleZones.length && <div className="py-14 text-center text-sm text-stone-400">조건에 맞는 구역이 없습니다.</div>}
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-5">
            <h3 className="font-bold text-stone-900">일괄 변경 속성</h3><p className="text-xs text-stone-500 mt-1 mb-4">체크한 속성만 선택한 구역에 적용됩니다.</p>
            <div className="space-y-3">
              <div className={fieldClass('theme')}><label className="flex items-center gap-2 text-xs font-bold text-stone-800 mb-3"><input type="checkbox" checked={enabled.theme} onChange={() => setEnabled((current) => ({ ...current, theme: !current.theme }))} className="accent-amber-600" />색상 테마 적용</label><div className="grid grid-cols-3 gap-2">{THEMES.map((theme, index) => <button key={theme.name} type="button" onClick={() => { setThemeIndex(index); setEnabled((current) => ({ ...current, theme: true })); }} style={{ borderColor: theme.borderColor, backgroundColor: theme.bgColor, color: theme.headerColor }} className={`py-2 rounded-lg border-2 text-xs font-bold ${themeIndex === index ? 'ring-2 ring-amber-500 ring-offset-1' : ''}`}>{theme.name}</button>)}</div></div>
              <div className={fieldClass('capacity')}><label className="flex items-center gap-2 text-xs font-bold text-stone-800 mb-3"><input type="checkbox" checked={enabled.capacity} onChange={() => setEnabled((current) => ({ ...current, capacity: !current.capacity }))} className="accent-amber-600" />최대 수용 인원 적용</label><input type="number" min={1} max={999} value={capacity} onChange={(event) => { setCapacity(Number(event.target.value)); setEnabled((current) => ({ ...current, capacity: true })); }} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300" /></div>
              <div className={fieldClass('size')}><label className="flex items-center gap-2 text-xs font-bold text-stone-800 mb-3"><input type="checkbox" checked={enabled.size} onChange={() => setEnabled((current) => ({ ...current, size: !current.size }))} className="accent-amber-600" />구역 크기 적용</label><div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-stone-500">너비 (%)<input type="number" min={10} max={90} value={width} onChange={(event) => { setWidth(Number(event.target.value)); setEnabled((current) => ({ ...current, size: true })); }} className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-stone-300" /></label><label className="text-[11px] text-stone-500">높이 (%)<input type="number" min={12} max={90} value={height} onChange={(event) => { setHeight(Number(event.target.value)); setEnabled((current) => ({ ...current, size: true })); }} className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-stone-300" /></label></div></div>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 px-5 py-3 border-t border-stone-200 bg-stone-50"><span className="text-xs text-stone-500">구역 이름을 클릭하면 개별 상세 설정이 열립니다.</span><div className="flex gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200 rounded-lg">닫기</button><button type="button" onClick={applyBulk} disabled={!selectedIds.length || !enabledCount} className="px-5 py-2 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-stone-300 rounded-lg flex items-center gap-2"><Wand2 className="w-4 h-4" />{selectedIds.length}개 구역에 적용</button></div></footer>
      </div>
    </div>
  );
};
