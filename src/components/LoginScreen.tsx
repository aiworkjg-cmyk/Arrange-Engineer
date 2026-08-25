import React, { useState } from 'react';
import { HardHat, LogIn, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';

interface LoginScreenProps {
  dashboardTitle: string;
  companyName: string;
  onLogin: (loginId: string, password: string) => Promise<string | null>;
  onClose?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  dashboardTitle,
  companyName,
  onLogin,
  onClose
}) => {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setSubmitting(true);
    const loginError = await onLogin(loginId.trim(), password);
    setSubmitting(false);
    if (loginError) setError(loginError);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm overflow-y-auto">
      {/* 배경 장식 */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {onClose && (
          <button type="button" onClick={onClose} aria-label="로그인창 닫기" className="absolute right-3 top-3 z-10 p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100">
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="px-6 pt-7 pb-5 text-center border-b border-stone-100">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg">
            <HardHat className="w-7 h-7" strokeWidth={2.4} />
          </div>
          <h1 className="mt-3 text-lg font-extrabold text-stone-900 whitespace-nowrap">
            {dashboardTitle}
          </h1>
          {companyName && (
            <p className="mt-0.5 text-xs text-stone-500 whitespace-nowrap">{companyName}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 whitespace-nowrap">
              아이디
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1 whitespace-nowrap">
              비밀번호
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-3 py-2.5 pr-10 text-sm rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700"
                title={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 mt-1 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <LogIn className="w-4 h-4 shrink-0" />
            <span>{submitting ? '확인 중...' : '로그인'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
