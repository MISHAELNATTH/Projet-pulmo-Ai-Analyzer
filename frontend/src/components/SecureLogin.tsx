import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const SecureLogin: React.FC = () => {
  const navigate = useNavigate();
  const [institutionId, setInstitutionId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    
    const params = new URLSearchParams();
    params.append('username', institutionId);
    params.append('password', password);

    try {
      const response = await axios.post('http://localhost:8000/api/auth/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const { access_token, role, email } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('role', role);
      localStorage.setItem('email', email);
      
      setIsAuthenticating(false);
      navigate('/dashboard');
    } catch (err: any) {
      setIsAuthenticating(false);
      alert(err.response?.data?.detail || 'Incorrect credentials or PACS authentication failed.');
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen w-screen flex items-center justify-center relative overflow-hidden ambient-bg">
      {/* Environmental overlay */}
      <div className="absolute inset-0 scanlines opacity-30 z-0"></div>
      
      {/* Main Container Layout */}
      <div className="relative z-10 w-full max-w-[420px] px-margin-page">
        {/* Glassmorphic Login Card */}
        <main className="bg-surface-container-high/80 backdrop-blur-xl border border-outline-variant rounded-xl shadow-2xl p-8 flex flex-col gap-8">
          
          {/* Branding Header */}
          <header className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/10"></div>
              <span className="material-symbols-outlined fill-icon text-primary text-4xl relative z-10">
                pulmonology
              </span>
            </div>
            <div>
              <h1 className="text-headline-md font-headline-md text-on-surface tracking-tight">PneumoGuard AI</h1>
              <p className="text-body-sm font-body-sm text-on-surface-variant mt-1">Clinical Diagnostics Portal</p>
            </div>
          </header>

          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(71,239,224,0.6)]"></div>
              <span className="text-[10px] font-mono-data text-primary uppercase tracking-widest font-semibold">
                PACS connection: ACTIVE (HDS SECURE)
              </span>
            </div>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Fields Section */}
            <div className="flex flex-col gap-stack-gap">
              {/* Institutional ID Field */}
              <div className="relative">
                <label className="text-label-caps font-label-caps text-on-surface-variant mb-1.5 block uppercase" htmlFor="institution-id">
                  Institutional Email / ID
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline-variant text-xl z-10 pointer-events-none">
                    badge
                  </span>
                  <input
                    autoFocus
                    className="w-full bg-surface-container border border-outline-variant text-body-md font-body-md text-on-surface rounded p-3 pl-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner placeholder-outline-variant/50"
                    id="institution-id"
                    name="institution-id"
                    placeholder="Enter credentials"
                    required
                    type="text"
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="relative mt-3">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-label-caps font-label-caps text-on-surface-variant block uppercase" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-outline-variant text-xl z-10 pointer-events-none">
                    key
                  </span>
                  <input
                    className="w-full bg-surface-container border border-outline-variant text-body-md font-body-md text-on-surface rounded p-3 pl-10 pr-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner placeholder-outline-variant/50"
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    aria-label="Toggle password visibility"
                    className="absolute right-3 text-outline-variant hover:text-on-surface transition-colors focus:outline-none flex items-center justify-center"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Actions */}
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4">
                  <input
                    className="peer appearance-none w-4 h-4 border border-outline-variant rounded bg-surface-container checked:bg-primary checked:border-primary transition-colors cursor-pointer focus:ring-1 focus:ring-primary focus:outline-none"
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                  />
                  <span className="material-symbols-outlined text-[12px] text-on-primary absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                    check
                  </span>
                </div>
                <span className="text-body-sm font-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  Remember device
                </span>
              </label>
              <a 
                className="text-body-sm font-body-sm text-primary hover:text-primary-fixed transition-colors underline-offset-4 hover:underline" 
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                Forgot access?
              </a>
            </div>

            {/* CTA */}
            <button
              className="w-full bg-primary hover:bg-primary-fixed text-on-primary text-title-sm font-title-sm font-bold py-3 px-4 rounded transition-all duration-200 flex items-center justify-center gap-2 mt-2 shadow-[0_0_15px_rgba(71,239,224,0.15)] hover:shadow-[0_0_20px_rgba(71,239,224,0.3)] active:scale-[0.98] disabled:opacity-85 disabled:cursor-not-allowed"
              type="submit"
              disabled={isAuthenticating}
            >
              {isAuthenticating && (
                <span className="material-symbols-outlined animate-spin">
                  progress_activity
                </span>
              )}
              <span>{isAuthenticating ? 'Authenticating...' : 'Secure Login'}</span>
              {!isAuthenticating && (
                <span className="material-symbols-outlined text-[20px]">
                  arrow_forward
                </span>
              )}
            </button>
          </form>

          {/* Legal / Context Footer */}
          <footer className="pt-6 border-t border-outline-variant/50 text-center">
            <p className="text-[10px] font-label-caps text-outline uppercase tracking-wider leading-relaxed">
              Authorized Medical Personnel Only<br />
              <span className="text-outline-variant opacity-70">Activity is logged for HIPAA compliance.</span>
            </p>
          </footer>
        </main>

        {/* System Status Indicator at bottom */}
        <div className="mt-8 text-center flex items-center justify-center gap-2 text-outline-variant opacity-60">
          <span className="material-symbols-outlined text-[14px]">dns</span>
          <span className="text-body-sm font-mono-data text-[11px]">Core Server: Node-88-A (Online)</span>
        </div>
      </div>
    </div>
  );
};
