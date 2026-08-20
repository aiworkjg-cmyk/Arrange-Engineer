export type MagnetShape = 'circle' | 'rounded-rect' | 'hexagon' | 'pill' | 'square';

export type MagnetSize = 'sm' | 'md' | 'lg' | 'xl';

export type MagnetStatus = 'active' | 'assigned' | 'waiting' | 'break' | 'done';

export type MagnetFontStyle = 'handwriting' | 'sans' | 'dodum';

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
  userId?: string;
  userName: string;
  title: string;
  date: string;
  timeRange: string;
  zoneId?: string;
  zoneName: string;
  role: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  location: string;
  notes?: string;
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
}

export interface BoardState {
  version: number;
  title: string;
  lastSavedAt: string;
  lastSavedBy?: string;
  tokens: MagnetToken[];
  zones: BoardZone[];
  schedules: ScheduleItem[];
  logs: ActivityLog[];
  rosterTitle?: string;
}
