import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { InstallAppButton } from '../../components/UI/InstallAppButton';

export function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const { success, error } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Enter your username and password.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      await login(username, password);
      success('Signed in.');
    } catch (err) {
      setErrorMsg(err.message || 'Sign in failed. Check your username and password.');
      error(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (u, p) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  };

  return (
    <div
      className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-5 py-12"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 48px)', paddingBottom: 'max(env(safe-area-inset-bottom), 48px)' }}
    >
      <div className="w-full max-w-[380px]">
        {/* Identity */}
        <div className="flex flex-col items-center text-center">
          <img src="./icons/icon-192.png" alt="" className="w-[72px] h-[72px] rounded-[18px] shadow-lg" />
          <h1 className="mt-5 text-[28px] font-bold tracking-[-0.028em] text-slate-900 leading-tight">Bharat Impex</h1>
          <p className="mt-1 text-[15px] text-slate-500 tracking-[-0.01em]">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          {/* Grouped inset fields */}
          <div className="bg-white rounded-[14px] shadow-xs overflow-hidden" style={{ boxShadow: '0 0 0 0.5px rgba(60,60,67,0.18), 0 1px 2px rgba(0,0,0,0.04)' }}>
            <label className="flex items-center gap-3 px-4 h-[50px]">
              <span className="sr-only">Username or email</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                className="flex-1 min-w-0 h-full bg-transparent !border-0 !shadow-none text-[16px] text-slate-900 placeholder:text-[#A1A1A6] focus:outline-none"
                required
              />
            </label>
            <div className="ml-4 h-px bg-black/[0.08]" aria-hidden="true" />
            <label className="flex items-center gap-2 pl-4 pr-1.5 h-[50px]">
              <span className="sr-only">Password</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="flex-1 min-w-0 h-full bg-transparent !border-0 !shadow-none text-[16px] text-slate-900 placeholder:text-[#A1A1A6] focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="w-10 h-10 flex items-center justify-center rounded-full text-[#8E8E93] hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
              </button>
            </label>
          </div>

          {errorMsg && (
            <p role="alert" className="flex items-start gap-2 px-1 text-[13px] text-[#D70015]">
              <AlertCircle className="w-4 h-4 mt-px shrink-0" aria-hidden="true" />
              <span>{errorMsg}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[50px] rounded-[14px] bg-[#007AFF] hover:bg-[#0A6CF0] active:bg-[#0062D6] disabled:opacity-60 text-white text-[17px] font-semibold tracking-[-0.02em] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : 'Sign In'}
          </button>
        </form>

        {/* Test accounts (development) */}
        <div className="mt-8">
          <p className="px-1 pb-2 text-[13px] text-slate-500">Test accounts</p>
          <div className="bg-white rounded-[14px] overflow-hidden" style={{ boxShadow: '0 0 0 0.5px rgba(60,60,67,0.18)' }}>
            {[['admin', 'admin123', 'Administrator'], ['operator', 'operator123', 'Shop Operator']].map(([u, p, label], i) => (
              <button
                key={u}
                type="button"
                onClick={() => fillCredentials(u, p)}
                className={`w-full flex items-center justify-between px-4 h-[46px] text-left hover:bg-black/[0.03] cursor-pointer ${i ? 'border-t border-black/[0.06]' : ''}`}
              >
                <span className="text-[15px] text-slate-900">{label}</span>
                <span className="text-[13px] text-slate-500 font-mono">{u}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <InstallAppButton className="h-9 px-4 rounded-full bg-black/[0.05] hover:bg-black/[0.08] text-[#007AFF] text-[13px]" />
        </div>
      </div>
    </div>
  );
}

export default Login;
