import React, { useState } from 'react';
import { useDatabase } from '../../hooks/useDatabase';
import {
  Plane,
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Info,
  RefreshCw,
  ChevronLeft,
  Key,
} from 'lucide-react';
import { normalizeDomain } from '../../services/storage';
import { Profile } from '../../types';

interface LoginViewProps {
  onSuccess?: (user?: Profile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, register, sendRegistrationOtp, companies, validateCompanyAccess, setCurrentUser, allProfiles } =
    useDatabase();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerStep, setRegisterStep] = useState<'form' | 'otp'>('form');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('Technical');

  // OTP Field
  const [otpInput, setOtpInput] = useState('');
  const FIXED_OTP = '9876';

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live company detection based on email domain
  const detectedDomain = normalizeDomain(email);
  const detectedCompany = companies.find(
    (c) => normalizeDomain(c.email_domain) === detectedDomain
  );

  const demoPersonas = [
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Aman Kumar',
      role: 'Aviation Lead & System Administrator',
      org: 'Alaris Aerospace Systems',
      email: 'aman@alarisaero.com',
      badge: 'System Administrator (Full Access)',
    },
  ];

  const handleQuickLogin = (userId: string) => {
    setCurrentUser(userId);
    const targetProfile = allProfiles.find((p) => p.id === userId);
    const targetPersona = demoPersonas.find((p) => p.id === userId);
    const displayName = targetProfile?.full_name || targetPersona?.name || 'Guest';
    setSuccessMessage(`Welcome to the portfolio demo, ${displayName}!`);
    if (onSuccess) onSuccess(targetProfile);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your company email address or click one of the quick launch buttons above.');
      return;
    }

    setIsSubmitting(true);
    // In portfolio demo sandbox, let any existing persona log in immediately
    const matched = allProfiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase());
    if (matched) {
      setCurrentUser(matched.id);
      setIsSubmitting(false);
      setSuccessMessage(`Welcome back, ${matched.full_name}!`);
      if (onSuccess) onSuccess(matched);
      return;
    }

    const result = login(email.trim(), password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Login failed. Please select a demo persona above or enter a valid email.');
    } else {
      setSuccessMessage(`Welcome back, ${result.user?.full_name}!`);
      if (onSuccess) onSuccess(result.user);
    }
  };

  // Step 1: Validate Registration Details & Send OTP to Corporate Email
  const handleInitiateRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your company email address.');
      return;
    }
    if (password && confirmPassword && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    // Check company domain authorization
    const access = validateCompanyAccess(email.trim());
    if (!access.authorized) {
      setErrorMessage(access.error || 'Your organization is not authorized.');
      return;
    }

    setIsSubmitting(true);
    const otpRes = sendRegistrationOtp(email.trim(), fullName.trim());
    setIsSubmitting(false);

    if (!otpRes.success) {
      setErrorMessage(otpRes.error || 'Failed to dispatch verification email.');
      return;
    }

    setRegisterStep('otp');
    setOtpInput('');
    setSuccessMessage(
      `Verification code sent to ${email.trim()}. Please enter code "${FIXED_OTP}" to verify.`
    );
  };

  // Step 2: Verify OTP ("9876") and Complete Account Registration
  const handleVerifyOtpAndRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (otpInput.trim() !== FIXED_OTP) {
      setErrorMessage(`Invalid verification code. Please enter the correct code (Demo: ${FIXED_OTP}).`);
      return;
    }

    setIsSubmitting(true);
    const result = register({
      email: email.trim(),
      full_name: fullName.trim(),
      password,
      job_title: jobTitle.trim() || 'Aviation Specialist',
      department: department.trim() || 'Technical',
    });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Registration failed.');
    } else {
      setSuccessMessage(
        `Email verified! Welcome to ${detectedCompany?.name || 'the team'}, ${result.user?.full_name}!`
      );
      if (onSuccess) onSuccess(result.user);
    }
  };

  const handleResendOtp = () => {
    setErrorMessage(null);
    const res = sendRegistrationOtp(email.trim(), fullName.trim());
    if (!res.success) {
      setErrorMessage(res.error || 'Failed to resend code.');
    } else {
      setSuccessMessage(`A fresh verification code (${FIXED_OTP}) has been dispatched to ${email.trim()}.`);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white shadow-xl shadow-sky-600/30 mb-2">
            <Plane className="w-8 h-8 -rotate-45" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AIRCRAFT LIFECYCLE MANAGEMENT
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Enterprise Fleet Lifecycle &amp; Task Planning Engine with Domain-Gated Access Control
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-navy-900/90 backdrop-blur-xl border border-navy-800/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Quick Demo Launch Sandbox Card */}
          <div className="p-4 bg-gradient-to-br from-sky-950/80 via-blue-900/40 to-navy-950/90 border border-sky-500/40 rounded-xl space-y-3.5 shadow-lg shadow-sky-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                <span className="text-xs font-bold text-sky-200 tracking-wide uppercase">
                  Interactive Demo Sandbox
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                100% Client-Side &bull; Pre-Loaded
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Explore the entire aviation task management suite instantly. No signup or password needed:
            </p>

            <button
              type="button"
              onClick={() => handleQuickLogin('33333333-3333-3333-3333-333333333333')}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-sky-200" />
              <span>Launch Live Demo as Aman Kumar (Admin)</span>
              <ArrowRight className="w-4 h-4 text-sky-200" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-navy-800">
            <button
              onClick={() => {
                setMode('login');
                setRegisterStep('form');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
                mode === 'login' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
              {mode === 'login' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => {
                setMode('register');
                setRegisterStep('form');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
                mode === 'register' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account (Employee)
              {mode === 'register' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Alert Messages */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Company Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. name@alarisaero.com or admin@system.com"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded-xl pl-9.5 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                </div>
                {detectedCompany && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-sky-400">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>
                      Company: <strong>{detectedCompany.name}</strong> ({detectedCompany.email_domain}) &bull;{' '}
                      <span
                        className={
                          detectedCompany.status === 'ACTIVE'
                            ? 'text-emerald-400 font-semibold'
                            : 'text-rose-400 font-semibold'
                        }
                      >
                        {detectedCompany.status}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded-xl pl-9.5 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : registerStep === 'form' ? (
            /* STEP 1: EMPLOYEE REGISTRATION DETAILS */
            <form onSubmit={handleInitiateRegistration} className="space-y-4">
              <div className="p-3 bg-sky-950/40 border border-sky-800/40 rounded-xl text-[11px] text-sky-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                <span>
                  Self-registration is restricted to whitelisted partner company domains. An email verification code will be sent to complete registration.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full bg-navy-950 border border-navy-700/80 rounded-xl pl-9.5 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Avionics Engineer"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Authorized Company Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrorMessage(null);
                    }}
                    placeholder="e.g. user@alarisaero.com"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded-xl pl-9.5 pr-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                </div>
                {detectedDomain && (
                  <div className="mt-1.5 text-[11px]">
                    {detectedCompany ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Authorized Domain: <strong>{detectedCompany.name}</strong> ({detectedCompany.email_domain})
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Domain &quot;@{detectedDomain}&quot; is not authorized in this platform.
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-navy-950 border border-navy-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="Technical">Technical</option>
                  <option value="Asset">Asset</option>
                  <option value="Sales">Sales</option>
                  <option value="Teardown">Teardown</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !detectedCompany}
                className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Continue &bull; Send Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: OTP VERIFICATION SCREEN */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* OTP Screen Header */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mx-auto flex items-center justify-center shadow-lg shadow-sky-500/10">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white tracking-wide">
                  Verify Corporate Email
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  A 4-digit verification code has been dispatched to:
                </p>
                <div className="inline-block px-3 py-1 bg-navy-950 border border-navy-800 rounded-lg font-mono text-xs text-sky-400 font-bold">
                  {email}
                </div>
              </div>

              {/* Fixed OTP Demo Notice & Auto-Fill */}
              <div className="p-3 bg-sky-950/70 border border-sky-800/70 rounded-xl flex items-center justify-between text-xs text-sky-300 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Fixed Verification Code: <strong className="font-mono text-sm tracking-widest text-white ml-1">{FIXED_OTP}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOtpInput(FIXED_OTP);
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                >
                  Auto-Fill
                </button>
              </div>

              {/* OTP Form */}
              <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2 text-center">
                    Enter 4-Digit Code
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    autoFocus
                    value={otpInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setOtpInput(val);
                      setErrorMessage(null);
                    }}
                    placeholder="••••"
                    className="w-full text-center font-mono text-3xl font-bold tracking-[0.5em] bg-navy-950 border border-navy-700/80 rounded-xl py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 shadow-inner"
                  />
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Enter the 4-digit security token to activate your account.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otpInput.length !== 4}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Code &amp; Complete Registration</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep('form');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSubmitting}
                    className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Security Notice Footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Domain Verification &bull; Row-Level Security &bull; Audit-Logged Access</span>
        </div>
      </div>
    </div>
  );
};
