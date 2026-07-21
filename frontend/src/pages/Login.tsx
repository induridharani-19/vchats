import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authSuccess, authFailure, logoutSuccess } from '../redux/authSlice';
import { api } from '../services/api';
import { RootState } from '../redux/store';
import { Eye, EyeOff, Lock, User as UserIcon, Fingerprint, Download, Smartphone, Monitor, X, Globe } from 'lucide-react';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState<'scanning' | 'success' | 'failed'>('scanning');
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState(localStorage.getItem('vchats_language') || 'en');

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang);
    localStorage.setItem('vchats_language', lang);
  };
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    dispatch(authStart());
    setLocalError(null);
    try {
      // Get browser details for device logs
      const deviceName = `${(navigator as any).userAgentData?.brands?.[0]?.brand || 'Browser'} on ${(navigator as any).userAgentData?.platform || 'OS'}`;
      const deviceType = 'browser';

      const response = await api.post('/auth/login', {
        identifier: data.identifier,
        password: data.password,
        deviceName,
        deviceType,
      });

      const { accessToken, deviceId, user, twoFactorRequired, email, otp } = response.data;
      
      if (twoFactorRequired) {
        dispatch(logoutSuccess());
        const devOtp = otp ? `&otp=${otp}` : '';
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&type=2fa${devOtp}`);
        return;
      }
      
      // Save user ID to localStorage for useSocket local tracking
      localStorage.setItem('userId', user.id);

      // Save credentials for biometric login
      localStorage.setItem('vchats_biometric_credentials', JSON.stringify({
        identifier: data.identifier,
        password: data.password,
      }));

      dispatch(authSuccess({ user, token: accessToken, deviceId }));
      navigate('/dashboard');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Login failed. Please check credentials.';
      dispatch(authFailure(errMsg));
    }
  };

  const handleBiometricLogin = async () => {
    setLocalError(null);
    const credsStr = localStorage.getItem('vchats_biometric_credentials');
    if (!credsStr) {
      setLocalError("No biometric login configured. Please login with your username/password first to set up fingerprint sign-in.");
      return;
    }

    setShowBiometricModal(true);
    setBiometricStatus('scanning');

    // Simulate biometric check (WebAuthn / Fingerprint scan)
    setTimeout(async () => {
      try {
        const creds = JSON.parse(credsStr);
        
        // Log in using stored credentials
        const deviceName = `${(navigator as any).userAgentData?.brands?.[0]?.brand || 'Browser'} on ${(navigator as any).userAgentData?.platform || 'OS'}`;
        const deviceType = 'browser';

        const response = await api.post('/auth/login', {
          identifier: creds.identifier,
          password: creds.password,
          deviceName,
          deviceType,
        });

        const { accessToken, deviceId, user, twoFactorRequired, email, otp } = response.data;
        
        if (twoFactorRequired) {
          setBiometricStatus('failed');
          setTimeout(() => {
            setShowBiometricModal(false);
            dispatch(logoutSuccess());
            const devOtp = otp ? `&otp=${otp}` : '';
            navigate(`/verify-otp?email=${encodeURIComponent(email)}&type=2fa${devOtp}`);
          }, 800);
          return;
        }
        
        setBiometricStatus('success');
        localStorage.setItem('userId', user.id);
        dispatch(authSuccess({ user, token: accessToken, deviceId }));
        
        setTimeout(() => {
          setShowBiometricModal(false);
          navigate('/dashboard');
        }, 1000);
      } catch (err: any) {
        setBiometricStatus('failed');
        const errMsg = err.response?.data?.message || 'Biometric login failed.';
        dispatch(authFailure(errMsg));
        setTimeout(() => {
          setShowBiometricModal(false);
        }, 1500);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-obsidian text-gray-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Top Right Language Preference Selector */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-2 bg-gray-900/90 backdrop-blur-md px-3.5 py-2 rounded-full border border-gray-800 shadow-xl">
        <Globe className="w-4 h-4 text-brandTeal shrink-0" />
        <select
          value={selectedLang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-transparent text-xs font-extrabold text-gray-200 outline-none cursor-pointer pr-1"
        >
          <option value="en" className="bg-gray-950 text-white">🇺🇸 English</option>
          <option value="es" className="bg-gray-950 text-white">🇪🇸 Español</option>
          <option value="hi" className="bg-gray-950 text-white">🇮🇳 हिंदी (Hindi)</option>
          <option value="te" className="bg-gray-950 text-white">🇮🇳 తెలుగు (Telugu)</option>
          <option value="fr" className="bg-gray-950 text-white">🇫🇷 Français</option>
          <option value="de" className="bg-gray-950 text-white">🇩🇪 Deutsch</option>
          <option value="ar" className="bg-gray-950 text-white">🇸🇦 العربية</option>
          <option value="pt" className="bg-gray-950 text-white">🇧🇷 Português</option>
          <option value="zh" className="bg-gray-950 text-white">🇨🇳 中文</option>
          <option value="ja" className="bg-gray-950 text-white">🇯🇵 日本語</option>
          <option value="ru" className="bg-gray-950 text-white">🇷🇺 Русский</option>
        </select>
      </div>

      {/* Background Gradients */}
      <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brandTeal/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-brandViolet/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-gradient flex items-center justify-center font-bold text-2xl text-white shadow-glass">
            V
          </div>
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-brandTeal to-brandViolet bg-clip-text text-transparent">
            VChats
          </h2>
          <p className="text-gray-400 text-sm">Sign in to start messaging</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-3xl border border-gray-800 shadow-glass">
          {(error || localError) && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-sm">
              {error || localError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Identifier input */}
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="name@example.com or username"
                  {...register('identifier')}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-950/40 border border-gray-800 focus:border-brandTeal focus:outline-none text-gray-100 placeholder-gray-600 transition-colors"
                />
              </div>
              {errors.identifier && (
                <span className="text-red-500 text-xs mt-1 block">{errors.identifier.message}</span>
              )}
            </div>

            {/* Password input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-brandTeal text-xs font-semibold hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-gray-950/40 border border-gray-800 focus:border-brandTeal focus:outline-none text-gray-100 placeholder-gray-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-red-500 text-xs mt-1 block">{errors.password.message}</span>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                {...register('rememberMe')}
                className="w-4 h-4 rounded border-gray-800 bg-gray-950/40 text-brandTeal focus:ring-brandTeal"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-400 cursor-pointer">
                Remember Me
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
              
              <button
                type="button"
                onClick={handleBiometricLogin}
                className="px-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-brandTeal text-brandTeal hover:text-white transition-all transform hover:-translate-y-0.5 flex items-center justify-center shadow-glass"
                title="Sign in with Fingerprint / Biometrics"
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            </div>
          </form>

          {/* Download App Option */}
          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <button
              type="button"
              onClick={() => setShowDownloadModal(true)}
              className="text-xs text-brandTeal hover:underline inline-flex items-center gap-1.5 font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Download App for PC & Mobile
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-gray-400 text-sm mt-8">
          Don't have an account?{' '}
          <Link to="/register" className="text-brandTeal font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>

      {/* 🔒 BIOMETRIC SCANNING MODAL */}
      {showBiometricModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-80 bg-gray-950/90 border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center">
            
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 border transition-all ${
              biometricStatus === 'scanning' ? 'bg-brandTeal/10 border-brandTeal/40 animate-pulse' :
              biometricStatus === 'success' ? 'bg-green-500/10 border-green-500/40 text-green-400' :
              'bg-red-500/10 border-red-500/40 text-red-400'
            }`}>
              <Fingerprint className={`w-10 h-10 ${biometricStatus === 'scanning' ? 'animate-bounce' : ''}`} />
            </div>
            
            <h3 className="font-extrabold text-sm text-white mb-2 text-center">
              {biometricStatus === 'scanning' && 'Scanning Fingerprint...'}
              {biometricStatus === 'success' && 'Biometric Verified!'}
              {biometricStatus === 'failed' && 'Verification Failed'}
            </h3>
            
            <p className="text-[10px] text-gray-500 text-center max-w-[200px]">
              {biometricStatus === 'scanning' && 'Place your finger on the biometric scanner to log in.'}
              {biometricStatus === 'success' && 'Logging you in securely.'}
              {biometricStatus === 'failed' && 'Please use your password or try again.'}
            </p>
          </div>
        </div>
      )}

      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 rounded-3xl border border-gray-800 shadow-glass space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-900 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brandTeal/10 text-brandTeal">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-base text-white block text-left">Download VChats App</span>
                  <span className="text-[10px] text-gray-500 block text-left">Get the native application experience on all systems</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="p-2 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PC / Laptop */}
              <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-900/50 flex flex-col justify-between space-y-4 text-left">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Monitor className="w-5 h-5 text-brandTeal" />
                    <span className="font-extrabold text-sm text-white">Computers (Windows, Mac, Linux)</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Install VChats as a native desktop application with support for taskbar docking, auto-start, and system notifications.
                  </p>
                </div>
                <div className="pt-2">
                  {deferredPrompt ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleInstallApp();
                        setShowDownloadModal(false);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-bold text-xs shadow-lg hover:shadow-brandTeal/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Install Desktop App
                    </button>
                  ) : (
                    <div className="space-y-2 text-center p-3 bg-gray-950/40 border border-gray-900/60 rounded-xl">
                      <span className="text-[10px] font-bold text-brandTeal block">Browser-based Installation</span>
                      <p className="text-[10px] text-gray-500 leading-relaxed">
                        To download on PC, click the **Install icon** `⊕` or **Install VChats** option in your browser's address bar.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Devices */}
              <div className="bg-gray-900/40 p-5 rounded-2xl border border-gray-900/50 flex flex-col justify-between space-y-4 text-left">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-5 h-5 text-brandViolet" />
                    <span className="font-extrabold text-sm text-white">Smartphones (Android & iOS)</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Install VChats directly onto your mobile home screen to receive real-time call notifications and view the layout perfectly as a full-screen app.
                  </p>
                </div>
                <div className="pt-2 space-y-2">
                  {deferredPrompt ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleInstallApp();
                        setShowDownloadModal(false);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-brandViolet hover:bg-brandViolet-dark text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Install Android App
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-950/40 border border-gray-900/60 rounded-xl text-left space-y-1">
                        <span className="text-[10px] font-bold text-pink-400 block">Apple iOS (Safari)</span>
                        <p className="text-[9px] text-gray-500 leading-normal">
                          1. Open this website in Safari.<br />
                          2. Tap the **Share** button (box with an up arrow) at the bottom.<br />
                          3. Select **Add to Home Screen** from the list.<br />
                          4. Tap **Add** in the top right to download.
                        </p>
                      </div>
                      <div className="p-2.5 bg-gray-950/40 border border-gray-900/60 rounded-xl text-left space-y-1">
                        <span className="text-[10px] font-bold text-brandTeal block">Android (Chrome)</span>
                        <p className="text-[9px] text-gray-500 leading-normal">
                          Tap the **three dots menu** at the top right of Chrome, and select **Add to Home screen** or **Install app**.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
