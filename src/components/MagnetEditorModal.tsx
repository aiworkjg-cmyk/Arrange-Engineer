import React, { useState, useEffect } from 'react';
import { MagnetToken, MagnetShape, MagnetSize, MagnetStatus, MagnetFontStyle, BoardZone, SiteSettings, InstallerRole } from '../types';
import { SIZE_PRESET_PX, MIN_TOKEN_PX, MAX_TOKEN_PX, getTokenSizePx } from '../utils/layout';
import { Check, X, Phone, Maximize2 } from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface MagnetEditorModalProps {
  isOpen: boolean;
  token: Partial<MagnetToken> | null;
  zones: BoardZone[];
  settings: SiteSettings;
  onClose: () => void;
  onSave: (tokenData: Partial<MagnetToken>) => void;
}

const PRESET_COLORS = [
  { name: '클래식 아이보리(화이트보드)', hex: '#fef9c3', text: '#1c1917' },
  { name: '버터 옐로우', hex: '#fef08a', text: '#1c1917' },
  { name: '소프트 민트', hex: '#bbf7d0', text: '#14532d' },
  { name: '스카이 블루', hex: '#bae6fd', text: '#0c4a6e' },
  { name: '코랄 핑크', hex: '#fecdd3', text: '#881337' },
  { name: '라벤더 퍼플', hex: '#e9d5ff', text: '#581c87' },
  { name: '피치 오렌지', hex: '#fed7aa', text: '#7c2d12' },
  { name: '슬레이트 그레이', hex: '#e2e8f0', text: '#1e293b' },
  { name: '에메랄드 그린', hex: '#6ee7b7', text: '#064e3b' },
  { name: '딥 네이비', hex: '#bfdbfe', text: '#1e3a8a' },
  { name: '다크 옵시디언', hex: '#334155', text: '#f8fafc' },
  { name: '로열 골드', hex: '#fde047', text: '#713f12' }
];

export const MagnetEditorModal: React.FC<MagnetEditorModalProps> = ({
  isOpen,
  token,
  zones,
  settings,
  onClose,
  onSave
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState<InstallerRole>('부사수');
  const [phone, setPhone] = useState('');
  const [shape, setShape] = useState<MagnetShape>('circle');
  const [color, setColor] = useState('#fef9c3');
  const [textColor, setTextColor] = useState('#1c1917');
  const [size, setSize] = useState<MagnetSize>('md');
  const [sizePx, setSizePx] = useState<number>(SIZE_PRESET_PX.md);
  const [fontStyle, setFontStyle] = useState<MagnetFontStyle>('handwriting');
  const [status, setStatus] = useState<MagnetStatus>('assigned');
  const [zoneId, setZoneId] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (token) {
      setTitle(token.title || '');
      setSubtitle(['팀장', '사수', '부사수'].includes(token.subtitle || '') ? token.subtitle as InstallerRole : '부사수');
      setPhone(token.phone || '');
      setShape(token.shape || 'circle');
      setColor(token.color || '#fef9c3');
      setTextColor(token.textColor || '#1c1917');
      setSize(token.size || 'md');
      setSizePx(getTokenSizePx({ size: token.size || 'md', sizePx: token.sizePx }));
      setFontStyle(token.fontStyle || 'handwriting');
      setStatus(token.status || 'assigned');
      setZoneId(token.zoneId || '');
      setNotes(token.notes || '');
    } else {
      // Defaults for new magnet
      setTitle('');
      setSubtitle('부사수');
      setPhone('');
      setShape('circle');
      setColor(settings.defaultMagnetColor);
      setTextColor('#1c1917');
      setSize(settings.defaultMagnetSize);
      setSizePx(SIZE_PRESET_PX[settings.defaultMagnetSize]);
      setFontStyle(settings.defaultFontStyle);
      setStatus('assigned');
      setZoneId(zones[0]?.id || '');
      setNotes('');
    }
  }, [token, zones, isOpen, settings]);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('모형(인원/라벨) 이름을 입력해주세요.');
      return;
    }

    onSave({
      id: token?.id,
      title: title.trim(),
      subtitle,
      phone: phone.trim() || undefined,
      shape,
      color,
      textColor,
      size,
      sizePx,
      fontStyle,
      status,
      zoneId: zoneId || undefined,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
              🏷️
            </div>
            <div>
              <h3 className="font-bold text-stone-800 text-base">
                {token?.id ? '모형 및 인원 속성 수정' : '새 마그넷 모형 추가'}
              </h3>
              <p className="text-xs text-stone-500">
                형태, 색상, 크기, 텍스트를 자유롭게 변경할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar space-y-4">
          {/* Live Preview of Magnet */}
          <div className="p-4 bg-stone-100/70 rounded-xl border border-stone-200/70 flex flex-col items-center justify-center gap-2">
            <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              실시간 모형 미리보기
            </div>
            <div
              style={{
                backgroundColor: color,
                color: textColor,
                width:
                  shape === 'rounded-rect' || shape === 'pill'
                    ? `${Math.round(sizePx * 1.3)}px`
                    : `${sizePx}px`,
                height: `${sizePx}px`
              }}
              className={`relative flex flex-col items-center justify-center border-2 border-stone-300/80 shadow-lg ${
                shape === 'circle'
                  ? 'rounded-full'
                  : shape === 'rounded-rect'
                  ? 'rounded-2xl px-2'
                  : shape === 'pill'
                  ? 'rounded-full px-3'
                  : shape === 'hexagon'
                  ? 'rounded-lg [clip-path:polygon(50%_0%,_100%_25%,_100%_75%,_50%_100%,_0%_75%,_0%_25%)]'
                  : 'rounded-xl'
              } overflow-hidden transition-all`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/10 pointer-events-none" />
              <span
                className={`font-bold leading-tight drop-shadow-[0_0.5px_0.5px_rgba(255,255,255,0.8)] truncate max-w-[85px] ${
                  fontStyle === 'handwriting'
                    ? 'font-handwriting text-base'
                    : fontStyle === 'dodum'
                    ? 'font-dodum text-sm'
                    : 'font-sans text-sm'
                }`}
              >
                {title || '이름/라벨'}
              </span>
              {subtitle && (
                <span className="text-[10px] opacity-80 leading-none mt-0.5 truncate max-w-[75px]">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* 1. Name & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                이름 / 라벨 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 김정환, 톱날가공조"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                직책 / 부서 / 역할
              </label>
              <select
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value as InstallerRole)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="팀장">팀장</option>
                <option value="사수">사수</option>
                <option value="부사수">부사수</option>
              </select>
            </div>
          </div>

          {/* Contact phone */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-stone-400" />
              연락처 (선택)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-8533-4084"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 2. Shape Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              모형 형태 (Shape)
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'circle', label: '원형 자석', icon: '⭕' },
                { id: 'rounded-rect', label: '라운드 사각', icon: '🔲' },
                { id: 'pill', label: '타원형 뱃지', icon: '💊' },
                { id: 'hexagon', label: '육각형', icon: '⬡' },
                { id: 'square', label: '정사각', icon: '⏹️' }
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShape(s.id as MagnetShape)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs font-medium transition-all ${
                    shape === s.id
                      ? 'border-blue-600 bg-blue-50/80 text-blue-800 shadow-xs ring-1 ring-blue-500'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                  }`}
                >
                  <span className="text-base mb-0.5">{s.icon}</span>
                  <span className="text-[11px] truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Color Palette */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5 flex items-center justify-between">
              <span>색상 테마 (Color)</span>
              <span className="text-[11px] text-stone-400 font-mono">{color}</span>
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    setColor(c.hex);
                    setTextColor(c.text);
                  }}
                  title={c.name}
                  style={{ backgroundColor: c.hex }}
                  className={`h-8 rounded-lg border flex items-center justify-center shadow-xs transition-transform ${
                    color.toLowerCase() === c.hex.toLowerCase()
                      ? 'scale-110 ring-2 ring-stone-900 border-stone-800'
                      : 'border-stone-300 hover:scale-105'
                  }`}
                >
                  {color.toLowerCase() === c.hex.toLowerCase() && (
                    <Check
                      className="w-4 h-4 drop-shadow-sm"
                      style={{ color: c.text }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Size & Font Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                크기 (Size)
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['sm', 'md', 'lg', 'xl'] as MagnetSize[]).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      setSize(sz);
                      setSizePx(SIZE_PRESET_PX[sz]);
                    }}
                    className={`py-1.5 text-xs font-medium rounded-lg border text-center transition-all whitespace-nowrap ${
                      sizePx === SIZE_PRESET_PX[sz]
                        ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                        : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    {sz.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Maximize2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <input
                  type="range"
                  min={MIN_TOKEN_PX}
                  max={MAX_TOKEN_PX}
                  step={2}
                  value={sizePx}
                  onChange={(e) => setSizePx(Number(e.target.value))}
                  className="flex-1 min-w-0 accent-blue-600"
                />
                <span className="text-[11px] font-mono font-bold text-stone-600 w-12 text-right shrink-0">
                  {sizePx}px
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                폰트 서체 (Font)
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'handwriting', label: '손글씨 마커' },
                  { id: 'dodum', label: '돋움체' },
                  { id: 'sans', label: '고딕체' }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFontStyle(f.id as MagnetFontStyle)}
                    className={`py-1.5 text-[11px] font-medium rounded-lg border text-center transition-all ${
                      fontStyle === f.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Zone & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                배정 구역 (Zone)
              </label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">미지정 (자유 배치)</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code ? `[${z.code}] ` : ''}{z.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                현재 상태 (Status)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MagnetStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="active">🟢 활성 / 작업중</option>
                <option value="assigned">🔵 배정 완료</option>
                <option value="waiting">🟠 현장 대기</option>
                <option value="break">🟣 휴식 중</option>
                <option value="done">⚪ 작업 완료</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              메모 및 특이사항 (선택)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="작업 내용, 장비 번호, 일정 특이사항 등을 기록하세요."
              className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
            >
              저장 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
