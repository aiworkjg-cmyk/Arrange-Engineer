import React, { useEffect, useState } from 'react';
import { BriefcaseBusiness, ContactRound, X } from 'lucide-react';
import { InstallerProfile, InstallerRole, InstallerStatus } from '../types';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface InstallerEditorModalProps {
  isOpen: boolean;
  installer: Partial<InstallerProfile> | null;
  onClose: () => void;
  onSave: (installer: Partial<InstallerProfile>) => void;
}

const ROLES: InstallerRole[] = ['', '팀장', '사수', '부사수'];
const STATUSES: Array<{ id: InstallerStatus; label: string }> = [
  { id: '', label: '미설정' },
  { id: 'available', label: '배정 가능' },
  { id: 'assigned', label: '배정 중' },
  { id: 'leave', label: '휴무' },
  { id: 'inactive', label: '비활성' }
];

const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelClass = 'block text-xs font-bold text-stone-700 mb-1';

export const InstallerEditorModal: React.FC<InstallerEditorModalProps> = ({
  isOpen,
  installer,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<InstallerRole>('');
  const [status, setStatus] = useState<InstallerStatus>('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [joinedDate, setJoinedDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName(installer?.name || '');
    setRole(installer?.role || '');
    setStatus(installer?.status || '');
    setPhone(installer?.phone || '');
    setEmail(installer?.email || '');
    setAddress(installer?.address || '');
    setEmergencyContact(installer?.emergencyContact || '');
    setBirthDate(installer?.birthDate || '');
    setJoinedDate(installer?.joinedDate || '');
    setNotes(installer?.notes || '');
  }, [installer, isOpen]);

  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: installer?.id,
      name: name.trim(),
      role,
      status,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      emergencyContact: emergencyContact.trim() || undefined,
      birthDate: birthDate || undefined,
      joinedDate: joinedDate || undefined,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/55 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="px-5 py-4 border-b border-stone-200 bg-blue-50/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <ContactRound className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-stone-900">
                {installer?.id ? '시공기사 상세 설정' : '새 시공기사 등록'}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                기사 원장 정보이며 보드 모형과 독립적으로 저장됩니다.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200">
            <X className="w-5 h-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          <section>
            <div className="flex items-center gap-2 mb-3 text-sm font-extrabold text-stone-900">
              <BriefcaseBusiness className="w-4 h-4 text-blue-600" /> 기본 정보
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>이름 *</label>
                <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} required autoFocus />
              </div>
              <div>
                <label className={labelClass}>직책</label>
                <select value={role} onChange={(event) => setRole(event.target.value as InstallerRole)} className={inputClass}>
                  {ROLES.map((item) => <option key={item || 'unset'} value={item}>{item || '미설정'}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>상태</label>
                <select value={status} onChange={(event) => setStatus(event.target.value as InstallerStatus)} className={inputClass}>
                  {STATUSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="pt-4 border-t border-stone-100">
            <h3 className="text-sm font-extrabold text-stone-900 mb-3">개인정보 및 연락처</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelClass}>연락처</label><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="010-0000-0000" className={inputClass} /></div>
              <div><label className={labelClass}>이메일</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className={inputClass} /></div>
              <div><label className={labelClass}>생년월일</label><input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>입사일</label><input type="date" value={joinedDate} onChange={(event) => setJoinedDate(event.target.value)} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>주소</label><input value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>비상 연락처</label><input value={emergencyContact} onChange={(event) => setEmergencyContact(event.target.value)} placeholder="관계 및 연락처" className={inputClass} /></div>
              <div className="sm:col-span-2"><label className={labelClass}>메모</label><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className={`${inputClass} resize-none`} /></div>
            </div>
          </section>

          <footer className="pt-4 border-t border-stone-100 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg">취소</button>
            <button type="submit" className="px-5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">{installer?.id ? '변경사항 저장' : '시공기사 등록'}</button>
          </footer>
        </form>
      </div>
    </div>
  );
};
