import React, { useState } from 'react';
import { UserAccount } from '../types';
import { UserCheck, LogIn, UserPlus, Shield, Check, X, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  users: UserAccount[];
  activeUserId: string;
  onClose: () => void;
  onSelectUser: (user: UserAccount) => void;
  onCreateNewUser: (newUser: Omit<UserAccount, 'id'>) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  users,
  activeUserId,
  onClose,
  onSelectUser,
  onCreateNewUser
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserAccount['role']>('작업자');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    onCreateNewUser({
      name: name.trim(),
      email: email.trim() || `${Date.now()}@sample.local`,
      role,
      phone: phone.trim() || undefined,
      department: department.trim() || '현장 시공팀',
      avatarColor: randomColor
    });

    setName('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setIsRegistering(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-100 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                {isRegistering ? '새 현장 계정 생성' : '계정 로그인 및 사용자 전환'}
              </h3>
              <p className="text-xs text-stone-500">
                로그인하면 본인의 배정 일정 및 작업 이력을 자동으로 기억합니다.
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

        {/* Content */}
        <div className="p-5 space-y-4">
          {!isRegistering ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-stone-600 flex items-center justify-between">
                <span>빠른 로그인 (원클릭 계정 선택)</span>
                <button
                  onClick={() => setIsRegistering(true)}
                  className="text-blue-600 hover:underline font-bold"
                >
                  ➕ 새 계정 등록
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                {users.map((u) => {
                  const isCurrent = u.id === activeUserId;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelectUser(u);
                        onClose();
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                          : 'border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{ backgroundColor: u.avatarColor || '#3b82f6' }}
                          className="w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-sm shadow-xs"
                        >
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-stone-900 text-sm">{u.name}</span>
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-stone-100 text-stone-700">
                              {u.role}
                            </span>
                          </div>
                          <div className="text-xs text-stone-500">
                            {u.department || '현장 시공팀'}{u.phone ? ` • ${u.phone}` : ''}
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-100/70 px-2 py-1 rounded-lg">
                          <Check className="w-3.5 h-3.5" />
                          <span>현재 접속중</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  이름 / 성명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    직책 / 역할
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="작업자">작업자</option>
                    <option value="시공반장">시공반장</option>
                    <option value="현장소장">현장소장</option>
                    <option value="대표">대표</option>
                    <option value="게스트">게스트</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    연락처
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  소속 부서 / 조
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="예: 1구역 전단 5조"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  계정 생성 & 바로 로그인
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
