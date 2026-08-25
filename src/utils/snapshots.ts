import { BoardSnapshot, BoardState } from '../types';

const SNAPSHOT_PREFIX = 'magnet_board_layouts_';
const MAX_SNAPSHOTS = 30;

function key(userId: string): string {
  return `${SNAPSHOT_PREFIX}${userId}`;
}

/** 저장된 배치표 목록 (최신순) */
export function listSnapshots(userId: string): BoardSnapshot[] {
  try {
    const saved = localStorage.getItem(key(userId));
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && s.id && s.state);
  } catch (e) {
    console.error('Failed to load layouts', e);
    return [];
  }
}

function persist(userId: string, snapshots: BoardSnapshot[]): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(snapshots.slice(0, MAX_SNAPSHOTS)));
  } catch (e) {
    console.error('Failed to save layouts', e);
  }
}

/** 클라우드에서 불러온 배치표 목록으로 로컬 캐시를 교체한다. */
export function replaceSnapshots(userId: string, snapshots: BoardSnapshot[]): void {
  persist(userId, Array.isArray(snapshots) ? snapshots : []);
}

/** 현재 배치표를 새 이름으로 저장 */
export function saveSnapshot(
  userId: string,
  name: string,
  state: BoardState,
  savedBy: string
): BoardSnapshot[] {
  const snapshot: BoardSnapshot = {
    id: `layout-${Date.now()}`,
    name: name.trim() || defaultSnapshotName(),
    savedAt: new Date().toISOString(),
    savedBy,
    tokenCount: state.tokens.length,
    zoneCount: state.zones.length,
    state: JSON.parse(JSON.stringify(state))
  };

  const next = [snapshot, ...listSnapshots(userId)];
  persist(userId, next);
  return next.slice(0, MAX_SNAPSHOTS);
}

/** 기존 배치표에 현재 상태를 덮어쓴다 */
export function overwriteSnapshot(
  userId: string,
  snapshotId: string,
  state: BoardState,
  savedBy: string
): BoardSnapshot[] {
  const next = listSnapshots(userId).map((s) =>
    s.id === snapshotId
      ? {
          ...s,
          savedAt: new Date().toISOString(),
          savedBy,
          tokenCount: state.tokens.length,
          zoneCount: state.zones.length,
          state: JSON.parse(JSON.stringify(state))
        }
      : s
  );
  persist(userId, next);
  return next;
}

export function renameSnapshot(userId: string, snapshotId: string, name: string): BoardSnapshot[] {
  const next = listSnapshots(userId).map((s) =>
    s.id === snapshotId ? { ...s, name: name.trim() || s.name } : s
  );
  persist(userId, next);
  return next;
}

export function deleteSnapshot(userId: string, snapshotId: string): BoardSnapshot[] {
  const next = listSnapshots(userId).filter((s) => s.id !== snapshotId);
  persist(userId, next);
  return next;
}

/** 오늘 날짜 기준 기본 이름 */
export function defaultSnapshotName(): string {
  const now = new Date();
  const date = now.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/\.$/, '');
  const time = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time} 배치표`;
}

export function formatSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}
