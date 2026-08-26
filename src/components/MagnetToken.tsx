import React, { useState, useRef, useEffect } from 'react';
import { MagnetToken, MagnetStatus, SiteSettings } from '../types';
import { getTokenSizePx, getTokenWidthPx } from '../utils/layout';
import { Edit2, Trash2, Calendar, Phone } from 'lucide-react';

interface MagnetTokenProps {
  token: MagnetToken;
  /** 드래그 중 실시간 미리보기 좌표 / 크기 (없으면 저장된 값 사용) */
  previewX?: number;
  previewY?: number;
  previewSizePx?: number;
  isSelected: boolean;
  isDragging: boolean;
  isResizing: boolean;
  isFocused: boolean;
  /** 검색어와 일치하는 모형 */
  isSearchMatch: boolean;
  /** 검색 중이지만 일치하지 않는 모형 */
  isSearchDimmed: boolean;
  searchHighlight: SiteSettings['searchHighlight'];
  showStatusDot: boolean;
  showSubtitle: boolean;
  onPointerDown: (e: React.PointerEvent, token: MagnetToken) => void;
  onResizePointerDown: (e: React.PointerEvent, token: MagnetToken) => void;
  onEdit: (token: MagnetToken) => void;
  onDelete: (tokenId: string) => void;
  onViewSchedule: (token: MagnetToken) => void;
  onQuickStatusChange: (tokenId: string, status: MagnetStatus) => void;
}

const STATUS_COLORS: Record<MagnetStatus, { bg: string; label: string }> = {
  active: { bg: '#22c55e', label: '작업중' },
  assigned: { bg: '#3b82f6', label: '배정됨' },
  waiting: { bg: '#f59e0b', label: '현장대기' },
  break: { bg: '#a855f7', label: '휴식' },
  done: { bg: '#64748b', label: '완료' }
};

export const MagnetTokenComponent: React.FC<MagnetTokenProps> = ({
  token,
  previewX,
  previewY,
  previewSizePx,
  isSelected,
  isDragging,
  isResizing,
  isFocused,
  isSearchMatch,
  isSearchDimmed,
  searchHighlight,
  showStatusDot,
  showSubtitle,
  onPointerDown,
  onResizePointerDown,
  onEdit,
  onDelete,
  onViewSchedule,
  onQuickStatusChange
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 바깥을 누르거나 ESC 를 누르면 닫기
  useEffect(() => {
    if (!showMenu) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [showMenu]);

  const sizePx = previewSizePx ?? getTokenSizePx(token);
  const widthPx = previewSizePx
    ? getTokenWidthPx({ ...token, sizePx: previewSizePx, widthPx: undefined })
    : getTokenWidthPx(token);

  // 크기에 맞춰 글자 크기를 자동 조절
  const titleClass =
    sizePx < 54 ? 'text-xs' : sizePx < 70 ? 'text-sm' : sizePx < 88 ? 'text-base' : 'text-lg';
  const subtitleClass = sizePx < 60 ? 'text-[8px]' : sizePx < 80 ? 'text-[10px]' : 'text-[11px]';

  const currentStatus = STATUS_COLORS[token.status] || STATUS_COLORS.assigned;

  const getShapeStyle = () => {
    switch (token.shape) {
      case 'rounded-rect':
        return 'rounded-2xl px-2';
      case 'hexagon':
        return 'rounded-xl [clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]';
      case 'pill':
        return 'rounded-full px-3';
      case 'square':
        return 'rounded-xl';
      case 'circle':
      default:
        return 'rounded-full';
    }
  };

  const getFontFamilyClass = () => {
    switch (token.fontStyle) {
      case 'handwriting':
        return 'font-handwriting tracking-wide';
      case 'dodum':
        return 'font-dodum tracking-tight';
      default:
        return 'font-sans font-bold';
    }
  };

  const searchClass = isSearchMatch
    ? searchHighlight === 'bounce'
      ? 'search-hit-bounce'
      : searchHighlight === 'glow'
      ? 'search-hit-glow'
      : 'search-hit-pulse'
    : '';

  const showHandles = isSelected || isFocused;

  return (
    <div
      id={`magnet-${token.id}`}
      style={{
        left: `${previewX ?? token.x}%`,
        top: `${previewY ?? token.y}%`,
        transform: `translate(-50%, -50%) scale(${isDragging ? 1.1 : 1})`,
        zIndex: isDragging || isResizing ? 50 : isSearchMatch ? 46 : isFocused ? 45 : isSelected ? 40 : 20,
        opacity: isSearchDimmed ? 0.4 : 1,
        touchAction: 'none'
      }}
      className={`absolute select-none cursor-grab active:cursor-grabbing group ${
        isDragging || isResizing ? '' : 'transition-all duration-100'
      }`}
      onPointerDown={(e) => onPointerDown(e, token)}
      onClick={(e) => {
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onEdit(token);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu((prev) => !prev);
      }}
    >
      {/* 자석 본체 */}
      <div
        style={{
          width: `${widthPx}px`,
          height: `${sizePx}px`,
          backgroundColor: token.color,
          color: token.textColor || '#1c1917',
          borderColor: token.borderColor || 'rgba(0, 0, 0, 0.12)'
        }}
        className={`relative flex flex-col items-center justify-center border-2 border-stone-300/60 shadow-md ${
          isDragging ? 'magnet-shadow-active' : 'magnet-shadow'
        } ${getShapeStyle()} ${searchClass} overflow-hidden`}
      >
        {/* 광택 */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-black/10 pointer-events-none" />
        <div className="absolute top-1.5 w-1/3 h-1 bg-white/60 rounded-full blur-[0.5px] pointer-events-none" />

        {/* 상태 표시점 */}
        {showStatusDot && (
          <div
            title={`상태: ${currentStatus.label}`}
            style={{ backgroundColor: currentStatus.bg }}
            className="absolute top-1 right-1.5 w-2.5 h-2.5 rounded-full border border-white/90 shadow-xs z-10"
          />
        )}

        {/* 이름 / 부제목 */}
        <div className="relative z-10 flex flex-col items-center text-center px-1 max-w-full">
          <span
            style={{ maxWidth: `${widthPx - 8}px` }}
            className={`${titleClass} ${getFontFamilyClass()} font-bold leading-tight drop-shadow-[0_0.5px_0.5px_rgba(255,255,255,0.8)] truncate`}
          >
            {token.title}
          </span>
          {showSubtitle && token.subtitle && sizePx >= 52 && (
            <span
              style={{ maxWidth: `${widthPx - 10}px` }}
              className={`${subtitleClass} font-medium opacity-80 leading-none mt-0.5 truncate`}
            >
              {token.subtitle}
            </span>
          )}
        </div>
      </div>

      {/* 포커스(위치 확인) 강조 링 */}
      {isFocused && (
        <div className="absolute -inset-2 rounded-full border-4 border-amber-400 ring-4 ring-amber-300/50 animate-pulse pointer-events-none" />
      )}

      {/* 선택 링 */}
      {isSelected && !isFocused && (
        <div className="absolute -inset-1.5 rounded-full border-2 border-blue-500 ring-2 ring-blue-300/60 pointer-events-none" />
      )}

      {/* 크기 조절 손잡이 (선택했거나 마우스를 올렸을 때) */}
      <div
        onPointerDown={(e) => onResizePointerDown(e, token)}
        style={{ cursor: 'nwse-resize' }}
        className={`absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-md z-40 touch-none transition-opacity ${
          showHandles || isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        title="드래그하여 모형 크기 조절"
      />

      {/* 크기 조절 중 실시간 수치 */}
      {isResizing && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-stone-900 text-white text-[10px] font-mono shadow-lg whitespace-nowrap pointer-events-none">
          {Math.round(sizePx)}px
        </div>
      )}

      {/* 호버 퀵 액션 */}
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-stone-900/85 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[11px] shadow-lg pointer-events-auto z-30 whitespace-nowrap">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(token);
          }}
          className="hover:text-amber-300 p-0.5 transition-colors"
          title="속성 수정"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <span className="text-stone-500">|</span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onViewSchedule(token);
          }}
          className="hover:text-blue-300 p-0.5 transition-colors"
          title="일정 및 이력"
        >
          <Calendar className="w-3 h-3" />
        </button>
        <span className="text-stone-500">|</span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(token.id);
          }}
          className="hover:text-rose-400 p-0.5 transition-colors"
          title="삭제 (Ctrl+Z 로 되돌리기 가능)"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* 우클릭 메뉴 */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-stone-200 p-2 z-50 text-stone-800 animate-in fade-in zoom-in-95 duration-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold px-2 py-1 border-b border-stone-100 flex items-center justify-between gap-2">
            <span className="truncate whitespace-nowrap">{token.title} 모형 메뉴</span>
            <button
              type="button"
              onClick={() => setShowMenu(false)}
              className="text-stone-400 hover:text-stone-600 text-xs shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onEdit(token);
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-stone-100 flex items-center gap-2 whitespace-nowrap"
            >
              <Edit2 className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              <span>모형 속성 편집</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                onViewSchedule(token);
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-stone-100 flex items-center gap-2 whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>배정 일정 &amp; 작업 이력</span>
            </button>

            {token.phone && (
              <a
                href={`tel:${token.phone}`}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-stone-100 flex items-center gap-2 text-stone-700 whitespace-nowrap"
              >
                <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <span>전화 걸기 ({token.phone})</span>
              </a>
            )}

            <div className="pt-1 border-t border-stone-100">
              <div className="text-[10px] text-stone-400 px-2 py-0.5">상태 빠른 변경</div>
              <div className="grid grid-cols-2 gap-1 px-1 pt-1">
                {(
                  [
                    ['active', '작업중', 'bg-green-50 text-green-700 hover:bg-green-100', '#22c55e'],
                    ['waiting', '대기', 'bg-amber-50 text-amber-700 hover:bg-amber-100', '#f59e0b'],
                    ['assigned', '배정', 'bg-blue-50 text-blue-700 hover:bg-blue-100', '#3b82f6'],
                    ['done', '완료', 'bg-stone-100 text-stone-700 hover:bg-stone-200', '#64748b']
                  ] as const
                ).map(([status, label, cls, dot]) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      onQuickStatusChange(token.id, status as MagnetStatus);
                      setShowMenu(false);
                    }}
                    className={`px-1.5 py-1 text-[11px] rounded flex items-center gap-1 whitespace-nowrap ${cls}`}
                  >
                    <span
                      style={{ backgroundColor: dot }}
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  onDelete(token.id);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>모형 삭제 (Ctrl+Z 되돌리기)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
