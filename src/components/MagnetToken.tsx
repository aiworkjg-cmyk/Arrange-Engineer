import React, { useState, useRef } from 'react';
import { MagnetToken, MagnetStatus } from '../types';
import { Edit2, Trash2, Calendar, Phone, MoreHorizontal, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface MagnetTokenProps {
  token: MagnetToken;
  isSelected: boolean;
  isDragging: boolean;
  scale: number;
  onPointerDown: (e: React.PointerEvent, token: MagnetToken) => void;
  onClick: (token: MagnetToken) => void;
  onEdit: (token: MagnetToken) => void;
  onDelete: (tokenId: string) => void;
  onViewSchedule: (token: MagnetToken) => void;
  onQuickStatusChange: (tokenId: string, status: MagnetStatus) => void;
}

export const MagnetTokenComponent: React.FC<MagnetTokenProps> = ({
  token,
  isSelected,
  isDragging,
  scale,
  onPointerDown,
  onClick,
  onEdit,
  onDelete,
  onViewSchedule,
  onQuickStatusChange
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Size mapping (in pixels)
  const sizeDimensions: Record<string, { size: number; textClass: string; subTextClass: string }> = {
    sm: { size: 50, textClass: 'text-sm font-bold', subTextClass: 'text-[9px]' },
    md: { size: 66, textClass: 'text-base font-bold', subTextClass: 'text-[10px]' },
    lg: { size: 82, textClass: 'text-lg font-extrabold', subTextClass: 'text-xs' },
    xl: { size: 98, textClass: 'text-xl font-black', subTextClass: 'text-xs' }
  };

  const dim = sizeDimensions[token.size] || sizeDimensions.md;

  // Status color dot
  const statusColors: Record<MagnetStatus, { bg: string; border: string; label: string }> = {
    active: { bg: '#22c55e', border: '#16a34a', label: '작업중' },
    assigned: { bg: '#3b82f6', border: '#2563eb', label: '배정됨' },
    waiting: { bg: '#f59e0b', border: '#d97706', label: '현장대기' },
    break: { bg: '#a855f7', border: '#9333ea', label: '휴식' },
    done: { bg: '#64748b', border: '#475569', label: '완료' }
  };

  const currentStatus = statusColors[token.status] || statusColors.assigned;

  // Shape class generator
  const getShapeStyle = () => {
    switch (token.shape) {
      case 'circle':
        return 'rounded-full';
      case 'rounded-rect':
        return 'rounded-2xl aspect-[1.3/1] px-2';
      case 'hexagon':
        return 'rounded-xl aspect-square [clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]';
      case 'pill':
        return 'rounded-full aspect-[1.5/1] px-3';
      case 'square':
        return 'rounded-xl aspect-square';
      default:
        return 'rounded-full';
    }
  };

  const getFontFamilyClass = () => {
    switch (token.fontStyle) {
      case 'handwriting':
        return 'font-handwriting tracking-wide text-stone-900';
      case 'dodum':
        return 'font-dodum tracking-tight text-stone-900';
      default:
        return 'font-sans font-bold text-stone-900';
    }
  };

  return (
    <div
      id={`magnet-${token.id}`}
      style={{
        left: `${token.x}%`,
        top: `${token.y}%`,
        transform: `translate(-50%, -50%) scale(${isDragging ? 1.12 : 1})`,
        zIndex: isDragging ? 50 : isSelected ? 40 : 20,
        touchAction: 'none'
      }}
      className={`absolute select-none cursor-grab active:cursor-grabbing transition-transform duration-75 group ${
        isDragging ? 'opacity-90' : ''
      }`}
      onPointerDown={(e) => onPointerDown(e, token)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(token);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(prev => !prev);
      }}
    >
      {/* 3D Magnet Body with realistic specular reflection */}
      <div
        style={{
          width: token.shape === 'rounded-rect' || token.shape === 'pill' ? `${dim.size * 1.3}px` : `${dim.size}px`,
          height: `${dim.size}px`,
          backgroundColor: token.color,
          color: token.textColor || '#1c1917',
          borderColor: token.borderColor || 'rgba(0, 0, 0, 0.12)'
        }}
        className={`relative flex flex-col items-center justify-center border-2 border-stone-300/60 shadow-md ${
          isDragging ? 'magnet-shadow-active' : 'magnet-shadow'
        } ${getShapeStyle()} transition-all overflow-hidden`}
      >
        {/* Subtle glossy top-light gradient reflection */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-transparent to-black/10 pointer-events-none" />

        {/* Small top pin highlight */}
        <div className="absolute top-1.5 w-1/3 h-1 bg-white/60 rounded-full blur-[0.5px] pointer-events-none" />

        {/* Status indicator dot */}
        <div
          title={`상태: ${currentStatus.label}`}
          style={{ backgroundColor: currentStatus.bg }}
          className="absolute top-1 right-1.5 w-2.5 h-2.5 rounded-full border border-white/90 shadow-xs z-10"
        />

        {/* Main Content (Title / Name) */}
        <div className="relative z-10 flex flex-col items-center text-center px-1 max-w-full">
          <span
            className={`${dim.textClass} ${getFontFamilyClass()} leading-tight drop-shadow-[0_0.5px_0.5px_rgba(255,255,255,0.8)] truncate max-w-[85px]`}
          >
            {token.title}
          </span>
          {token.subtitle && (
            <span className={`${dim.subTextClass} font-medium text-stone-700/90 leading-none mt-0.5 truncate max-w-[80px]`}>
              {token.subtitle}
            </span>
          )}
        </div>

        {/* Selection Ring */}
        {isSelected && (
          <div className={`absolute -inset-1 border-2 border-blue-500 ring-2 ring-blue-300/60 ${getShapeStyle()} animate-pulse pointer-events-none`} />
        )}
      </div>

      {/* Quick Hover Action Trigger (Visible on hover on desktop or touch tap) */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-stone-900/85 backdrop-blur-xs text-white px-2 py-0.5 rounded-full text-[11px] shadow-lg pointer-events-auto z-30 whitespace-nowrap">
        <button
          type="button"
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
          onClick={(e) => {
            e.stopPropagation();
            onDelete(token.id);
          }}
          className="hover:text-rose-400 p-0.5 transition-colors"
          title="삭제"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Popover Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-stone-200 p-2 z-50 text-stone-800 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold px-2 py-1 border-b border-stone-100 flex items-center justify-between">
            <span className="truncate">{token.title} 모형 메뉴</span>
            <button
              onClick={() => setShowMenu(false)}
              className="text-stone-400 hover:text-stone-600 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit(token);
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-stone-100 flex items-center gap-2"
            >
              <Edit2 className="w-3.5 h-3.5 text-stone-500" />
              <span>모형 속성 편집 (색상/형태/크기)</span>
            </button>

            <button
              onClick={() => {
                setShowMenu(false);
                onViewSchedule(token);
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-stone-100 flex items-center gap-2"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>배정 일정 & 작업 이력</span>
            </button>

            {token.phone && (
              <a
                href={`tel:${token.phone}`}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-stone-100 flex items-center gap-2 text-stone-700"
              >
                <Phone className="w-3.5 h-3.5 text-green-600" />
                <span>전화 걸기 ({token.phone})</span>
              </a>
            )}

            <div className="pt-1 border-t border-stone-100">
              <div className="text-[10px] text-stone-400 px-2 py-0.5">상태 빠른 변경</div>
              <div className="grid grid-cols-2 gap-1 px-1 pt-1">
                <button
                  onClick={() => {
                    onQuickStatusChange(token.id, 'active');
                    setShowMenu(false);
                  }}
                  className="px-1.5 py-1 text-[11px] bg-green-50 text-green-700 rounded hover:bg-green-100 flex items-center gap-1"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  작업중
                </button>
                <button
                  onClick={() => {
                    onQuickStatusChange(token.id, 'waiting');
                    setShowMenu(false);
                  }}
                  className="px-1.5 py-1 text-[11px] bg-amber-50 text-amber-700 rounded hover:bg-amber-100 flex items-center gap-1"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  대기
                </button>
                <button
                  onClick={() => {
                    onQuickStatusChange(token.id, 'assigned');
                    setShowMenu(false);
                  }}
                  className="px-1.5 py-1 text-[11px] bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-1"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  배정
                </button>
                <button
                  onClick={() => {
                    onQuickStatusChange(token.id, 'done');
                    setShowMenu(false);
                  }}
                  className="px-1.5 py-1 text-[11px] bg-stone-100 text-stone-700 rounded hover:bg-stone-200 flex items-center gap-1"
                >
                  <span className="w-2 h-2 rounded-full bg-stone-500 inline-block" />
                  완료
                </button>
              </div>
            </div>

            <div className="pt-1 border-t border-stone-100">
              <button
                onClick={() => {
                  setShowMenu(false);
                  onDelete(token.id);
                }}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>모형 삭제</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
