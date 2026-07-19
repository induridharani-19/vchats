import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { authStart, authFailure, logoutSuccess } from '../redux/authSlice';
import { api } from '../services/api';
import { RootState } from '../redux/store';
import { User as UserIcon, Mail, Lock } from 'lucide-react';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores are allowed'),
    displayName: z.string().min(1, 'Display Name is required').trim(),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    dispatch(authStart());
    try {
      const res = await api.post('/auth/register', {
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.displayName,
      });

      // Clear auth store state first
      dispatch(logoutSuccess());
      
      // Redirect to OTP verification page
      const devOtp = res.data.otp ? `&otp=${res.data.otp}` : '';
      navigate(`/verify-otp?email=${encodeURIComponent(data.email)}&type=verification${devOtp}`);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Registration failed. Try again.';
      dispatch(authFailure(errMsg));
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
            VChats
          </h2>
          <p className="text-gray-400 text-sm">Create a new account</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-3xl border border-gray-800 shadow-glass">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Display Name */}
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register('displayName')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950/40 border border-gray-800 focus:border-brandTeal focus:outline-none text-gray-100 placeholder-gray-600 transition-colors text-sm"
                />
              </div>
              {errors.displayName && (
                <span className="text-red-500 text-xs mt-1 block">{errors.displayName.message}</span>
              )}
            </div>

            {/* Username */}
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <span className="text-sm font-semibold">@</span>
                </div>
                <input
                  type="text"
                  placeholder="johndoe"
                  {...register('username')}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-gray-950/40 border border-gray-800 focus:border-brandTeal focus:outline-none text-gray-100 placeholder-gray-600 transition-colors text-sm"
                />
              </div>
              {errors.username && (
                <span className="text-red-500 text-xs mt-1 block">{errors.username.message}</span>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="john@example.com"
                  {...register('email')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950/40 border border-gray-800 focus:border-brandTeal focus:outline-none text-gray-100 placeholder-gray-600 transition-colors text-sm"
                />
              </div>
              {errors.email && (
                <span className="text-red-500 text-xs mt-1 block">{errors.email.message}</span>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950/40 border border-gray-800 focus:border-brandTeal focus:outline-none text-gray-100 placeholder-gray-600 transition-colors text-sm"
                />
              </div>
              {errors.password && (
                <span className="text-red-500 text-xs mt-1 block">{errors.password.message}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950/40 border border-gray-800 focus:border-brandTeal focus:outline-none text-gray-100 placeholder-gray-600 transition-colors text-sm"
                />
              </div>
              {errors.confirmPassword && (
                <span className="text-red-500 text-xs mt-1 block">{errors.confirmPassword.message}</span>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 text-sm"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brandTeal font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
