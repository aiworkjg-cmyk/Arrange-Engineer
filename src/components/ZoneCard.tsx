import React from 'react';
import { BoardZone, MagnetToken } from '../types';
import { LayoutGrid, MoreVertical, Edit, Trash2, Users } from 'lucide-react';

interface ZoneCardProps {
  zone: BoardZone;
  tokensInZone: MagnetToken[];
  onEditZone: (zone: BoardZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onAutoArrangeZone: (zoneId: string) => void;
}

export const ZoneCardComponent: React.FC<ZoneCardProps> = ({
  zone,
  tokensInZone,
  onEditZone,
  onDeleteZone,
  onAutoArrangeZone
}) => {
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
      className="absolute rounded-2xl border-2 border-dashed transition-all pointer-events-none group/zone shadow-xs overflow-hidden backdrop-blur-[1px]"
    >
      {/* Zone Header Bar (Pointer events enabled for header controls) */}
      <div
        style={{ borderBottomColor: zone.borderColor || '#cbd5e1' }}
        className="pointer-events-auto flex items-center justify-between px-3 py-1.5 bg-white/80 border-b backdrop-blur-xs select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          {zone.code && (
            <span
              style={{ backgroundColor: zone.headerColor || '#3b82f6' }}
              className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-xs"
            >
              {zone.code}
            </span>
          )}
          <span className="font-bold text-xs sm:text-sm text-stone-800 truncate">
            {zone.title}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full">
            <Users className="w-3 h-3 text-stone-600" />
            <span>{tokensInZone.length}명</span>
            {zone.maxCapacity && (
              <span className="text-stone-400">/{zone.maxCapacity}</span>
            )}
          </span>
        </div>

        {/* Zone Controls */}
        <div className="flex items-center gap-1 opacity-80 group-hover/zone:opacity-100 transition-opacity">
          <button
            type="button"
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
            onClick={(e) => {
              e.stopPropagation();
              onEditZone(zone);
            }}
            className="p-1 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
            title="구역 설정 수정"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`'${zone.title}' 구역을 삭제하시겠습니까?`)) {
                onDeleteZone(zone.id);
              }
            }}
            className="p-1 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            title="구역 삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Subtitle / Description Note */}
      {zone.subtitle && (
        <div className="px-3 py-1 text-[10px] text-stone-500 font-medium italic border-b border-stone-200/40 bg-white/30">
          {zone.subtitle}
        </div>
      )}

      {/* Subtle bottom-right watermark */}
      <div className="absolute bottom-2 right-2 text-[10px] font-mono text-stone-300 pointer-events-none select-none">
        {zone.title}
      </div>
    </div>
  );
};
