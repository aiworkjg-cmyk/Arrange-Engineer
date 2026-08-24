import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MagnetToken, BoardZone, MagnetStatus, ZoneRect, BoardMetrics, SiteSettings } from '../types';
import { MagnetTokenComponent } from './MagnetToken';
import { ZoneCardComponent, ZoneResizeHandle } from './ZoneCard';
import { getTokenSizePx, MIN_TOKEN_PX, MAX_TOKEN_PX } from '../utils/layout';
import { Plus, Layout, MousePointer2, Search, ListChecks } from 'lucide-react';

interface WhiteboardCanvasProps {
  tokens: MagnetToken[];
  zones: BoardZone[];
  settings: SiteSettings;
  selectedTokenIds: string[];
  focusTokenId: string | null;
  searchFilter: string;
  onUpdateTokenPositions: (
    moves: Array<{ id: string; x: number; y: number; zoneId?: string }>
  ) => void;
  onUpdateTokenSize: (tokenId: string, sizePx: number) => void;
  onUpdateZoneRect: (zoneId: string, rect: ZoneRect, mode: 'move' | 'resize') => void;
  onBoardMetricsChange: (metrics: BoardMetrics) => void;
  onSelectToken: (token: MagnetToken | null, additive?: boolean) => void;
  onSelectTokenIds: (tokenIds: string[]) => void;
  onEditToken: (token: MagnetToken) => void;
  onEditSelectedTokens: (tokenIds: string[]) => void;
  onDeleteToken: (tokenId: string) => void;
  onViewSchedule: (token: MagnetToken) => void;
  onQuickStatusChange: (tokenId: string, status: MagnetStatus) => void;
  onEditZone: (zone: BoardZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onAutoArrangeZone: (zoneId: string) => void;
  onOpenRosterSheet: () => void;
  onAddNewMagnet: () => void;
  onOpenMagnetManager: () => void;
  onAddNewZone: () => void;
  onFocusHandled: () => void;
}

/** 보드 좌표계는 모두 보드 프레임 대비 % 이다. */
const MIN_ZONE_WIDTH = 10;
const MIN_ZONE_HEIGHT = 12;
const TOKEN_MARGIN = 3;
const DRAG_THRESHOLD_PX = 3;

type DragSession =
  | {
      kind: 'token-move';
      id: string;
      pointerId: number;
      originClientX: number;
      originClientY: number;
      members: Array<{ id: string; startX: number; startY: number }>;
    }
  | {
      kind: 'token-resize';
      id: string;
      pointerId: number;
      originClientX: number;
      originClientY: number;
      startSizePx: number;
    }
  | {
      kind: 'zone-move';
      id: string;
      pointerId: number;
      originClientX: number;
      originClientY: number;
      startRect: ZoneRect;
    }
  | {
      kind: 'zone-resize';
      id: string;
      handle: ZoneResizeHandle;
      pointerId: number;
      originClientX: number;
      originClientY: number;
      startRect: ZoneRect;
    };

type DragPreview =
  | { kind: 'token-move'; id: string; positions: Record<string, { x: number; y: number }>; moved: boolean }
  | { kind: 'token-resize'; id: string; sizePx: number }
  | { kind: 'zone'; id: string; rect: ZoneRect; moved: boolean };

interface SelectionSession {
  pointerId: number;
  originClientX: number;
  originClientY: number;
  additive: boolean;
  initialSelection: string[];
}

interface SelectionBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

const round1 = (n: number) => Number(n.toFixed(1));
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const WhiteboardCanvas: React.FC<WhiteboardCanvasProps> = ({
  tokens,
  zones,
  settings,
  selectedTokenIds,
  focusTokenId,
  searchFilter,
  onUpdateTokenPositions,
  onUpdateTokenSize,
  onUpdateZoneRect,
  onBoardMetricsChange,
  onSelectToken,
  onSelectTokenIds,
  onEditToken,
  onEditSelectedTokens,
  onDeleteToken,
  onViewSchedule,
  onQuickStatusChange,
  onEditZone,
  onDeleteZone,
  onAutoArrangeZone,
  onOpenRosterSheet,
  onAddNewMagnet,
  onOpenMagnetManager,
  onAddNewZone,
  onFocusHandled
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // 배경은 고정하고, 빈 영역 드래그는 모형 다중 선택에 사용한다.
  const selectionSessionRef = useRef<SelectionSession | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // 드래그 (모형 이동/크기조절, 구역 이동/크기조절)
  const sessionRef = useRef<DragSession | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 핸들러가 항상 최신 props 를 보도록 유지
  const latestRef = useRef({ zones, onUpdateTokenPositions, onUpdateTokenSize, onUpdateZoneRect });
  useEffect(() => {
    latestRef.current = { zones, onUpdateTokenPositions, onUpdateTokenSize, onUpdateZoneRect };
  });

  /** 보드의 실제 픽셀 크기를 상위로 알려 배치 계산에 쓰이게 한다 */
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const report = () => {
      // clientWidth/Height 는 테두리를 제외한 실제 배치 영역
      onBoardMetricsChange({ width: board.clientWidth, height: board.clientHeight });
    };

    report();
    const observer = new ResizeObserver(report);
    observer.observe(board);
    return () => observer.disconnect();
  }, [onBoardMetricsChange]);

  /** 픽셀 이동량을 보드 대비 % 로 변환 (확대/축소 배율 자동 반영) */
  const toPercentDelta = useCallback((dxPx: number, dyPx: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { dx: 0, dy: 0 };
    return { dx: (dxPx / rect.width) * 100, dy: (dyPx / rect.height) * 100 };
  }, []);

  // ---------------------------------------------------------------- 드래그 시작
  const beginTokenDrag = (e: React.PointerEvent, token: MagnetToken) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    e.preventDefault();

    const additive = e.ctrlKey || e.metaKey;
    const isAlreadySelected = selectedTokenIds.includes(token.id);
    if (additive || !isAlreadySelected) onSelectToken(token, additive);

    const movingTokens = isAlreadySelected && !additive
      ? tokens.filter((item) => selectedTokenIds.includes(item.id))
      : [token];
    const positions = Object.fromEntries(
      movingTokens.map((item) => [item.id, { x: item.x, y: item.y }])
    );
    sessionRef.current = {
      kind: 'token-move',
      id: token.id,
      pointerId: e.pointerId,
      originClientX: e.clientX,
      originClientY: e.clientY,
      members: movingTokens.map((item) => ({ id: item.id, startX: item.x, startY: item.y }))
    };
    setPreview({ kind: 'token-move', id: token.id, positions, moved: false });
    setIsDragging(true);
  };

  const beginTokenResize = (e: React.PointerEvent, token: MagnetToken) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    e.preventDefault();

    onSelectToken(token);
    const startSizePx = getTokenSizePx(token);
    sessionRef.current = {
      kind: 'token-resize',
      id: token.id,
      pointerId: e.pointerId,
      originClientX: e.clientX,
      originClientY: e.clientY,
      startSizePx
    };
    setPreview({ kind: 'token-resize', id: token.id, sizePx: startSizePx });
    setIsDragging(true);
  };

  const beginZoneDrag = (
    e: React.PointerEvent,
    zone: BoardZone,
    handle: ZoneResizeHandle | 'move'
  ) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    e.preventDefault();

    const startRect: ZoneRect = { x: zone.x, y: zone.y, width: zone.width, height: zone.height };
    sessionRef.current =
      handle === 'move'
        ? {
            kind: 'zone-move',
            id: zone.id,
            pointerId: e.pointerId,
            originClientX: e.clientX,
            originClientY: e.clientY,
            startRect
          }
        : {
            kind: 'zone-resize',
            id: zone.id,
            handle,
            pointerId: e.pointerId,
            originClientX: e.clientX,
            originClientY: e.clientY,
            startRect
          };
    setPreview({ kind: 'zone', id: zone.id, rect: startRect, moved: false });
    setIsDragging(true);
  };

  // ------------------------------------------------- 드래그 진행 (window 리스너)
  useEffect(() => {
    if (!isDragging) return;

    const computeZoneRect = (
      session: Extract<DragSession, { kind: 'zone-move' | 'zone-resize' }>,
      dx: number,
      dy: number
    ): ZoneRect => {
      const { startRect } = session;

      if (session.kind === 'zone-move') {
        return {
          x: round1(clamp(startRect.x + dx, 0, 100 - startRect.width)),
          y: round1(clamp(startRect.y + dy, 0, 100 - startRect.height)),
          width: startRect.width,
          height: startRect.height
        };
      }

      const handle = session.handle;
      let left = startRect.x;
      let top = startRect.y;
      let right = startRect.x + startRect.width;
      let bottom = startRect.y + startRect.height;

      if (handle.includes('w')) left = startRect.x + dx;
      if (handle.includes('e')) right = startRect.x + startRect.width + dx;
      if (handle.includes('n')) top = startRect.y + dy;
      if (handle.includes('s')) bottom = startRect.y + startRect.height + dy;

      left = Math.max(0, Math.min(left, right - MIN_ZONE_WIDTH));
      right = Math.min(100, Math.max(right, left + MIN_ZONE_WIDTH));
      top = Math.max(0, Math.min(top, bottom - MIN_ZONE_HEIGHT));
      bottom = Math.min(100, Math.max(bottom, top + MIN_ZONE_HEIGHT));

      return {
        x: round1(left),
        y: round1(top),
        width: round1(right - left),
        height: round1(bottom - top)
      };
    };

    /** 대각선 방향 이동량을 지름 변화로 환산 */
    const computeTokenSize = (
      session: Extract<DragSession, { kind: 'token-resize' }>,
      dxPx: number,
      dyPx: number
    ) => {
      const boardRect = boardRef.current?.getBoundingClientRect();
      const scale = boardRect && boardRect.width ? boardRect.width / (boardRef.current!.clientWidth || 1) : 1;
      const delta = ((dxPx + dyPx) / 2 / (scale || 1)) * 2;
      return Math.round(clamp(session.startSizePx + delta, MIN_TOKEN_PX, MAX_TOKEN_PX));
    };

    const handleMove = (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      const dxPx = e.clientX - session.originClientX;
      const dyPx = e.clientY - session.originClientY;
      const moved = Math.hypot(dxPx, dyPx) > DRAG_THRESHOLD_PX;
      const { dx, dy } = toPercentDelta(dxPx, dyPx);

      if (session.kind === 'token-move') {
        const positions = Object.fromEntries(
          session.members.map((member) => [
            member.id,
            {
              x: round1(clamp(member.startX + dx, TOKEN_MARGIN, 100 - TOKEN_MARGIN)),
              y: round1(clamp(member.startY + dy, TOKEN_MARGIN, 100 - TOKEN_MARGIN))
            }
          ])
        );
        setPreview({
          kind: 'token-move',
          id: session.id,
          positions,
          moved
        });
      } else if (session.kind === 'token-resize') {
        setPreview({ kind: 'token-resize', id: session.id, sizePx: computeTokenSize(session, dxPx, dyPx) });
      } else {
        setPreview({ kind: 'zone', id: session.id, rect: computeZoneRect(session, dx, dy), moved });
      }
    };

    const finish = (e: PointerEvent) => {
      const session = sessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      const dxPx = e.clientX - session.originClientX;
      const dyPx = e.clientY - session.originClientY;
      const moved = Math.hypot(dxPx, dyPx) > DRAG_THRESHOLD_PX;
      const { dx, dy } = toPercentDelta(dxPx, dyPx);
      const cancelled = e.type === 'pointercancel';

      if (moved && !cancelled) {
        if (session.kind === 'token-move') {
          const moves = session.members.map((member) => {
            const x = round1(clamp(member.startX + dx, TOKEN_MARGIN, 100 - TOKEN_MARGIN));
            const y = round1(clamp(member.startY + dy, TOKEN_MARGIN, 100 - TOKEN_MARGIN));
            const targetZone = latestRef.current.zones
              .filter((z) => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height)
              .sort((a, b) => a.width * a.height - b.width * b.height)[0];
            return { id: member.id, x, y, zoneId: targetZone?.id };
          });
          latestRef.current.onUpdateTokenPositions(moves);
        } else if (session.kind === 'token-resize') {
          latestRef.current.onUpdateTokenSize(session.id, computeTokenSize(session, dxPx, dyPx));
        } else {
          latestRef.current.onUpdateZoneRect(
            session.id,
            computeZoneRect(session, dx, dy),
            session.kind === 'zone-move' ? 'move' : 'resize'
          );
        }
      }

      sessionRef.current = null;
      setPreview(null);
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [isDragging, toPercentDelta]);

  // ---------------------------------------------------------- 배경 드래그 선택
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isBackground =
      target === canvasRef.current ||
      target === boardRef.current ||
      target.classList.contains('whiteboard-bg') ||
      target.classList.contains('whiteboard-surface') ||
      target.classList.contains('whiteboard-surface-plain');

    if (!isBackground || e.button !== 0) return;

    e.preventDefault();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    const additive = e.ctrlKey || e.metaKey;
    selectionSessionRef.current = {
      pointerId: e.pointerId,
      originClientX: e.clientX,
      originClientY: e.clientY,
      additive,
      initialSelection: selectedTokenIds
    };
    setSelectionBox({
      left: e.clientX - canvasRect.left,
      top: e.clientY - canvasRect.top,
      width: 0,
      height: 0
    });
    setIsSelecting(true);
  };

  useEffect(() => {
    if (!isSelecting) return;

    const handleMove = (e: PointerEvent) => {
      const session = selectionSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      setSelectionBox({
        left: Math.min(session.originClientX, e.clientX) - canvasRect.left,
        top: Math.min(session.originClientY, e.clientY) - canvasRect.top,
        width: Math.abs(e.clientX - session.originClientX),
        height: Math.abs(e.clientY - session.originClientY)
      });
    };
    const stop = (e: PointerEvent) => {
      const session = selectionSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      const moved = Math.hypot(
        e.clientX - session.originClientX,
        e.clientY - session.originClientY
      ) > DRAG_THRESHOLD_PX;

      if (!moved) {
        if (!session.additive) onSelectToken(null);
      } else {
        const left = Math.min(session.originClientX, e.clientX);
        const right = Math.max(session.originClientX, e.clientX);
        const top = Math.min(session.originClientY, e.clientY);
        const bottom = Math.max(session.originClientY, e.clientY);
        const hitIds = tokens
          .filter((token) => {
            const rect = document.getElementById(`magnet-${token.id}`)?.getBoundingClientRect();
            return (
              !!rect &&
              rect.right >= left &&
              rect.left <= right &&
              rect.bottom >= top &&
              rect.top <= bottom
            );
          })
          .map((token) => token.id);

        onSelectTokenIds(
          session.additive
            ? Array.from(new Set([...session.initialSelection, ...hitIds]))
            : hitIds
        );
      }

      selectionSessionRef.current = null;
      setSelectionBox(null);
      setIsSelecting(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [isSelecting, onSelectToken, onSelectTokenIds, tokens]);

  // ------------------------------------------- '위치 확인' 시 해당 모형으로 이동
  useEffect(() => {
    if (!focusTokenId) return;

    const tokenEl = document.getElementById(`magnet-${focusTokenId}`);
    tokenEl?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });

    const timer = window.setTimeout(onFocusHandled, 1800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTokenId]);

  // ------------------------------------------------------------------- 검색
  const query = searchFilter.trim().toLowerCase();
  const isSearching = query.length > 0;

  const matchesSearch = (t: MagnetToken) =>
    isSearching &&
    (t.title.toLowerCase().includes(query) ||
      (t.subtitle ? t.subtitle.toLowerCase().includes(query) : false) ||
      (t.phone ? t.phone.includes(query) : false));

  const matchCount = isSearching ? tokens.filter(matchesSearch).length : 0;

  const activeZoneId = preview?.kind === 'zone' ? preview.id : null;

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-stone-200/90 flex flex-col select-none">
      {/* 상단 플로팅 상태 & 뷰 컨트롤 */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-start justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-stone-200 shadow-md text-xs font-semibold text-stone-700 whitespace-nowrap">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping inline-block shrink-0" />
          <span className="text-stone-900 font-bold">실시간 보드</span>
          <span className="text-stone-300">|</span>
          <span>
            기사 <strong className="text-blue-600 font-extrabold">{tokens.length}</strong>명
          </span>
          <span className="text-stone-300">|</span>
          <span>
            구역 <strong className="text-amber-600 font-extrabold">{zones.length}</strong>개
          </span>

          {isSearching && (
            <>
              <span className="text-stone-300">|</span>
              <span className="flex items-center gap-1 text-blue-700">
                <Search className="w-3 h-3 shrink-0" />
                <strong className="font-extrabold">{matchCount}</strong>건 검색됨
              </span>
            </>
          )}
        </div>

      </div>

      {/* 메인 보드 */}
      <div
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        className={`whiteboard-bg flex-1 w-full h-full overflow-hidden relative ${
          isSelecting ? 'cursor-crosshair' : 'cursor-default'
        }`}
        style={{ touchAction: 'none' }}
      >
        <div
          ref={boardRef}
          style={{
            width: '100%',
            height: '100%'
          }}
          className={`absolute inset-0 m-auto ${
            settings.showGrid ? 'whiteboard-surface' : 'whiteboard-surface-plain'
          } rounded-2xl border-[10px] border-stone-300 shadow-2xl overflow-hidden`}
        >
          <div className="absolute top-2 left-4 text-xs font-bold text-stone-400/80 tracking-widest uppercase select-none pointer-events-none flex items-center gap-2 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-stone-300 inline-block" />
            <span>{settings.companyName || 'FIELD DISPATCH BOARD'}</span>
          </div>

          {/* 1. 구역 */}
          {zones.map((zone) => {
            const zonePreview =
              preview?.kind === 'zone' && preview.id === zone.id ? preview.rect : null;
            const renderedZone = zonePreview ? { ...zone, ...zonePreview } : zone;
            const tokensInZone = tokens.filter((t) => t.zoneId === zone.id);

            return (
              <ZoneCardComponent
                key={zone.id}
                zone={renderedZone}
                tokensInZone={tokensInZone}
                isActive={activeZoneId === zone.id}
                showCapacity={settings.showZoneCapacity}
                showSubtitle={settings.showZoneSubtitle}
                onEditZone={onEditZone}
                onDeleteZone={onDeleteZone}
                onAutoArrangeZone={onAutoArrangeZone}
                onZonePointerDown={beginZoneDrag}
              />
            );
          })}

          {/* 2. 모형 (검색 중에도 모두 표시, 일치 항목만 강조) */}
          {tokens.map((token) => {
            const movePreview = preview?.kind === 'token-move' ? preview : null;
            const movePosition = movePreview?.positions[token.id];
            const resizePreview =
              preview?.kind === 'token-resize' && preview.id === token.id ? preview : null;
            const isMatch = matchesSearch(token);

            return (
              <MagnetTokenComponent
                key={token.id}
                token={token}
                previewX={movePosition?.x}
                previewY={movePosition?.y}
                previewSizePx={resizePreview?.sizePx}
                isSelected={selectedTokenIds.includes(token.id)}
                isDragging={!!movePosition && !!movePreview?.moved}
                isResizing={!!resizePreview}
                isFocused={token.id === focusTokenId}
                isSearchMatch={isMatch}
                isSearchDimmed={isSearching && !isMatch}
                searchHighlight={settings.searchHighlight}
                showStatusDot={settings.showStatusDot}
                showSubtitle={settings.showTokenSubtitle}
                onPointerDown={beginTokenDrag}
                onResizePointerDown={beginTokenResize}
                onEdit={(item) => {
                  if (selectedTokenIds.length > 1 && selectedTokenIds.includes(item.id)) {
                    onEditSelectedTokens(selectedTokenIds);
                  } else {
                    onEditToken(item);
                  }
                }}
                onDelete={onDeleteToken}
                onViewSchedule={onViewSchedule}
                onQuickStatusChange={onQuickStatusChange}
              />
            );
          })}
        </div>

        {selectionBox && (
          <div
            className="absolute z-40 pointer-events-none border-2 border-blue-500 bg-blue-400/15 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
            style={selectionBox}
          />
        )}
      </div>

      {/* 하단 플로팅 퀵 액션 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-stone-200 shadow-xl max-w-[calc(100%-1.5rem)] overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={onAddNewMagnet}
          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>새 모형 추가</span>
        </button>

        <button
          type="button"
          onClick={onOpenMagnetManager}
          className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
          title="모형 목록 선택 및 속성 일괄 수정"
        >
          <ListChecks className="w-4 h-4 shrink-0" />
          <span>모형 관리</span>
        </button>

        <button
          type="button"
          onClick={onAddNewZone}
          className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
          title="새 보드 구역 추가"
        >
          <Layout className="w-4 h-4 shrink-0" />
          <span>구역 추가</span>
        </button>

        <button
          type="button"
          onClick={onOpenRosterSheet}
          className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <span>📋 현장 명단표</span>
        </button>

        <div className="hidden md:flex items-center gap-1 pl-2 ml-1 border-l border-stone-200 text-[11px] text-stone-500 font-medium whitespace-nowrap shrink-0">
          <MousePointer2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span>Ctrl+클릭 다중 선택 · Ctrl+A 구역 전체 선택 · 빈 영역 드래그 선택</span>
        </div>
      </div>
    </div>
  );
};
