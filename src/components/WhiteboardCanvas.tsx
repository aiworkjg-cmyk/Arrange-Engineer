import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { MagnetToken, BoardZone, MagnetStatus, ZoneRect, BoardMetrics, SiteSettings } from '../types';
import { MagnetTokenComponent } from './MagnetToken';
import { ZoneCardComponent, ZoneResizeHandle } from './ZoneCard';
import {
  getTokenSizePx,
  MIN_TOKEN_PX,
  MAX_TOKEN_PX,
  DEFAULT_BOARD_WIDTH,
  DEFAULT_BOARD_HEIGHT,
  getFitScale
} from '../utils/layout';
import {
  Plus,
  LayoutList,
  MousePointer2,
  Search,
  ListChecks,
  Users,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Hand,
  Expand,
  Minimize2
} from 'lucide-react';

interface WhiteboardCanvasProps {
  tokens: MagnetToken[];
  zones: BoardZone[];
  settings: SiteSettings;
  isMobile: boolean;
  /** 대시보드만 꽉 채워 보는 모드 */
  isBoardOnly: boolean;
  onToggleBoardOnly: () => void;
  onMobileOrientationChange: (orientation: SiteSettings['mobileOrientation']) => void;
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
  onAddNewZone: () => void;
  onOpenMagnetManager: () => void;
  onOpenZoneManager: () => void;
  /** 배경(보드) 더블클릭 시 열리는 보드 설정 */
  onOpenBoardSettings: () => void;
  onFocusHandled: () => void;
}

/** 보드 좌표계는 모두 보드(1600x1000) 대비 % 이다. */
const MIN_ZONE_WIDTH = 10;
const MIN_ZONE_HEIGHT = 12;
const TOKEN_MARGIN = 3;
const DRAG_THRESHOLD_PX = 3;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;

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

interface PanSession {
  pointerId: number;
  originClientX: number;
  originClientY: number;
  startPanX: number;
  startPanY: number;
  moved: boolean;
}

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
  isMobile,
  isBoardOnly,
  onToggleBoardOnly,
  onMobileOrientationChange,
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
  onAddNewZone,
  onOpenMagnetManager,
  onOpenZoneManager,
  onOpenBoardSettings,
  onFocusHandled
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  /* --------------------------------------------------------- 화면 맞춤 배율 */
  // 보드(배경판)의 논리 크기 - 설정에서 바꿀 수 있다
  const boardWidth = settings.boardWidth || DEFAULT_BOARD_WIDTH;
  const boardHeight = settings.boardHeight || DEFAULT_BOARD_HEIGHT;

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1); // 화면 맞춤 배율에 곱해지는 사용자 배율
  const [pan, setPan] = useState({ x: 0, y: 0 }); // 보드 좌상단의 화면 위치(px)

  const fitScale = getFitScale(viewport.width, viewport.height, boardWidth, boardHeight);
  const scale = fitScale * zoom;

  /** 보드를 화면 가운데 놓는 좌표 */
  const centeredPan = useCallback(
    (currentScale: number) => ({
      x: (viewport.width - boardWidth * currentScale) / 2,
      y: (viewport.height - boardHeight * currentScale) / 2
    }),
    [viewport.width, viewport.height, boardWidth, boardHeight]
  );

  /** 보드는 항상 1600x1000 논리 크기 - 창 크기와 무관하게 고정 */
  useEffect(() => {
    onBoardMetricsChange({ width: boardWidth, height: boardHeight });
  }, [onBoardMetricsChange, boardWidth, boardHeight]);

  /** 컨테이너 크기를 추적해 배율을 다시 계산한다 */
  const prevFitRef = useRef<{ scale: number; width: number; height: number } | null>(null);

  /**
   * 렌더링될 때마다 컨테이너 크기를 확인한다.
   * (모바일 미리보기 방향 전환처럼 창 크기 변화 없이 영역만 바뀌는 경우까지 잡아준다)
   * 값이 실제로 달라졌을 때만 상태를 갱신하므로 렌더 루프가 생기지 않는다.
   */
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setViewport((prev) =>
      Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
        ? prev
        : { width: rect.width, height: rect.height }
    );
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      setViewport((prev) =>
        Math.abs(prev.width - rect.width) < 0.5 && Math.abs(prev.height - rect.height) < 0.5
          ? prev
          : { width: rect.width, height: rect.height }
      );
    };

    measure();

    // ResizeObserver 와 창 리사이즈를 함께 듣는다.
    // (일부 환경에서 ResizeObserver 만으로는 갱신이 누락될 수 있다)
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  /**
   * 창 크기가 바뀌면 보드 중심을 기준으로 위치를 다시 잡는다.
   * (보드 자체는 고정 크기라 내용이 흐트러지지 않고 배율만 달라진다)
   */
  useEffect(() => {
    if (viewport.width === 0 || viewport.height === 0) return;

    const nextCentered = {
      x: (viewport.width - boardWidth * fitScale * zoom) / 2,
      y: (viewport.height - boardHeight * fitScale * zoom) / 2
    };

    // 화면이나 배경판 크기가 달라져도 기본 위치는 항상 정중앙으로 되돌린다.
    setPan(nextCentered);

    prevFitRef.current = {
      scale: fitScale * zoom,
      width: viewport.width,
      height: viewport.height
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewport.width, viewport.height, fitScale]);

  /**
   * 확대/축소.
   * 기본은 보드를 화면 정중앙에 고정한 채 배율만 바꾼다.
   * (두 손가락 확대처럼 기준점이 필요한 경우에만 anchor 를 넘긴다)
   */
  const zoomAt = useCallback(
    (nextZoom: number, anchorClientX?: number, anchorClientY?: number) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      const clamped = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);

      setZoom((prevZoom) => {
        if (Math.abs(clamped - prevZoom) < 0.0001) return prevZoom;
        const prevScale = fitScale * prevZoom;
        const nextScale = fitScale * clamped;

        setPan((prevPan) => {
          // 기준점이 없으면 항상 화면 정중앙 기준으로 다시 맞춘다
          if (!canvasRect || anchorClientX === undefined || anchorClientY === undefined) {
            return {
              x: (viewport.width - boardWidth * nextScale) / 2,
              y: (viewport.height - boardHeight * nextScale) / 2
            };
          }
          const cx = anchorClientX - canvasRect.left;
          const cy = anchorClientY - canvasRect.top;
          const boardX = (cx - prevPan.x) / prevScale;
          const boardY = (cy - prevPan.y) / prevScale;
          return { x: cx - boardX * nextScale, y: cy - boardY * nextScale };
        });

        prevFitRef.current = {
          scale: nextScale,
          width: viewport.width,
          height: viewport.height
        };
        return clamped;
      });
    },
    [fitScale, viewport.width, viewport.height, boardWidth, boardHeight]
  );

  /**
   * 배경 더블클릭 처리.
   * 구역 안쪽 빈 공간이면 그 구역 설정을, 구역 밖 배경이면 보드 설정을 연다.
   */
  const handleCanvasDoubleClick = (e: React.MouseEvent) => {
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect || boardRect.width === 0 || boardRect.height === 0) return;

    const x = ((e.clientX - boardRect.left) / boardRect.width) * 100;
    const y = ((e.clientY - boardRect.top) / boardRect.height) * 100;

    const hitZone = zones
      .filter((z) => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height)
      .sort((a, b) => a.width * a.height - b.width * b.height)[0];

    if (hitZone) onEditZone(hitZone);
    else onOpenBoardSettings();
  };

  const resetView = useCallback(() => {
    setZoom(1);
    setPan(centeredPan(fitScale));
    prevFitRef.current = { scale: fitScale, width: viewport.width, height: viewport.height };
  }, [centeredPan, fitScale, viewport.width, viewport.height]);

  /* ------------------------------------------------------------- 드래그 상태 */
  const sessionRef = useRef<DragSession | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const panSessionRef = useRef<PanSession | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  // PC 전용: 배경 드래그로 여러 모형을 한 번에 고르는 선택 박스
  const selectionSessionRef = useRef<SelectionSession | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // 두 손가락 확대/축소
  const pinchRef = useRef<{
    pointers: Map<number, { x: number; y: number }>;
    startDistance: number;
    startZoom: number;
  }>({ pointers: new Map<number, { x: number; y: number }>(), startDistance: 0, startZoom: 1 });
  const [isPinching, setIsPinching] = useState(false);

  const latestRef = useRef({
    zones,
    onUpdateTokenPositions,
    onUpdateTokenSize,
    onUpdateZoneRect,
    scale,
    boardWidth,
    boardHeight
  });
  useEffect(() => {
    latestRef.current = {
      zones,
      onUpdateTokenPositions,
      onUpdateTokenSize,
      onUpdateZoneRect,
      scale,
      boardWidth,
      boardHeight
    };
  });

  /** 화면 이동량(px)을 보드 대비 % 로 변환 */
  const toPercentDelta = useCallback(
    (dxPx: number, dyPx: number) => {
      const currentScale = latestRef.current.scale || 1;
      return {
        dx: (dxPx / currentScale / latestRef.current.boardWidth) * 100,
        dy: (dyPx / currentScale / latestRef.current.boardHeight) * 100
      };
    },
    []
  );

  /* -------------------------------------------------------------- 드래그 시작 */
  const beginTokenDrag = (e: React.PointerEvent, token: MagnetToken) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.stopPropagation();
    e.preventDefault();

    const additive = e.ctrlKey || e.metaKey;
    const isAlreadySelected = selectedTokenIds.includes(token.id);
    if (additive || !isAlreadySelected) onSelectToken(token, additive);

    const movingTokens =
      isAlreadySelected && !additive
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

  /* -------------------------------------------- 드래그 진행 (window 리스너) */
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

    /** 대각선 이동량을 지름 변화로 환산 (배율 보정) */
    const computeTokenSize = (
      session: Extract<DragSession, { kind: 'token-resize' }>,
      dxPx: number,
      dyPx: number
    ) => {
      const currentScale = latestRef.current.scale || 1;
      const delta = ((dxPx + dyPx) / 2 / currentScale) * 2;
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
        setPreview({ kind: 'token-move', id: session.id, positions, moved });
      } else if (session.kind === 'token-resize') {
        setPreview({
          kind: 'token-resize',
          id: session.id,
          sizePx: computeTokenSize(session, dxPx, dyPx)
        });
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

  /* ----------------------------------------------------------- 배경 조작
   * PC   : 왼쪽 드래그 = 모형 다중 선택 박스 / 가운데 버튼 드래그 = 화면 이동
   * 모바일 : 한 손가락 드래그 = 화면 이동 / 두 손가락 = 확대·축소
   * ------------------------------------------------------------------- */
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isBackground =
      target === canvasRef.current ||
      target === boardRef.current ||
      target.classList.contains('whiteboard-bg') ||
      target.classList.contains('whiteboard-zone-surface') ||
      target.classList.contains('whiteboard-surface') ||
      target.classList.contains('whiteboard-surface-plain');

    if (!isBackground) return;

    const isTouchLike = e.pointerType !== 'mouse';
    const isMiddleButton = e.pointerType === 'mouse' && e.button === 1;
    if (e.pointerType === 'mouse' && e.button !== 0 && !isMiddleButton) return;

    // 모바일(터치)과 가운데 버튼은 화면 이동, PC 왼쪽 버튼은 선택 박스
    const usePan = isMobile || isTouchLike || isMiddleButton;

    if (usePan) {
      // 두 번째 손가락이 닿으면 확대/축소로 전환
      const pinch = pinchRef.current;
      pinch.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.pointers.size === 2) {
        const [a, b] = Array.from(pinch.pointers.values()) as Array<{ x: number; y: number }>;
        pinch.startDistance = Math.hypot(a.x - b.x, a.y - b.y);
        pinch.startZoom = zoom;
        panSessionRef.current = null;
        setIsPanning(false);
        setIsPinching(true);
        return;
      }

      e.preventDefault();
      panSessionRef.current = {
        pointerId: e.pointerId,
        originClientX: e.clientX,
        originClientY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        moved: false
      };
      setIsPanning(true);
      return;
    }

    e.preventDefault();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    selectionSessionRef.current = {
      pointerId: e.pointerId,
      originClientX: e.clientX,
      originClientY: e.clientY,
      additive: e.ctrlKey || e.metaKey,
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

  /* -------------------------------------------------- 화면 이동 / 확대·축소 */
  useEffect(() => {
    if (!isPanning && !isPinching) return;

    const handleMove = (e: PointerEvent) => {
      const pinch = pinchRef.current;
      if (pinch.pointers.has(e.pointerId)) {
        pinch.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (isPinching && pinch.pointers.size >= 2) {
        const [a, b] = Array.from(pinch.pointers.values()) as Array<{ x: number; y: number }>;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch.startDistance > 0) {
          zoomAt(
            pinch.startZoom * (distance / pinch.startDistance),
            (a.x + b.x) / 2,
            (a.y + b.y) / 2
          );
        }
        return;
      }

      const session = panSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      const dx = e.clientX - session.originClientX;
      const dy = e.clientY - session.originClientY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) session.moved = true;
      setPan({ x: session.startPanX + dx, y: session.startPanY + dy });
    };

    const stop = (e: PointerEvent) => {
      const pinch = pinchRef.current;
      pinch.pointers.delete(e.pointerId);

      if (isPinching) {
        if (pinch.pointers.size < 2) {
          pinch.startDistance = 0;
          setIsPinching(false);
        }
        return;
      }

      const session = panSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      // 움직이지 않았으면 단순 탭 → 선택 해제
      if (!session.moved && e.type !== 'pointercancel') onSelectToken(null);

      panSessionRef.current = null;
      setIsPanning(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, [isPanning, isPinching, onSelectToken, zoomAt]);

  /* ------------------------------------------- PC 드래그 선택 박스 진행/종료 */
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

      const moved =
        Math.hypot(e.clientX - session.originClientX, e.clientY - session.originClientY) >
        DRAG_THRESHOLD_PX;

      if (!moved) {
        if (!session.additive) onSelectToken(null);
      } else {
        const left = Math.min(session.originClientX, e.clientX);
        const right = Math.max(session.originClientX, e.clientX);
        const top = Math.min(session.originClientY, e.clientY);
        const bottom = Math.max(session.originClientY, e.clientY);

        const hitIds = tokens
          .filter((token) => {
            const rect = document
              .getElementById('magnet-' + token.id)
              ?.getBoundingClientRect();
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
          session.additive ? Array.from(new Set([...session.initialSelection, ...hitIds])) : hitIds
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

  /** 휠 확대/축소 - 표시 배율을 정확히 2%p씩 바꾸고 항상 화면 중앙 유지 */
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    const nextScale = Math.max(0.02, scale + (e.deltaY < 0 ? 0.02 : -0.02));
    zoomAt(nextScale / fitScale);
  };

  /* ------------------------------------ '위치 확인' 시 해당 모형을 화면 중앙에 */
  useEffect(() => {
    if (!focusTokenId) return;

    const token = tokens.find((t) => t.id === focusTokenId);
    if (token && viewport.width > 0) {
      const targetScale = fitScale * zoom;
      setPan({
        x: viewport.width / 2 - (token.x / 100) * boardWidth * targetScale,
        y: viewport.height / 2 - (token.y / 100) * boardHeight * targetScale
      });
    }

    const timer = window.setTimeout(onFocusHandled, 1800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTokenId]);

  /* --------------------------------------------------------------- 검색 */
  const query = searchFilter.trim().toLowerCase();
  const isSearching = query.length > 0;

  const matchesSearch = (t: MagnetToken) =>
    isSearching &&
    (t.title.toLowerCase().includes(query) ||
      (t.subtitle ? t.subtitle.toLowerCase().includes(query) : false) ||
      (t.phone ? t.phone.includes(query) : false));

  const matchCount = isSearching ? tokens.filter(matchesSearch).length : 0;
  const activeZoneId = preview?.kind === 'zone' ? preview.id : null;

  const actionButtonClass = isMobile
    ? 'px-2.5 py-2 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1 whitespace-nowrap shrink-0'
    : 'px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0';

  return (
    <div className="relative flex-1 w-full h-full overflow-hidden bg-stone-200/90 flex flex-col select-none">
      {/* 상단 상태 배지 */}
      <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 z-30 flex items-start justify-between gap-2 pointer-events-none">
        <div
          hidden={isBoardOnly}
          className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-white/90 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-stone-200 shadow-md text-[11px] sm:text-xs font-semibold text-stone-700 whitespace-nowrap max-w-[calc(100%-6rem)] overflow-hidden">
          <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500 inline-block shrink-0" />
          <span className="text-stone-900 font-bold hidden xs:inline sm:inline">실시간 보드</span>
          <span className="text-stone-300 hidden sm:inline">|</span>
          <span>
            모형 <strong className="text-blue-600 font-extrabold">{tokens.length}</strong>
          </span>
          <span className="text-stone-300">|</span>
          <span>
            구역 <strong className="text-amber-600 font-extrabold">{zones.length}</strong>
          </span>
          {isSearching && (
            <>
              <span className="text-stone-300">|</span>
              <span className="flex items-center gap-1 text-blue-700">
                <Search className="w-3 h-3 shrink-0" />
                <strong className="font-extrabold">{matchCount}</strong>
              </span>
            </>
          )}
        </div>

        {/* 전체 보기에서도 모바일 복귀와 화면 조절을 위해 우측 컨트롤은 유지한다. */}
        <div className="pointer-events-auto flex items-center gap-0.5 backdrop-blur-md rounded-xl shrink-0 ml-auto bg-white/90 p-1 border border-stone-200 shadow-md">
          <button
            type="button"
            onClick={() => zoomAt(zoom / 1.2)}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="축소"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span
            className="text-[10px] sm:text-[11px] font-mono font-bold text-stone-700 w-9 sm:w-11 text-center"
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomAt(zoom * 1.2)}
            className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            title="확대"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {isMobile && <>
            <div className="w-px h-4 bg-stone-200 mx-0.5" />
            <button type="button" onClick={() => onMobileOrientationChange('portrait')} aria-pressed={settings.mobileOrientation === 'portrait'} className={`px-2 py-1.5 text-[10px] font-extrabold rounded-lg transition-colors ${settings.mobileOrientation === 'portrait' ? 'bg-blue-600 text-white' : 'text-stone-600 hover:bg-blue-50'}`} title="모바일 세로 보기">세로</button>
            <button type="button" onClick={() => onMobileOrientationChange('landscape')} aria-pressed={settings.mobileOrientation === 'landscape'} className={`px-2 py-1.5 text-[10px] font-extrabold rounded-lg transition-colors ${settings.mobileOrientation === 'landscape' ? 'bg-blue-600 text-white' : 'text-stone-600 hover:bg-blue-50'}`} title="모바일 가로 보기">가로</button>
          </>}
          <button
            type="button"
            onClick={resetView}
            className="p-1.5 text-stone-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="화면에 맞추기"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-stone-200 mx-0.5" />

          <button
            type="button"
            onClick={onToggleBoardOnly}
            className={`p-1.5 rounded-lg transition-colors ${isBoardOnly ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-stone-600 hover:text-blue-600 hover:bg-blue-50'}`}
            title={isBoardOnly ? '전체 보기 종료 · 메뉴 다시 보기' : '대시보드만 보기'}
          >
            {isBoardOnly ? <Minimize2 className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 보드 영역 (배경 고정) */}
      <div
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        onDoubleClick={handleCanvasDoubleClick}
        onWheel={handleWheel}
        className={`whiteboard-bg flex-1 w-full h-full overflow-hidden relative ${
          isPanning
            ? 'cursor-grabbing'
            : isMobile
            ? 'cursor-grab'
            : isSelecting
            ? 'cursor-crosshair'
            : 'cursor-default'
        }`}
        style={{ touchAction: isMobile ? 'none' : 'manipulation' }}
      >
        <div
          ref={boardRef}
          style={{
            width: `${boardWidth}px`,
            height: `${boardHeight}px`,
            backgroundColor: settings.boardBackground || '#f8fafc',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isPanning || isPinching || isDragging ? 'none' : 'transform 0.12s ease-out'
          }}
          className={`absolute top-0 left-0 ${
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

          {/* 2. 모형 */}
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

        {/* PC 드래그 선택 박스 */}
        {selectionBox && (
          <div
            className="absolute z-40 pointer-events-none border-2 border-blue-500 bg-blue-400/15 rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
            style={selectionBox}
          />
        )}
      </div>

      {/* 하단 퀵 액션 */}
      <div hidden={isBoardOnly} className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-2 sm:px-4 py-1.5 sm:py-2 rounded-2xl border border-stone-200 shadow-xl max-w-[calc(100%-1rem)] overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={onAddNewMagnet}
          className={`${actionButtonClass} text-white bg-blue-600 hover:bg-blue-700 shadow-xs`}
          title="새 모형 추가"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{isMobile ? '모형' : '새 모형 추가'}</span>
        </button>

        <button
          type="button"
          onClick={onAddNewZone}
          className={`${actionButtonClass} text-white bg-amber-600 hover:bg-amber-700 shadow-xs`}
          title="새 구역 추가"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{isMobile ? '구역' : '구역 추가'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenMagnetManager}
          className={`${actionButtonClass} text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200`}
          title="모형 목록 선택 및 속성 일괄 수정"
        >
          <ListChecks className="w-4 h-4 shrink-0" />
          <span>모형 관리</span>
        </button>

        <button
          type="button"
          onClick={onOpenZoneManager}
          className={`${actionButtonClass} text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200`}
          title="전체 구역 생성·삭제 및 일괄 관리"
        >
          <LayoutList className="w-4 h-4 shrink-0" />
          <span>구역 관리</span>
        </button>

        <div className="h-6 w-px bg-stone-300 mx-0.5 sm:mx-1 shrink-0" />

        <button
          type="button"
          onClick={onOpenRosterSheet}
          className={`${actionButtonClass} text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200`}
          title="모형과 독립된 시공기사 원장 관리"
        >
          <Users className="w-4 h-4 shrink-0" />
          <span>{isMobile ? '기사' : '시공기사 명단'}</span>
        </button>

        {!isMobile && (
          <div className="hidden lg:flex items-center gap-1 pl-2 ml-1 border-l border-stone-200 text-[11px] text-stone-500 font-medium whitespace-nowrap shrink-0">
            <MousePointer2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>배경 드래그로 범위 선택 · Ctrl+클릭 다중 선택 · Ctrl+A 구역 전체 · 휠/가운데버튼으로 확대·이동</span>
          </div>
        )}
      </div>

      {/* 모바일 조작 안내 */}
      {isMobile && !isBoardOnly && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-1 bg-stone-900/70 text-white text-[10px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
          <Hand className="w-3 h-3 shrink-0" />
          <span>한 손가락으로 화면 이동 · 두 손가락으로 확대</span>
        </div>
      )}
    </div>
  );
};
