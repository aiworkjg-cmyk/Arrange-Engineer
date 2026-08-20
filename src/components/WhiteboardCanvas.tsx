import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MagnetToken, BoardZone, MagnetStatus, UserAccount } from '../types';
import { MagnetTokenComponent } from './MagnetToken';
import { ZoneCardComponent } from './ZoneCard';
import { ZoomIn, ZoomOut, Maximize2, Grid, RotateCcw, Sparkles, Layers, Move, Plus } from 'lucide-react';

interface WhiteboardCanvasProps {
  tokens: MagnetToken[];
  zones: BoardZone[];
  activeUser: UserAccount;
  selectedTokenId: string | null;
  searchFilter: string;
  onUpdateTokenPosition: (tokenId: string, x: number, y: number, newZoneId?: string) => void;
  onSelectToken: (token: MagnetToken | null) => void;
  onEditToken: (token: MagnetToken) => void;
  onDeleteToken: (tokenId: string) => void;
  onViewSchedule: (token: MagnetToken) => void;
  onQuickStatusChange: (tokenId: string, status: MagnetStatus) => void;
  onEditZone: (zone: BoardZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onAutoArrangeZone: (zoneId: string) => void;
  onOpenRosterSheet: () => void;
  onAddNewMagnet: () => void;
}

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  tokens,
  zones,
  activeUser,
  selectedTokenId,
  searchFilter,
  onUpdateTokenPosition,
  onSelectToken,
  onEditToken,
  onDeleteToken,
  onViewSchedule,
  onQuickStatusChange,
  onEditZone,
  onDeleteZone,
  onAutoArrangeZone,
  onOpenRosterSheet,
  onAddNewMagnet
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState(false);

  // Dragging state for magnet tokens
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);
  const dragStartPos = useRef<{
    startX: number;
    startY: number;
    initialTokenX: number;
    initialTokenY: number;
    canvasRect: DOMRect | null;
  }>({
    startX: 0,
    startY: 0,
    initialTokenX: 0,
    initialTokenY: 0,
    canvasRect: null
  });

  // Handle pointer down on magnet token
  const handleMagnetPointerDown = (e: React.PointerEvent, token: MagnetToken) => {
    e.stopPropagation();
    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    setDraggingTokenId(token.id);
    onSelectToken(token);

    dragStartPos.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialTokenX: token.x,
      initialTokenY: token.y,
      canvasRect
    };

    // Capture pointer to track smoothly outside window
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Handle pointer move during drag
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingTokenId || !canvasRef.current) return;

    const { startX, startY, initialTokenX, initialTokenY, canvasRect } = dragStartPos.current;
    if (!canvasRect) return;

    const deltaX = (e.clientX - startX) / (canvasRect.width * zoomLevel) * 100;
    const deltaY = (e.clientY - startY) / (canvasRect.height * zoomLevel) * 100;

    let newX = Math.max(3, Math.min(97, initialTokenX + deltaX));
    let newY = Math.max(3, Math.min(97, initialTokenY + deltaY));

    if (snapToGrid) {
      newX = Math.round(newX / 2.5) * 2.5;
      newY = Math.round(newY / 2.5) * 2.5;
    }

    // Determine target zone
    const targetZone = zones.find(z => 
      newX >= z.x && newX <= z.x + z.width &&
      newY >= z.y && newY <= z.y + z.height
    );

    onUpdateTokenPosition(draggingTokenId, newX, newY, targetZone?.id);
  }, [draggingTokenId, zoomLevel, snapToGrid, zones, onUpdateTokenPosition]);

  // Handle pointer up to end drag
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (draggingTokenId) {
      setDraggingTokenId(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
    if (isPanning) {
      setIsPanning(false);
    }
  }, [draggingTokenId, isPanning]);

  // Background Pan controls
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('whiteboard-bg')) {
      onSelectToken(null);
      if (e.button === 0) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      }
    }
  };

  const handleCanvasPanMove = (e: React.PointerEvent) => {
    if (isPanning && !draggingTokenId) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else {
      handlePointerMove(e);
    }
  };

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(2.0, Math.max(0.6, Number((prev + delta).toFixed(2)))));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Filter tokens based on search
  const filteredTokens = tokens.filter(t => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.subtitle && t.subtitle.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q))
    );
  });

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-stone-200/90 flex flex-col select-none">
      {/* Top Floating Board Status & Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        {/* Left Badge: Quick Overview */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-200 shadow-md text-xs font-semibold text-stone-700">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping inline-block" />
          <span className="text-stone-900 font-bold">실시간 보드</span>
          <span className="text-stone-300">|</span>
          <span>모형 <strong className="text-blue-600 font-extrabold">{tokens.length}</strong>개</span>
          <span className="text-stone-300">|</span>
          <span>구역 <strong className="text-amber-600 font-extrabold">{zones.length}</strong>개</span>
        </div>

        {/* Right Controls: Zoom & Grid Snap */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/90 backdrop-blur-md p-1 rounded-xl border border-stone-200 shadow-md text-xs">
          <button
            onClick={() => setSnapToGrid(prev => !prev)}
            className={`p-1.5 rounded-lg font-semibold flex items-center gap-1 transition-colors ${
              snapToGrid
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
            title="격자 자석 스냅 켜기/끄기"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">스냅 {snapToGrid ? 'ON' : 'OFF'}</span>
          </button>

          <div className="w-px h-4 bg-stone-200 mx-0.5" />

          <button
            onClick={() => handleZoom(-0.15)}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="축소 (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono font-bold text-stone-700 w-11 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>

          <button
            onClick={() => handleZoom(0.15)}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="확대 (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetView}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="화면 배율 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive Whiteboard Canvas */}
      <div
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPanMove}
        onPointerUp={handlePointerUp}
        className="whiteboard-bg flex-1 w-full h-full overflow-hidden relative cursor-default"
        style={{ touchAction: 'none' }}
      >
        {/* Scalable & Pannable Whiteboard Frame Container */}
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '50% 50%',
            transition: isPanning || draggingTokenId ? 'none' : 'transform 0.15s ease-out',
            width: '100%',
            height: '100%',
            minWidth: '950px',
            minHeight: '620px'
          }}
          className="absolute inset-0 m-auto whiteboard-surface rounded-2xl border-[10px] border-stone-300 shadow-2xl relative overflow-hidden"
        >
          {/* Top Aluminum Header Label (like real whiteboard) */}
          <div className="absolute top-2 left-4 text-xs font-bold text-stone-400/80 tracking-widest uppercase select-none pointer-events-none flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
            <span>WHITEBOARD ALLOCATION SYSTEM</span>
          </div>

          {/* Top-Right Authentic Roster Pinned Widget (matches photo!) */}
          <div
            onClick={onOpenRosterSheet}
            className="absolute top-3 right-4 z-20 cursor-pointer bg-white/95 border-2 border-stone-300 shadow-md rounded-lg p-2.5 max-w-[210px] hover:border-blue-500 hover:shadow-lg transition-all text-left group"
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-1 mb-1.5">
              <span className="text-[10px] font-extrabold text-blue-700 uppercase">
                (주)유로테크 명단표
              </span>
              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                클릭시 전체보기
              </span>
            </div>
            <div className="text-[11px] font-bold text-stone-900 leading-tight">
              대표: 김진영
            </div>
            <div className="text-[9px] text-stone-500 mt-0.5">
              한샘 A/S (시공일 1개월 이후)
            </div>
            <div className="mt-1.5 pt-1 border-t border-stone-100 flex items-center justify-between text-[9px] font-semibold text-blue-600 group-hover:underline">
              <span>인원 배정표 열기</span>
              <span>→</span>
            </div>
          </div>

          {/* Authentic Hand-written Marker Annotations on Board (inspired by the photo: 전단 5 / 후단 4 / 배리 6) */}
          <div className="absolute top-16 right-56 pointer-events-none select-none text-stone-800/80 font-handwriting text-2xl font-bold tracking-wider leading-snug drop-shadow-xs rotate-[-3deg]">
            <div>전단 5</div>
            <div>후단 4</div>
            <div>배리 6</div>
          </div>

          {/* 1. Render Zones */}
          {zones.map((zone) => {
            const tokensInZone = tokens.filter((t) => t.zoneId === zone.id);
            return (
              <ZoneCardComponent
                key={zone.id}
                zone={zone}
                tokensInZone={tokensInZone}
                onEditZone={onEditZone}
                onDeleteZone={onDeleteZone}
                onAutoArrangeZone={onAutoArrangeZone}
              />
            );
          })}

          {/* 2. Render Magnet Tokens */}
          {filteredTokens.map((token) => (
            <MagnetTokenComponent
              key={token.id}
              token={token}
              isSelected={token.id === selectedTokenId}
              isDragging={token.id === draggingTokenId}
              scale={zoomLevel}
              onPointerDown={handleMagnetPointerDown}
              onClick={(tok) => onSelectToken(tok)}
              onEdit={onEditToken}
              onDelete={onDeleteToken}
              onViewSchedule={onViewSchedule}
              onQuickStatusChange={onQuickStatusChange}
            />
          ))}

          {/* Bottom-right Aluminum Brand Stamp */}
          <div className="absolute bottom-2 right-4 text-[10px] font-mono text-stone-400/80 pointer-events-none select-none">
            EUROTECH MAGNET DISPATCH v2.0
          </div>
        </div>
      </div>

      {/* Bottom Floating Quick Actions on Mobile / Desktop */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-stone-200 shadow-xl">
        <button
          type="button"
          onClick={onAddNewMagnet}
          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>새 모형 추가</span>
        </button>

        <button
          type="button"
          onClick={onOpenRosterSheet}
          className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all flex items-center gap-1.5"
        >
          <span>📋 현장 명단표</span>
        </button>
      </div>
    </div>
  );
};
