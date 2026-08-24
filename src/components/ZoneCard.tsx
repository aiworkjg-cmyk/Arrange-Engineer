import React from 'react';
import { BoardZone, MagnetToken } from '../types';
import { LayoutGrid, Edit, Trash2, Users, Move } from 'lucide-react';

export type ZoneResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

interface ZoneCardProps {
  zone: BoardZone;
  tokensInZone: MagnetToken[];
  isActive: boolean;
  showCapacity: boolean;
  showSubtitle: boolean;
  onEditZone: (zone: BoardZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onAutoArrangeZone: (zoneId: string) => void;
  onZonePointerDown: (e: React.PointerEvent, zone: BoardZone, handle: ZoneResizeHandle | 'move') => void;
}

/** 크기조절 손잡이 정의 (위치 클래스 / 커서 모양) */
const RESIZE_HANDLES: { id: ZoneResizeHandle; className: string; cursor: string }[] = [
  { id: 'nw', className: 'left-0 top-0 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
  { id: 'ne', className: 'right-0 top-0 w-3.5 h-3.5 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
  { id: 'sw', className: 'left-0 bottom-0 w-3.5 h-3.5 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
  { id: 'se', className: 'right-0 bottom-0 w-3.5 h-3.5 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
  { id: 'n', className: 'left-3.5 right-3.5 top-0 h-1.5 -translate-y-1/2', cursor: 'ns-resize' },
  { id: 's', className: 'left-3.5 right-3.5 bottom-0 h-1.5 translate-y-1/2', cursor: 'ns-resize' },
  { id: 'w', className: 'top-3.5 bottom-3.5 left-0 w-1.5 -translate-x-1/2', cursor: 'ew-resize' },
  { id: 'e', className: 'top-3.5 bottom-3.5 right-0 w-1.5 translate-x-1/2', cursor: 'ew-resize' }
];

export const ZoneCardComponent: React.FC<ZoneCardProps> = ({
  zone,
  tokensInZone,
  isActive,
  showCapacity,
  showSubtitle,
  onEditZone,
  onDeleteZone,
  onAutoArrangeZone,
  onZonePointerDown
}) => {
  const isOverCapacity = !!zone.maxCapacity && tokensInZone.length > zone.maxCapacity;

  // 헤더 버튼에서 시작된 포인터 입력이 구역 이동으로 번지지 않도록 차단
  const stopPointer = (e: React.PointerEvent) => e.stopPropagation();

  return (
    <div
      id={`zone-${zone.id}`}
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        width: `${zone.width}%`,
        height: `${zone.height}%`,
        backgroundColor: zone.bgColor || 'rgba(255, 255, 255, 0.6)',
        borderColor: zone.borderColor || '#cbd5e1'
      }}
      className={`absolute rounded-2xl border-2 border-dashed pointer-events-none group/zone shadow-xs backdrop-blur-[1px] ${
        isActive ? 'ring-2 ring-blue-500/70 shadow-lg z-10' : 'transition-all'
      }`}
    >
      {/* 구역 헤더 (= 구역 이동 손잡이) */}
      <div
        style={{ borderBottomColor: zone.borderColor || '#cbd5e1' }}
        className="pointer-events-auto flex items-center justify-between gap-2 px-3 py-1.5 bg-white/80 border-b backdrop-blur-xs select-none cursor-move rounded-t-xl touch-none"
        onPointerDown={(e) => onZonePointerDown(e, zone, 'move')}
        title="드래그하여 구역 위치 이동 / 구역명 더블클릭 시 수정창 열기"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Move className="w-3 h-3 text-stone-400 shrink-0" />

          {zone.code && (
            <span
              style={{ backgroundColor: zone.headerColor || '#3b82f6' }}
              className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap shrink-0"
            >
              {zone.code}
            </span>
          )}

          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEditZone(zone);
            }}
            className="font-bold text-xs sm:text-sm text-stone-800 truncate whitespace-nowrap cursor-text hover:text-blue-700 hover:underline decoration-dotted"
            title="더블클릭하여 구역명 수정"
          >
            {zone.title}
          </span>

          {showCapacity && (
            <span
              className={`flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                isOverCapacity ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'
              }`}
            >
              <Users className="w-3 h-3 shrink-0" />
              <span>{tokensInZone.length}명</span>
              {zone.maxCapacity && <span className="opacity-70">/{zone.maxCapacity}</span>}
            </span>
          )}
        </div>

        {/* 구역 컨트롤 */}
        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover/zone:opacity-100 transition-opacity">
          <button
            type="button"
            onPointerDown={stopPointer}
            onClick={(e) => {
              e.stopPropagation();
              onAutoArrangeZone(zone.id);
            }}
            className="p-1 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="구역 내 모형 바둑판 자동 정렬"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={stopPointer}
            onClick={(e) => {
              e.stopPropagation();
              onEditZone(zone);
            }}
            className="p-1 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
            title="구역 설정 수정 (이름/위치/크기)"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={stopPointer}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteZone(zone.id);
            }}
            className="p-1 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            title="구역 삭제 (Ctrl+Z 로 되돌리기 가능)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 부제목 */}
      {showSubtitle && zone.subtitle && (
        <div className="px-3 py-1 text-[10px] text-stone-500 font-medium italic border-b border-stone-200/40 bg-white/30 truncate whitespace-nowrap pointer-events-none">
          {zone.subtitle}
        </div>
      )}

      {/* 크기조절 손잡이 */}
      {RESIZE_HANDLES.map((handle) => (
        <div
          key={handle.id}
          onPointerDown={(e) => onZonePointerDown(e, zone, handle.id)}
          style={{ cursor: handle.cursor }}
          className={`absolute pointer-events-auto touch-none z-20 ${handle.className} ${
            handle.id.length === 2
              ? 'rounded-full bg-white border-2 border-blue-500 shadow-xs opacity-0 group-hover/zone:opacity-100 transition-opacity'
              : 'hover:bg-blue-500/40 rounded-full'
          } ${isActive ? 'opacity-100' : ''}`}
          title="드래그하여 구역 크기 조절"
        />
      ))}

      {/* 크기/위치 실시간 표시 (드래그 중) */}
      {isActive && (
        <div className="absolute -top-6 left-0 px-2 py-0.5 rounded-md bg-stone-900 text-white text-[10px] font-mono shadow-lg whitespace-nowrap pointer-events-none">
          x {zone.x}% · y {zone.y}% · {zone.width}% × {zone.height}%
        </div>
      )}

      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-stone-300 pointer-events-none select-none truncate max-w-[70%] whitespace-nowrap">
        {zone.title}
      </div>
    </div>
  );
};
