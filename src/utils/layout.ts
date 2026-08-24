import { BoardMetrics, BoardZone, MagnetToken, MagnetSize } from '../types';

/** 크기 프리셋별 기본 지름(px) */
export const SIZE_PRESET_PX: Record<MagnetSize, number> = {
  sm: 50,
  md: 66,
  lg: 82,
  xl: 98
};

export const MIN_TOKEN_PX = 36;
export const MAX_TOKEN_PX = 170;

/** 구역 헤더(제목 줄) 높이(px) - 모형이 이 영역을 덮지 않도록 한다 */
const ZONE_HEADER_PX = 34;
/** 구역 부제목 줄 높이(px) */
const ZONE_SUBTITLE_PX = 20;
/** 구역 테두리 안쪽 여백(px) */
const ZONE_INNER_PAD_PX = 8;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round1 = (n: number) => Number(n.toFixed(1));

/** 모형의 실제 지름(px) */
export function getTokenSizePx(token: Pick<MagnetToken, 'size' | 'sizePx'>): number {
  const raw = token.sizePx ?? SIZE_PRESET_PX[token.size] ?? SIZE_PRESET_PX.md;
  return clamp(raw, MIN_TOKEN_PX, MAX_TOKEN_PX);
}

/** 가로로 긴 형태(라운드 사각 / 타원)는 폭이 1.3배 */
export function getTokenWidthPx(token: Pick<MagnetToken, 'size' | 'sizePx' | 'shape'>): number {
  const base = getTokenSizePx(token);
  return token.shape === 'rounded-rect' || token.shape === 'pill' ? base * 1.3 : base;
}

/**
 * 구역 안에서 모형이 놓일 수 있는 안전 영역(%).
 * 헤더/부제목/테두리를 피해 계산하므로 모형이 글자나 선 위에 겹치지 않는다.
 */
export function getZoneSafeArea(
  zone: BoardZone,
  metrics: BoardMetrics,
  hasSubtitle = !!zone.subtitle
) {
  const width = metrics.width || 1;
  const height = metrics.height || 1;

  const padX = (ZONE_INNER_PAD_PX / width) * 100;
  const padY = (ZONE_INNER_PAD_PX / height) * 100;
  const headerPct = ((ZONE_HEADER_PX + (hasSubtitle ? ZONE_SUBTITLE_PX : 0)) / height) * 100;

  const left = zone.x + padX;
  const right = zone.x + zone.width - padX;
  const top = zone.y + headerPct + padY;
  const bottom = zone.y + zone.height - padY;

  return {
    left,
    right,
    top,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  };
}

/**
 * 모형이 구역의 글자/테두리를 침범하지 않도록 중심 좌표를 보정한다.
 * 구역이 모형보다 좁으면 안전 영역의 중앙에 놓는다.
 */
export function clampTokenToZone(
  token: Pick<MagnetToken, 'size' | 'sizePx' | 'shape'>,
  zone: BoardZone,
  metrics: BoardMetrics,
  x: number,
  y: number
): { x: number; y: number } {
  const area = getZoneSafeArea(zone, metrics);
  const halfW = (getTokenWidthPx(token) / 2 / (metrics.width || 1)) * 100;
  const halfH = (getTokenSizePx(token) / 2 / (metrics.height || 1)) * 100;

  const minX = area.left + halfW;
  const maxX = area.right - halfW;
  const minY = area.top + halfH;
  const maxY = area.bottom - halfH;

  return {
    x: round1(minX > maxX ? (area.left + area.right) / 2 : clamp(x, minX, maxX)),
    y: round1(minY > maxY ? (area.top + area.bottom) / 2 : clamp(y, minY, maxY))
  };
}

/**
 * 구역 내부 모형들을 헤더/테두리를 피해 바둑판으로 정렬한다.
 * 모형 크기를 고려해 열 수를 정하므로 서로 겹치지 않는다.
 */
export function arrangeZoneTokens(
  zone: BoardZone,
  tokensInZone: MagnetToken[],
  metrics: BoardMetrics
): { id: string; x: number; y: number }[] {
  if (tokensInZone.length === 0) return [];

  const area = getZoneSafeArea(zone, metrics);
  const width = metrics.width || 1;
  const height = metrics.height || 1;
  const count = tokensInZone.length;

  const idealGapX = (10 / width) * 100;
  const idealGapY = (12 / height) * 100;

  const tokenW = tokensInZone.map((t) => (getTokenWidthPx(t) / width) * 100);
  const tokenH = tokensInZone.map((t) => (getTokenSizePx(t) / height) * 100);
  const maxW = Math.max(...tokenW);
  const maxH = Math.max(...tokenH);

  // 구역 안에 들어갈 수 있는 최대 행/열 수
  const maxCols = Math.max(1, Math.floor(area.width / (maxW + idealGapX)));
  const maxRows = Math.max(1, Math.floor(area.height / (maxH + idealGapY)));

  // 세로로 넘칠 것 같으면 열을 늘려 행 수를 줄인다
  let cols = Math.min(maxCols, count);
  if (Math.ceil(count / cols) > maxRows) {
    cols = Math.min(maxCols, Math.max(cols, Math.ceil(count / maxRows)));
  }
  const rows = Math.ceil(count / cols);

  // 행/열마다 실제로 필요한 크기를 계산해 빈 공간 없이 채운다
  const rowHeights: number[] = [];
  for (let r = 0; r < rows; r++) {
    const heights = tokensInZone
      .map((_, i) => (Math.floor(i / cols) === r ? tokenH[i] : 0))
      .filter((h) => h > 0);
    rowHeights.push(heights.length ? Math.max(...heights) : maxH);
  }

  const colWidths: number[] = [];
  for (let c = 0; c < cols; c++) {
    const widths = tokensInZone
      .map((_, i) => (i % cols === c ? tokenW[i] : 0))
      .filter((w) => w > 0);
    colWidths.push(widths.length ? Math.max(...widths) : maxW);
  }

  const sumRowH = rowHeights.reduce((a, b) => a + b, 0);
  const sumColW = colWidths.reduce((a, b) => a + b, 0);

  const gapY = rows > 1 ? clamp((area.height - sumRowH) / (rows - 1), 0, idealGapY) : 0;
  const gapX = cols > 1 ? clamp((area.width - sumColW) / (cols - 1), 0, idealGapX) : 0;

  const totalH = sumRowH + gapY * (rows - 1);
  const totalW = sumColW + gapX * (cols - 1);

  const startY = area.top + Math.max(0, (area.height - totalH) / 2);
  const startX = area.left + Math.max(0, (area.width - totalW) / 2);

  // 각 행/열의 중심 좌표를 미리 구해둔다
  const rowCenters: number[] = [];
  let y = startY;
  for (let r = 0; r < rows; r++) {
    rowCenters.push(y + rowHeights[r] / 2);
    y += rowHeights[r] + gapY;
  }

  const colCenters: number[] = [];
  let x = startX;
  for (let c = 0; c < cols; c++) {
    colCenters.push(x + colWidths[c] / 2);
    x += colWidths[c] + gapX;
  }

  return tokensInZone.map((token, index) => {
    const r = Math.floor(index / cols);
    const c = index % cols;
    const fitted = clampTokenToZone(token, zone, metrics, colCenters[c], rowCenters[r]);
    return { id: token.id, x: fitted.x, y: fitted.y };
  });
}
