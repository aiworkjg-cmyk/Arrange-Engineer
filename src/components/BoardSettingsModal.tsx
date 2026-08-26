import React, { useEffect, useState } from 'react';
import { SiteSettings } from '../types';
import { useEscapeClose } from '../hooks/useEscapeClose';
import {
  DEFAULT_BOARD_WIDTH,
  DEFAULT_BOARD_HEIGHT,
  MIN_BOARD_SIZE,
  MAX_BOARD_SIZE
} from '../utils/layout';
import { LayoutTemplate, X, Check, RotateCcw, Maximize2 } from 'lucide-react';

interface BoardSettingsModalProps {
  isOpen: boolean;
  settings: SiteSettings;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<SiteSettings>) => void;
}

/** 자주 쓰는 배경판 비율 */
const RATIO_PRESETS: { label: string; width: number; height: number }[] = [
  { label: '16 : 10 (기본)', width: 1600, height: 1000 },
  { label: '16 : 9 (와이드)', width: 1600, height: 900 },
  { label: '4 : 3 (정방형에 가까움)', width: 1600, height: 1200 },
  { label: '1 : 1 (정사각)', width: 1400, height: 1400 },
  { label: '21 : 9 (초와이드)', width: 2100, height: 900 },
  { label: '세로형 (3 : 4)', width: 1200, height: 1600 }
];

const BACKGROUND_PRESETS: { label: string; value: string }[] = [
  { label: '화이트보드', value: '#f8fafc' },
  { label: '순백', value: '#ffffff' },
  { label: '아이보리', value: '#fdfaf3' },
  { label: '연회색', value: '#eef2f6' },
  { label: '연녹색', value: '#f1f8f2' },
  { label: '연하늘', value: '#eff6ff' }
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const BoardSettingsModal: React.FC<BoardSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings
}) => {
  const [width, setWidth] = useState(settings.boardWidth || DEFAULT_BOARD_WIDTH);
  const [height, setHeight] = useState(settings.boardHeight || DEFAULT_BOARD_HEIGHT);

  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setWidth(settings.boardWidth || DEFAULT_BOARD_WIDTH);
    setHeight(settings.boardHeight || DEFAULT_BOARD_HEIGHT);
  }, [isOpen, settings.boardWidth, settings.boardHeight]);

  if (!isOpen) return null;

  const applySize = (nextWidth: number, nextHeight: number) => {
    const w = Math.round(clamp(nextWidth, MIN_BOARD_SIZE, MAX_BOARD_SIZE));
    const h = Math.round(clamp(nextHeight, MIN_BOARD_SIZE, MAX_BOARD_SIZE));
    setWidth(w);
    setHeight(h);
    onUpdateSettings({ boardWidth: w, boardHeight: h });
  };

  const isActivePreset = (preset: { width: number; height: number }) =>
    preset.width === width && preset.height === height;

  const inputClass =
    'w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none';
  const labelClass = 'block text-xs font-semibold text-stone-700 mb-1 whitespace-nowrap';

  return (
    <div
      className="app-modal fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="app-modal-panel w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-stone-800 text-white flex items-center justify-center shrink-0">
              <LayoutTemplate className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-base whitespace-nowrap">배경판 설정</h3>
              <p className="text-xs text-stone-500 truncate whitespace-nowrap">
                현재 {width} × {height} · 비율 {(width / height).toFixed(2)} : 1
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
          {/* 비율 프리셋 */}
          <div>
            <label className={labelClass}>배경판 비율</label>
            <div className="grid grid-cols-2 gap-2">
              {RATIO_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applySize(preset.width, preset.height)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                    isActivePreset(preset)
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 직접 입력 */}
          <div>
            <label className={labelClass}>
              직접 지정 ({MIN_BOARD_SIZE} ~ {MAX_BOARD_SIZE})
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] text-stone-500 mb-1">가로</span>
                <input
                  type="number"
                  min={MIN_BOARD_SIZE}
                  max={MAX_BOARD_SIZE}
                  step={50}
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  onBlur={() => applySize(width, height)}
                  className={inputClass}
                />
              </div>
              <div>
                <span className="block text-[11px] text-stone-500 mb-1">세로</span>
                <input
                  type="number"
                  min={MIN_BOARD_SIZE}
                  max={MAX_BOARD_SIZE}
                  step={50}
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  onBlur={() => applySize(width, height)}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => applySize(width, height)}
              className="mt-2 w-full py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Maximize2 className="w-3.5 h-3.5 shrink-0" />
              <span>이 크기로 적용</span>
            </button>
            <p className="mt-1.5 text-[11px] text-stone-500">
              배경판이 커져도 모형·구역의 상대 위치는 그대로 유지되고, 화면에는 항상 전체가 보이도록
              자동으로 맞춰집니다.
            </p>
          </div>

          {/* 미리보기 */}
          <div>
            <label className={labelClass}>비율 미리보기</label>
            <div className="w-full h-28 rounded-xl border border-stone-200 bg-stone-100 flex items-center justify-center p-2">
              <div
                style={{
                  aspectRatio: `${width} / ${height}`,
                  backgroundColor: settings.boardBackground || '#f8fafc'
                }}
                className="h-full max-w-full border-2 border-stone-300 rounded shadow-inner"
              />
            </div>
          </div>

          {/* 배경색 */}
          <div>
            <label className={labelClass}>배경 색상</label>
            <div className="grid grid-cols-3 gap-2">
              {BACKGROUND_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onUpdateSettings({ boardBackground: preset.value })}
                  className={`py-2 px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    (settings.boardBackground || '#f8fafc') === preset.value
                      ? 'border-blue-600 ring-1 ring-blue-500 text-blue-700'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span
                    style={{ backgroundColor: preset.value }}
                    className="w-4 h-4 rounded border border-stone-300 shrink-0"
                  />
                  <span className="truncate">{preset.label}</span>
                  {(settings.boardBackground || '#f8fafc') === preset.value && (
                    <Check className="w-3 h-3 text-blue-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 격자 */}
          <button
            type="button"
            onClick={() => onUpdateSettings({ showGrid: !settings.showGrid })}
            className="w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-200 hover:bg-stone-50 transition-colors text-left"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-stone-800 whitespace-nowrap">격자 배경</div>
              <div className="text-[11px] text-stone-500 truncate">
                배경판에 모눈 무늬를 표시합니다
              </div>
            </div>
            <span
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                settings.showGrid ? 'bg-blue-600' : 'bg-stone-300'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  settings.showGrid ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </span>
          </button>

          {/* 보드 라벨 */}
          <div>
            <label className={labelClass}>배경판 좌측 상단 표시 문구</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => onUpdateSettings({ companyName: e.target.value })}
              placeholder="예: (주)유로테크"
              className={inputClass}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              applySize(DEFAULT_BOARD_WIDTH, DEFAULT_BOARD_HEIGHT);
              onUpdateSettings({ boardBackground: '#f8fafc', showGrid: true });
            }}
            className="w-full py-2 text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>기본값으로 되돌리기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
