import React, { useEffect, useMemo, useState } from 'react';
import { Check, ListChecks, Pencil, Plus, Search, Trash2, Wand2, X } from 'lucide-react';
import {
  BoardZone,
  MagnetFontStyle,
  MagnetShape,
  MagnetStatus,
  MagnetToken
} from '../types';
import { MAX_TOKEN_PX, MIN_TOKEN_PX, SIZE_PRESET_PX } from '../utils/layout';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface MagnetManagerModalProps {
  isOpen: boolean;
  tokens: MagnetToken[];
  zones: BoardZone[];
  selectedTokenIds: string[];
  onSelectionChange: (tokenIds: string[]) => void;
  onApplyBulk: (tokenIds: string[], patch: Partial<MagnetToken>) => void;
  onAdd: () => void;
  onEdit: (token: MagnetToken) => void;
  onDelete: (tokenIds: string[]) => void;
  onClose: () => void;
}

const COLORS = [
  { hex: '#fef9c3', text: '#1c1917' },
  { hex: '#bbf7d0', text: '#14532d' },
  { hex: '#bae6fd', text: '#0c4a6e' },
  { hex: '#fecdd3', text: '#881337' },
  { hex: '#e9d5ff', text: '#581c87' },
  { hex: '#fed7aa', text: '#7c2d12' },
  { hex: '#e2e8f0', text: '#1e293b' },
  { hex: '#334155', text: '#f8fafc' }
];

type BulkField = 'size' | 'color' | 'font' | 'shape' | 'status';

export const MagnetManagerModal: React.FC<MagnetManagerModalProps> = ({
  isOpen,
  tokens,
  zones,
  selectedTokenIds,
  onSelectionChange,
  onApplyBulk,
  onAdd,
  onEdit,
  onDelete,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [enabled, setEnabled] = useState<Record<BulkField, boolean>>({
    size: false,
    color: false,
    font: false,
    shape: false,
    status: false
  });
  const [sizePx, setSizePx] = useState(SIZE_PRESET_PX.md);
  const [color, setColor] = useState(COLORS[0].hex);
  const [textColor, setTextColor] = useState(COLORS[0].text);
  const [fontStyle, setFontStyle] = useState<MagnetFontStyle>('handwriting');
  const [shape, setShape] = useState<MagnetShape>('circle');
  const [status, setStatus] = useState<MagnetStatus>('assigned');

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setZoneFilter('all');
  }, [isOpen]);

  const zoneNameMap = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone.title])),
    [zones]
  );

  const visibleTokens = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tokens.filter((token) => {
      const matchesZone =
        zoneFilter === 'all' ||
        (zoneFilter === 'free' ? !token.zoneId : token.zoneId === zoneFilter);
      const matchesQuery =
        !normalizedQuery ||
        token.title.toLowerCase().includes(normalizedQuery) ||
        token.subtitle?.toLowerCase().includes(normalizedQuery) ||
        token.phone?.includes(normalizedQuery);
      return matchesZone && !!matchesQuery;
    });
  }, [query, tokens, zoneFilter]);

  if (!isOpen) return null;

  const selectedSet = new Set(selectedTokenIds);
  const allVisibleSelected =
    visibleTokens.length > 0 && visibleTokens.every((token) => selectedSet.has(token.id));
  const allTokensSelected = tokens.length > 0 && tokens.every((token) => selectedSet.has(token.id));
  const enabledCount = Object.values(enabled).filter(Boolean).length;

  const toggleField = (field: BulkField) => {
    setEnabled((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleToken = (tokenId: string) => {
    onSelectionChange(
      selectedSet.has(tokenId)
        ? selectedTokenIds.filter((id) => id !== tokenId)
        : [...selectedTokenIds, tokenId]
    );
  };

  const toggleVisible = () => {
    const visibleIds = new Set(visibleTokens.map((token) => token.id));
    if (allVisibleSelected) {
      onSelectionChange(selectedTokenIds.filter((id) => !visibleIds.has(id)));
    } else {
      onSelectionChange(Array.from(new Set([...selectedTokenIds, ...visibleIds])));
    }
  };

  const toggleAll = () => {
    onSelectionChange(allTokensSelected ? [] : tokens.map((token) => token.id));
  };

  const applyChanges = () => {
    if (selectedTokenIds.length === 0 || enabledCount === 0) return;
    const patch: Partial<MagnetToken> = {};
    if (enabled.size) patch.sizePx = sizePx;
    if (enabled.color) {
      patch.color = color;
      patch.textColor = textColor;
    }
    if (enabled.font) patch.fontStyle = fontStyle;
    if (enabled.shape) patch.shape = shape;
    if (enabled.status) patch.status = status;
    onApplyBulk(selectedTokenIds, patch);
  };

  const fieldClass = (field: BulkField) =>
    `rounded-xl border p-3 transition-colors ${
      enabled[field] ? 'border-blue-300 bg-blue-50/60' : 'border-stone-200 bg-stone-50/60'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/55 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl h-[min(780px,92vh)] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-stone-200 bg-stone-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ListChecks className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-stone-900">모형 관리</h2>
              <p className="text-xs text-stone-500 truncate">
                목록에서 모형을 고른 뒤 체크한 속성만 한 번에 변경합니다.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-stone-200 text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(340px,0.9fr)_minmax(460px,1.1fr)]">
          <section className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-200">
            <div className="p-4 space-y-3 border-b border-stone-100">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-sm text-stone-800">생성된 모형</span>
                  <span className="ml-2 text-xs text-stone-500">{tokens.length}개 중 {selectedTokenIds.length}개 선택</span>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={onAdd} className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1"><Plus className="w-3.5 h-3.5" />추가</button>
                  <button type="button" disabled={!selectedTokenIds.length} onClick={() => onDelete(selectedTokenIds)} className="px-2.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 rounded-lg border border-rose-200 flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" />삭제</button>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_150px] gap-2">
                <label className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="이름, 보조 문구, 연락처 검색"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
                <select
                  value={zoneFilter}
                  onChange={(event) => setZoneFilter(event.target.value)}
                  className="px-2 py-2 text-xs rounded-lg border border-stone-300 bg-white"
                >
                  <option value="all">전체 구역</option>
                  <option value="free">자유 배치</option>
                  {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.title}</option>)}
                </select>
              </div>
            </div>

            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={toggleAll}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left font-bold text-xs transition-colors ${allTokensSelected ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'}`}
              >
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${allTokensSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-stone-300 bg-white'}`}>
                  {allTokensSelected && <Check className="w-3.5 h-3.5" />}
                </span>
                전체 모형 선택
                <span className="ml-auto text-[11px] font-medium text-stone-500">{tokens.length}개</span>
              </button>
              {(query || zoneFilter !== 'all') && (
                <button type="button" onClick={toggleVisible} className="mt-1.5 w-full text-[11px] font-bold text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg">
                  {allVisibleSelected ? '검색 결과 선택 해제' : `검색 결과 ${visibleTokens.length}개 선택`}
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
              {visibleTokens.map((token) => {
                const checked = selectedSet.has(token.id);
                return (
                  <div
                    key={token.id}
                    onClick={() => toggleToken(token.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${
                      checked ? 'border-blue-300 bg-blue-50' : 'border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-stone-300 bg-white'}`}>
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span style={{ backgroundColor: token.color }} className="w-9 h-9 rounded-full border-2 border-white shadow ring-1 ring-stone-200 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(token); }} className="group flex items-center gap-1.5 max-w-full text-sm font-bold text-stone-800 hover:text-blue-700" title="모형 속성 수정">
                        <span className="truncate">{token.title}</span><Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                      </button>
                      <span className="block text-[11px] text-stone-500 truncate">
                        {token.subtitle || '보조 문구 없음'} · {token.zoneId ? zoneNameMap.get(token.zoneId) || '알 수 없는 구역' : '자유 배치'}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono text-stone-400">{token.sizePx || token.size.toUpperCase()}</span>
                  </div>
                );
              })}
              {visibleTokens.length === 0 && (
                <div className="py-14 text-center text-sm text-stone-400">조건에 맞는 모형이 없습니다.</div>
              )}
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-5">
            <div className="mb-4">
              <h3 className="font-bold text-stone-900">일괄 변경 속성</h3>
              <p className="text-xs text-stone-500 mt-1">왼쪽 체크박스를 켠 속성만 선택된 모형에 적용됩니다.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={fieldClass('size')}>
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 mb-3 cursor-pointer">
                  <input type="checkbox" checked={enabled.size} onChange={() => toggleField('size')} className="accent-blue-600" />
                  크기 적용 <span className="ml-auto font-mono text-blue-700">{sizePx}px</span>
                </label>
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {Object.entries(SIZE_PRESET_PX).map(([name, px]) => (
                    <button key={name} type="button" onClick={() => { setEnabled((prev) => ({ ...prev, size: true })); setSizePx(px); }} className={`py-1.5 rounded-lg text-[11px] font-bold border ${sizePx === px ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-stone-200 text-stone-600'}`}>{name.toUpperCase()}</button>
                  ))}
                </div>
                <input type="range" min={MIN_TOKEN_PX} max={MAX_TOKEN_PX} step={2} value={sizePx} onChange={(event) => { setEnabled((prev) => ({ ...prev, size: true })); setSizePx(Number(event.target.value)); }} className="w-full accent-blue-600" />
              </div>

              <div className={fieldClass('color')}>
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 mb-3 cursor-pointer">
                  <input type="checkbox" checked={enabled.color} onChange={() => toggleField('color')} className="accent-blue-600" />
                  색상 적용
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {COLORS.map((item) => (
                    <button key={item.hex} type="button" title={item.hex} style={{ backgroundColor: item.hex }} onClick={() => { setEnabled((prev) => ({ ...prev, color: true })); setColor(item.hex); setTextColor(item.text); }} className={`aspect-square rounded-lg border shadow-sm ${color === item.hex ? 'ring-2 ring-blue-600 ring-offset-1' : 'border-stone-300'}`} />
                  ))}
                </div>
              </div>

              <div className={fieldClass('font')}>
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 mb-3 cursor-pointer">
                  <input type="checkbox" checked={enabled.font} onChange={() => toggleField('font')} className="accent-blue-600" />
                  폰트 적용
                </label>
                <select value={fontStyle} onChange={(event) => { setEnabled((prev) => ({ ...prev, font: true })); setFontStyle(event.target.value as MagnetFontStyle); }} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white">
                  <option value="handwriting">손글씨 마커</option>
                  <option value="dodum">돋움체</option>
                  <option value="sans">고딕체</option>
                </select>
              </div>

              <div className={fieldClass('shape')}>
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 mb-3 cursor-pointer">
                  <input type="checkbox" checked={enabled.shape} onChange={() => toggleField('shape')} className="accent-blue-600" />
                  형태 적용
                </label>
                <select value={shape} onChange={(event) => { setEnabled((prev) => ({ ...prev, shape: true })); setShape(event.target.value as MagnetShape); }} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white">
                  <option value="circle">원형</option><option value="rounded-rect">라운드 사각</option><option value="pill">타원형</option><option value="hexagon">육각형</option><option value="square">정사각형</option>
                </select>
              </div>

              <div className={fieldClass('status')}>
                <label className="flex items-center gap-2 text-xs font-bold text-stone-800 mb-3 cursor-pointer">
                  <input type="checkbox" checked={enabled.status} onChange={() => toggleField('status')} className="accent-blue-600" />
                  상태 적용
                </label>
                <select value={status} onChange={(event) => { setEnabled((prev) => ({ ...prev, status: true })); setStatus(event.target.value as MagnetStatus); }} className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white">
                  <option value="active">작업중</option><option value="assigned">배정 완료</option><option value="waiting">현장 대기</option><option value="break">휴식 중</option><option value="done">작업 완료</option>
                </select>
              </div>
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 px-5 py-3 border-t border-stone-200 bg-stone-50">
          <span className="text-xs text-stone-500">보드의 Ctrl+클릭·드래그 선택과 이 목록의 선택이 함께 유지됩니다.</span>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200 rounded-lg">닫기</button>
            <button
              type="button"
              onClick={applyChanges}
              disabled={selectedTokenIds.length === 0 || enabledCount === 0}
              className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-stone-300 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              {selectedTokenIds.length}개 모형에 적용
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
