import React, { useState, useEffect } from 'react';

// ── Props từ LoginPage (kết nối với useAuthStore) ─────────────────────
interface AuthComponentProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (username: string, email: string, password: string) => Promise<void>;
  isLoading: boolean;
  serverError: string | null;
  onClearError: () => void;
}

// =====================================================================
// TYPES
// =====================================================================
type AuthMode = 'login' | 'register';

interface FormField {
  value: string;
  error: string;
  touched: boolean;
}

interface LoginForm {
  email: FormField;
  password: FormField;
}

interface RegisterForm {
  username: FormField;
  email: FormField;
  password: FormField;
  confirmPassword: FormField;
}

const emptyField = (): FormField => ({ value: '', error: '', touched: false });

// =====================================================================
// VALIDATION
// =====================================================================
const validate = {
  email: (v: string) => {
    if (!v) return 'Email không được để trống';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email không hợp lệ';
    return '';
  },
  username: (v: string) => {
    if (!v) return 'Tên đăng nhập không được để trống';
    if (v.length < 3) return 'Tối thiểu 3 ký tự';
    if (v.length > 50) return 'Tối đa 50 ký tự';
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Chỉ dùng chữ, số và dấu gạch dưới';
    return '';
  },
  password: (v: string) => {
    if (!v) return 'Mật khẩu không được để trống';
    if (v.length < 8) return 'Tối thiểu 8 ký tự';
    if (!/[A-Z]/.test(v)) return 'Cần ít nhất 1 chữ HOA';
    if (!/[0-9]/.test(v)) return 'Cần ít nhất 1 chữ số';
    return '';
  },
  confirmPassword: (v: string, password: string) => {
    if (!v) return 'Vui lòng nhập lại mật khẩu';
    if (v !== password) return 'Mật khẩu không khớp';
    return '';
  },
};

// Password strength scoring
const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score, label: 'Rất yếu', color: '#EF4444' };
  if (score === 2) return { score, label: 'Yếu', color: '#F97316' };
  if (score === 3) return { score, label: 'Trung bình', color: '#EAB308' };
  if (score === 4) return { score, label: 'Mạnh', color: '#22C55E' };
  return { score, label: 'Rất mạnh', color: '#10B981' };
};

// =====================================================================
// FLOATING PARTICLES COMPONENT
// =====================================================================
function Particles() {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 3,
    x: Math.random() * 100,
    delay: Math.random() * 8,
    duration: Math.random() * 12 + 10,
    opacity: Math.random() * 0.15 + 0.05,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: '-20px',
            opacity: p.opacity,
            animation: `float-up ${p.duration}s ${p.delay}s linear infinite`,
          }}
        />
      ))}
    </div>
  );
}

// =====================================================================
// INPUT COMPONENT
// =====================================================================
interface InputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  error: string;
  touched: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  autoComplete?: string;
}

function FormInput({ id, label, type = 'text', placeholder, value, error, touched, onChange, onBlur, icon, rightElement, autoComplete }: InputProps) {
  const hasError = touched && error;
  const isValid = touched && !error && value;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-gray-200">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          className="w-full py-3 rounded-xl border text-sm text-white placeholder-gray-500 transition-all duration-200 focus:outline-none"
          style={{
            paddingLeft: icon ? '42px' : '14px',
            paddingRight: rightElement ? '44px' : '14px',
            background: 'rgba(255,255,255,0.06)',
            borderColor: hasError ? '#EF4444' : isValid ? '#22C55E' : 'rgba(255,255,255,0.12)',
            boxShadow: hasError
              ? '0 0 0 3px rgba(239,68,68,0.15)'
              : isValid
              ? '0 0 0 3px rgba(34,197,94,0.12)'
              : 'none',
          }}
          onFocus={e => {
            if (!hasError && !isValid) {
              e.currentTarget.style.borderColor = 'rgba(99,102,241,0.7)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
            }
          }}
          onBlurCapture={e => {
            if (!hasError && !isValid) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
        {isValid && !rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
        )}
      </div>
      {hasError && (
        <p className="text-xs text-red-400 flex items-center gap-1.5 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// =====================================================================
// MAIN AUTH PAGE COMPONENT
// =====================================================================
export default function AuthComponent({
  onLogin, onRegister, isLoading, serverError, onClearError
}: AuthComponentProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Xóa error khi user bắt đầu gõ lại
  useEffect(() => { onClearError(); }, []);

  // Login form state
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: emptyField(),
    password: emptyField(),
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    username: emptyField(),
    email: emptyField(),
    password: emptyField(),
    confirmPassword: emptyField(),
  });

  const pwdStrength = getPasswordStrength(registerForm.password.value);

  // Switch mode — reset forms
  const switchMode = (m: AuthMode) => {
    setMode(m);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // ── Login handlers ──────────────────────────────────────────────────
  const updateLogin = (field: keyof LoginForm, value: string) => {
    const validators: Record<keyof LoginForm, (v: string) => string> = {
      email: validate.email,
      password: v => (v ? '' : 'Mật khẩu không được để trống'),
    };
    setLoginForm(prev => ({
      ...prev,
      [field]: { value, error: validators[field](value), touched: true },
    }));
  };

  const blurLogin = (field: keyof LoginForm) => {
    setLoginForm(prev => ({
      ...prev,
      [field]: { ...prev[field], touched: true, error: validate[field === 'email' ? 'email' : 'email'](prev[field].value) },
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validate.email(loginForm.email.value);
    const pwdErr = loginForm.password.value ? '' : 'Mật khẩu không được để trống';
    setLoginForm(prev => ({
      email: { ...prev.email, touched: true, error: emailErr },
      password: { ...prev.password, touched: true, error: pwdErr },
    }));
    if (emailErr || pwdErr) return;

    try {
      // ← Gọi API thực qua props từ useAuthStore
      await onLogin(loginForm.email.value, loginForm.password.value);
      setShowSuccess(true);
      // Navigate được xử lý ở LoginPage sau khi promise resolve
    } catch {
      // Error đã được set vào serverError bởi useAuthStore
    }
  };

  // ── Register handlers ────────────────────────────────────────────────
  const updateRegister = (field: keyof RegisterForm, value: string) => {
    let error = '';
    if (field === 'username') error = validate.username(value);
    else if (field === 'email') error = validate.email(value);
    else if (field === 'password') error = validate.password(value);
    else if (field === 'confirmPassword') error = validate.confirmPassword(value, registerForm.password.value);

    setRegisterForm(prev => ({
      ...prev,
      [field]: { value, error, touched: true },
      // Re-validate confirmPassword if password changed
      ...(field === 'password' && prev.confirmPassword.touched
        ? { confirmPassword: { ...prev.confirmPassword, error: validate.confirmPassword(prev.confirmPassword.value, value) } }
        : {}),
    }));
  };

  const blurRegister = (field: keyof RegisterForm) => {
    setRegisterForm(prev => ({ ...prev, [field]: { ...prev[field], touched: true } }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const usernameErr = validate.username(registerForm.username.value);
    const emailErr = validate.email(registerForm.email.value);
    const pwdErr = validate.password(registerForm.password.value);
    const confirmErr = validate.confirmPassword(registerForm.confirmPassword.value, registerForm.password.value);

    setRegisterForm(prev => ({
      username: { ...prev.username, touched: true, error: usernameErr },
      email: { ...prev.email, touched: true, error: emailErr },
      password: { ...prev.password, touched: true, error: pwdErr },
      confirmPassword: { ...prev.confirmPassword, touched: true, error: confirmErr },
    }));
    if (usernameErr || emailErr || pwdErr || confirmErr) return;

    try {
      // ← Gọi API thực qua props từ useAuthStore
      await onRegister(
        registerForm.username.value,
        registerForm.email.value,
        registerForm.password.value
      );
      setShowSuccess(true);
      // Navigate được xử lý ở LoginPage sau khi promise resolve
    } catch {
      // Error đã được set vào serverError bởi useAuthStore
    }
  };

  // ── SVG Icons ──────────────────────────────────────────────────────
  const IconEmail = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
  const IconUser = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    </svg>
  );
  const IconLock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
  const IconEye = ({ show, onClick }: { show: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="text-gray-400 hover:text-gray-200 transition-colors p-0.5">
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      )}
    </button>
  );

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0F0F1A; min-height: 100vh; }

        @keyframes float-up {
          0%   { transform: translateY(0) scale(1); opacity: var(--op, 0.08); }
          50%  { opacity: calc(var(--op, 0.08) * 1.5); }
          100% { transform: translateY(-110vh) scale(0.3); opacity: 0; }
        }
        @keyframes slide-in-left {
          from { opacity:0; transform: translateX(-20px); }
          to   { opacity:1; transform: translateX(0); }
        }
        @keyframes slide-in-right {
          from { opacity:0; transform: translateX(20px); }
          to   { opacity:1; transform: translateX(0); }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          100% { box-shadow: 0 0 0 20px rgba(99,102,241,0); }
        }
        @keyframes success-pop {
          0%   { transform: scale(0.8); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .form-login  { animation: slide-in-left  0.35s ease-out; }
        .form-register { animation: slide-in-right 0.35s ease-out; }
        .success-icon { animation: success-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 50px rgba(255,255,255,0.06) inset !important;
          -webkit-text-fill-color: white !important;
        }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0F0F1A 0%, #1A1A2E 40%, #16213E 70%, #0F3460 100%)',
        }}
      >
        {/* Ambient glow blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)', filter: 'blur(40px)' }}/>
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-15"
               style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)', filter: 'blur(50px)' }}/>
          <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-10"
               style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)', filter: 'blur(60px)' }}/>
        </div>

        <Particles />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
             style={{
               backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
               backgroundSize: '48px 48px',
             }}/>

        {/* Main card */}
        <div className="relative z-10 w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-2xl"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }}
              >
                M
              </div>
              <span className="text-3xl font-black text-white tracking-wider">MAP</span>
            </div>
            <p className="text-gray-400 text-sm">Hệ thống quản lý lộ trình học tập cá nhân</p>
          </div>

          {/* Glass card */}
          <div
            className="rounded-3xl p-8 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Success overlay */}
            {showSuccess && (
              <div className="absolute inset-0 rounded-3xl flex items-center justify-center z-20"
                   style={{ background: 'rgba(15,15,26,0.9)', backdropFilter: 'blur(8px)' }}>
                <div className="flex flex-col items-center gap-4">
                  <div
                    className="success-icon w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', boxShadow: '0 8px 32px rgba(34,197,94,0.4)' }}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p className="text-white font-bold text-lg">
                    {mode === 'login' ? 'Đăng nhập thành công!' : 'Đăng ký thành công!'}
                  </p>
                </div>
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex p-1 rounded-2xl mb-7" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {(['login', 'register'] as AuthMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
                  style={{
                    background: mode === m ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'transparent',
                    color: mode === m ? 'white' : 'rgba(255,255,255,0.4)',
                    boxShadow: mode === m ? '0 4px 16px rgba(99,102,241,0.35)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </button>
              ))}
            </div>

            {/* ── LOGIN FORM ── */}
            {mode === 'login' && (
              <form className="form-login flex flex-col gap-4" onSubmit={handleLogin} noValidate>

                <FormInput
                  id="login-email"
                  label="Email"
                  type="email"
                  placeholder="ban@email.com"
                  value={loginForm.email.value}
                  error={loginForm.email.error}
                  touched={loginForm.email.touched}
                  onChange={v => updateLogin('email', v)}
                  onBlur={() => setLoginForm(p => ({ ...p, email: { ...p.email, touched: true, error: validate.email(p.email.value) } }))}
                  icon={<IconEmail />}
                  autoComplete="email"
                />

                <FormInput
                  id="login-password"
                  label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginForm.password.value}
                  error={loginForm.password.error}
                  touched={loginForm.password.touched}
                  onChange={v => updateLogin('password', v)}
                  onBlur={() => setLoginForm(p => ({ ...p, password: { ...p.password, touched: true, error: p.password.value ? '' : 'Mật khẩu không được để trống' } }))}
                  icon={<IconLock />}
                  rightElement={<IconEye show={showPassword} onClick={() => setShowPassword(s => !s)} />}
                  autoComplete="current-password"
                />

                {/* Forgot password */}
                <div className="flex justify-end -mt-2">
                  <button
                    type="button"
                    className="text-xs font-medium transition-colors"
                    style={{ color: 'rgba(99,102,241,0.9)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#818CF8')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(99,102,241,0.9)')}
                    onClick={() => alert('Tính năng đặt lại mật khẩu qua email sẽ được triển khai ở backend.')}
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 mt-1"
                  style={{
                    background: isLoading
                      ? 'rgba(99,102,241,0.5)'
                      : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    boxShadow: isLoading ? 'none' : '0 8px 24px rgba(99,102,241,0.35)',
                    transform: isLoading ? 'none' : undefined,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                >
                  {isLoading ? (
                    <>
                      <svg
                        width="18" height="18" viewBox="0 0 24 24"
                        style={{ animation: 'spin 0.8s linear infinite' }}
                      >
                        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Đang đăng nhập...
                    </>
                  ) : (
                    <>
                      Đăng nhập
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>

                {/* Demo credentials hint */}
                <div
                  className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-xs text-gray-500">
                    Demo: <span className="text-gray-300 font-mono">dev@mmap.io</span> / <span className="text-gray-300 font-mono">Admin123</span>
                  </p>
                </div>
              </form>
            )}

            {/* ── REGISTER FORM ── */}
            {mode === 'register' && (
              <form className="form-register flex flex-col gap-4" onSubmit={handleRegister} noValidate>

                <FormInput
                  id="reg-username"
                  label="Tên đăng nhập"
                  placeholder="ten_cua_ban"
                  value={registerForm.username.value}
                  error={registerForm.username.error}
                  touched={registerForm.username.touched}
                  onChange={v => updateRegister('username', v)}
                  onBlur={() => blurRegister('username')}
                  icon={<IconUser />}
                  autoComplete="username"
                />

                <FormInput
                  id="reg-email"
                  label="Email"
                  type="email"
                  placeholder="ban@email.com"
                  value={registerForm.email.value}
                  error={registerForm.email.error}
                  touched={registerForm.email.touched}
                  onChange={v => updateRegister('email', v)}
                  onBlur={() => blurRegister('email')}
                  icon={<IconEmail />}
                  autoComplete="email"
                />

                <div className="flex flex-col gap-1.5">
                  <FormInput
                    id="reg-password"
                    label="Mật khẩu"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 8 ký tự, có HOA + số"
                    value={registerForm.password.value}
                    error={registerForm.password.error}
                    touched={registerForm.password.touched}
                    onChange={v => updateRegister('password', v)}
                    onBlur={() => blurRegister('password')}
                    icon={<IconLock />}
                    rightElement={<IconEye show={showPassword} onClick={() => setShowPassword(s => !s)} />}
                    autoComplete="new-password"
                  />

                  {/* Password strength bar */}
                  {registerForm.password.value && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-1 flex-grow">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{
                              background: i <= pwdStrength.score ? pwdStrength.color : 'rgba(255,255,255,0.1)',
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: pwdStrength.color }}>
                        {pwdStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <FormInput
                  id="reg-confirm-password"
                  label="Nhập lại mật khẩu"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={registerForm.confirmPassword.value}
                  error={registerForm.confirmPassword.error}
                  touched={registerForm.confirmPassword.touched}
                  onChange={v => updateRegister('confirmPassword', v)}
                  onBlur={() => blurRegister('confirmPassword')}
                  icon={<IconLock />}
                  rightElement={<IconEye show={showConfirmPassword} onClick={() => setShowConfirmPassword(s => !s)} />}
                  autoComplete="new-password"
                />

                {/* Terms */}
                <p className="text-xs text-gray-500 text-center leading-relaxed">
                  Bằng cách đăng ký, bạn đồng ý với{' '}
                  <span className="text-indigo-400 cursor-pointer hover:underline">Điều khoản dịch vụ</span>
                  {' '}và{' '}
                  <span className="text-indigo-400 cursor-pointer hover:underline">Chính sách bảo mật</span>.
                </p>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2"
                  style={{
                    background: isLoading
                      ? 'rgba(99,102,241,0.5)'
                      : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    boxShadow: isLoading ? 'none' : '0 8px 24px rgba(99,102,241,0.35)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={e => { if (!isLoading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                >
                  {isLoading ? (
                    <>
                      <svg
                        width="18" height="18" viewBox="0 0 24 24"
                        style={{ animation: 'spin 0.8s linear infinite' }}
                      >
                        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Đang tạo tài khoản...
                    </>
                  ) : (
                    <>
                      Tạo tài khoản
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Divider + Social (placeholder) */}
            <div className="flex items-center gap-3 mt-6">
              <div className="flex-grow h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-xs text-gray-600">hoặc tiếp tục với</span>
              <div className="flex-grow h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <div className="flex gap-3 mt-4">
              {[
                { name: 'Google', color: '#DB4437', icon: 'G' },
                { name: 'GitHub', color: '#333', icon: '⌥' },
              ].map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => alert(`Đăng nhập bằng ${s.name} — OAuth2 flow (Spring Security) — tính năng sẽ có ở production.`)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  <span className="font-black text-base">{s.icon}</span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600 mt-6">
            {mode === 'login' ? (
              <>Chưa có tài khoản?{' '}
                <button onClick={() => switchMode('register')} className="text-indigo-400 font-semibold hover:underline">
                  Đăng ký ngay
                </button>
              </>
            ) : (
              <>Đã có tài khoản?{' '}
                <button onClick={() => switchMode('login')} className="text-indigo-400 font-semibold hover:underline">
                  Đăng nhập
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
