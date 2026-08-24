import React, { useState } from 'react';
import { MagnetToken, BoardZone, SiteSettings } from '../types';
import { Phone, Search, X, UserPlus } from 'lucide-react';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface RosterSheetModalProps {
  isOpen: boolean;
  tokens: MagnetToken[];
  zones: BoardZone[];
  settings: SiteSettings;
  onClose: () => void;
  onSelectToken: (tokenId: string) => void;
  onAddNewMember: (name: string, phone: string, role: string) => void;
}

export const RosterSheetModal: React.FC<RosterSheetModalProps> = ({
  isOpen,
  tokens,
  zones,
  settings,
  onClose,
  onSelectToken,
  onAddNewMember
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('');

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const filteredTokens = tokens.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.subtitle && t.subtitle.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.phone && t.phone.includes(searchTerm))
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddNewMember(newName.trim(), newPhone.trim(), newRole.trim() || '시공인원');
    setNewName('');
    setNewPhone('');
    setNewRole('');
    setShowAddForm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paper style header inspired by the photo's attached sheet */}
        <div className="p-5 border-b border-stone-200 bg-amber-50/60 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-black text-lg shadow-xs">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="font-extrabold text-stone-900 text-base sm:text-lg truncate whitespace-nowrap">
                  {settings.rosterTitle}
                </h3>
                {settings.companyName && (
                  <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded whitespace-nowrap shrink-0">
                    {settings.companyName}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-1 whitespace-nowrap">
                등록 기사 {tokens.length}명 · 운영 구역 {zones.length}개
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

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-stone-100 bg-stone-50 flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 직책, 연락처 검색..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-stone-500 font-medium">
              총 {tokens.length}명 등록됨
            </span>
            <button
              onClick={() => setShowAddForm(prev => !prev)}
              className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? '닫기' : '명단 인원 추가'}</span>
            </button>
          </div>
        </div>

        {/* Quick Add Form */}
        {showAddForm && (
          <form onSubmit={handleAddSubmit} className="p-4 bg-blue-50/50 border-b border-blue-100 flex flex-wrap items-center gap-2 text-xs animate-in slide-in-from-top-2 duration-150">
            <input
              type="text"
              placeholder="이름 *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="연락처 (010-...)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="직책/역할"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              추가 & 보드에 자석 배치
            </button>
          </form>
        )}

        {/* Table View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
                  <th className="py-2.5 px-3 text-center w-12">No.</th>
                  <th className="py-2.5 px-3">이름 (성명)</th>
                  <th className="py-2.5 px-3">직책 / 역할</th>
                  <th className="py-2.5 px-3">연락처</th>
                  <th className="py-2.5 px-3">배정 구역</th>
                  <th className="py-2.5 px-3 text-center">상태</th>
                  <th className="py-2.5 px-3 text-right">보드 이동</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTokens.map((t, idx) => {
                  const zone = zones.find(z => z.id === t.zoneId);
                  return (
                    <tr key={t.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="py-2.5 px-3 text-center text-stone-400 font-mono">
                        {t.orderNumber || idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-stone-900 flex items-center gap-2">
                        <span
                          style={{ backgroundColor: t.color }}
                          className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs inline-block shrink-0"
                        />
                        <span>{t.title}</span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 font-medium">
                        {t.subtitle || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 font-mono">
                        {t.phone ? (
                          <a
                            href={`tel:${t.phone}`}
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" />
                            {t.phone}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {zone ? (
                          <span
                            style={{ borderColor: zone.borderColor }}
                            className="px-2 py-0.5 rounded text-[11px] font-semibold border bg-white text-stone-800 inline-block shadow-2xs"
                          >
                            {zone.title}
                          </span>
                        ) : (
                          <span className="text-stone-400">자유배치</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : t.status === 'assigned'
                              ? 'bg-blue-100 text-blue-700'
                              : t.status === 'waiting'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {t.status === 'active'
                            ? '작업중'
                            : t.status === 'assigned'
                            ? '배정됨'
                            : t.status === 'waiting'
                            ? '대기'
                            : '완료'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            onSelectToken(t.id);
                            onClose();
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-stone-800 hover:bg-blue-600 rounded-md transition-colors shadow-2xs"
                        >
                          위치 확인
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
