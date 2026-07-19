import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { authSuccess } from '../redux/authSlice';
import { api } from '../services/api';
import { CheckCircle, RefreshCw } from 'lucide-react';

const VerifyOtp: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') || 'verification'; // 'verification' | 'reset'

  const otpParam = searchParams.get('otp') || '';
  const [otp, setOtp] = useState<string>(otpParam);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  // Timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/verify-otp', {
        email,
        otp,
        type,
      });

      setSuccess('Code verified successfully!');
      
      setTimeout(() => {
        if (type === '2fa') {
          localStorage.setItem('userId', res.data.user.id);
          dispatch(authSuccess({ user: res.data.user, token: res.data.accessToken, deviceId: res.data.deviceId }));
          navigate('/dashboard');
        } else if (type === 'verification') {
          navigate('/login');
        } else {
          // Redirect to reset password page passing email and otp
          navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${otp}`);
        }
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Incorrect verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setError(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('A new verification code has been sent to your email.');
      setResendTimer(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-gray-100 flex items-center justify-center p-6 relative overflow-hidden">
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
            Verify Email
          </h2>
          <p className="text-gray-400 text-sm text-center px-4">
            We sent a 6-digit verification code to <span className="text-brandTeal font-semibold">{email}</span>
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-3xl border border-gray-800 shadow-glass">
          {otpParam && (
            <div className="mb-6 p-4 rounded-xl bg-brandTeal/10 border border-brandTeal/40 text-brandTeal-light text-sm text-center">
              ⚙️ <span className="font-bold">Dev Mode:</span> Local OTP is <span className="font-mono font-bold text-white text-base tracking-wider">{otpParam}</span> (Auto-filled)
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-teal-950/40 border border-brandTeal/60 text-brandTeal-light text-sm flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 text-center">
                Enter 6-Digit Code
              </label>
              
              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-48 text-center text-3xl tracking-[10px] font-bold py-3 rounded-xl bg-gray-950/40 border border-gray-800 focus:border-brandTeal focus:outline-none text-gray-100 placeholder-gray-800 transition-colors"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          {/* Resend Button */}
          <div className="flex flex-col items-center gap-2 mt-6">
            <span className="text-gray-400 text-xs">Didn't receive code?</span>
            <button
              onClick={handleResend}
              disabled={resendTimer > 0}
              className={`flex items-center gap-1.5 text-sm font-semibold transition-colors ${
                resendTimer > 0 ? 'text-gray-600 cursor-not-allowed' : 'text-brandTeal hover:text-brandTeal-light'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
