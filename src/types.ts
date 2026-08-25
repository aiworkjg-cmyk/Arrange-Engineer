export type MagnetShape = 'circle' | 'rounded-rect' | 'hexagon' | 'pill' | 'square';

export type MagnetSize = 'sm' | 'md' | 'lg' | 'xl';

export type MagnetStatus = 'active' | 'assigned' | 'waiting' | 'break' | 'done';

export type MagnetFontStyle = 'handwriting' | 'sans' | 'dodum';

export type InstallerRole = '' | '팀장' | '사수' | '부사수';

export type InstallerStatus = '' | 'available' | 'assigned' | 'leave' | 'inactive';

/**
 * 시공기사 원장. 보드의 MagnetToken과는 별도로 관리한다.
 * 같은 이름의 모형이 없어도 기사는 존재할 수 있고, 반대도 가능하다.
 */
export interface InstallerProfile {
  id: string;
  name: string;
  role: InstallerRole;
  status: InstallerStatus;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  birthDate?: string;
  joinedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MagnetToken {
  id: string;
  title: string;
  subtitle?: string;
  phone?: string;
  shape: MagnetShape;
  color: string;
  textColor: string;
  borderColor?: string;
  size: MagnetSize;
  /** 가장자리 드래그로 조절한 실제 지름(px). 없으면 size 프리셋을 따른다. */
  sizePx?: number;
  x: number; // percentage (0 - 100) or px based on canvas
  y: number; // percentage (0 - 100) or px based on canvas
  zoneId?: string;
  fontStyle: MagnetFontStyle;
  tags?: string[];
  notes?: string;
  status: MagnetStatus;
  orderNumber?: number;
  assignedUserId?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface BoardZone {
  id: string;
  title: string;
  code?: string;
  subtitle?: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  width: number; // percentage (0 - 100)
  height: number; // percentage (0 - 100)
  bgColor: string;
  borderColor: string;
  headerColor: string;
  maxCapacity?: number;
  description?: string;
}

export interface ScheduleItem {
  id: string;
  /** 기사 일정 또는 저장된 배치표 일정 */
  kind?: 'installer' | 'layout';
  userId?: string;
  userName: string;
  title: string;
  date: string;
  /** 여러 날짜에 걸친 일정의 종료일. 없으면 date 당일 일정이다. */
  endDate?: string;
  timeRange: string;
  zoneId?: string;
  zoneName: string;
  role: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  location: string;
  notes?: string;
  snapshotId?: string;
  snapshotName?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  userEmail?: string;
  action: 'create' | 'move' | 'update' | 'delete' | 'schedule_change' | 'import' | 'status_change';
  targetName: string;
  description: string;
  fromZone?: string;
  toZone?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: '대표' | '현장소장' | '시공반장' | '작업자' | '게스트';
  phone?: string;
  avatarColor: string;
  assignedMagnetId?: string;
  department?: string;
  /** 로그인 아이디 (마스터 계정은 'admin') */
  loginId?: string;
  /** 로그인 비밀번호 (로컬 전용 데모 계정 체계) */
  password?: string;
  /** 마스터(관리자) 계정 여부 - 계정 추가/삭제 권한 */
  isMaster?: boolean;
}

/** 화면에 그려진 보드의 실제 픽셀 크기 (퍼센트 <-> 픽셀 변환용) */
export interface BoardMetrics {
  width: number;
  height: number;
}

/** 저장된 배치표 스냅샷 */
export interface BoardSnapshot {
  id: string;
  name: string;
  savedAt: string;
  savedBy: string;
  tokenCount: number;
  zoneCount: number;
  state: BoardState;
}

/** 사이트 전반 설정 (설정 관리 창에서 변경) */
export interface SiteSettings {
  dashboardTitle: string;
  companyName: string;
  rosterTitle: string;
  showGrid: boolean;
  showZoneCapacity: boolean;
  showZoneSubtitle: boolean;
  showStatusDot: boolean;
  showTokenSubtitle: boolean;
  searchHighlight: 'pulse' | 'bounce' | 'glow';
  defaultMagnetSize: MagnetSize;
  defaultMagnetColor: string;
  defaultFontStyle: MagnetFontStyle;
  confirmOnDelete: boolean;
  keepInsideZone: boolean;
}

/** 구역의 위치/크기 (보드 대비 % 단위) */
export interface ZoneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoardState {
  version: number;
  title: string;
  lastSavedAt: string;
  lastSavedBy?: string;
  tokens: MagnetToken[];
  zones: BoardZone[];
  installers: InstallerProfile[];
  schedules: ScheduleItem[];
  logs: ActivityLog[];
  rosterTitle?: string;
}
