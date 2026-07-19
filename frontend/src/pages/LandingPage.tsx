import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Shield, Zap, Video, Users, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-obsidian min-h-screen text-gray-100 selection:bg-brandTeal selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 glass-card border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-teal-gradient flex items-center justify-center font-bold text-xl text-white shadow-lg">
              V
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-brandTeal via-brandTeal-light to-brandViolet bg-clip-text text-transparent">
              VChats
            </span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="text-gray-300 hover:text-white font-medium transition-colors">
              Login
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 rounded-xl bg-teal-gradient text-white font-semibold shadow-glass hover:shadow-glass-hover transition-all transform hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        {/* Gradients */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brandTeal/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brandViolet/20 blur-[120px] pointer-events-none" />

        <div className="max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800/60 border border-gray-700 text-sm font-medium text-brandTeal mb-6 backdrop-blur-md">
              <Sparkles className="w-4 h-4" /> Real-time Encryption Enabled
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight"
          >
            Connect Instantly with{' '}
            <span className="bg-gradient-to-r from-brandTeal via-brandTeal-light to-brandViolet bg-clip-text text-transparent">
              VChats
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            A premium real-time messaging application inspired by WhatsApp but designed for complete email-based authorization. No phone number required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              Start Chatting Free <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gray-800/80 border border-gray-700 text-gray-300 font-semibold hover:bg-gray-800 hover:text-white transition-colors"
            >
              Explore Features
            </a>
          </motion.div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="features" className="py-24 border-t border-gray-900 bg-gray-950/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Features Designed for You</h2>
            <p className="text-gray-400">Everything you expect from a premium messenger, engineered with modern technologies.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Direct Messaging */}
            <div className="glass-card p-8 rounded-2xl border border-gray-800 hover:border-brandTeal/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-brandTeal/10 flex items-center justify-center text-brandTeal mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">1-to-1 Chatting</h3>
              <p className="text-gray-400 leading-relaxed">
                Enjoy lightning-fast messages with read, delivery, and typing receipts. Share emojis, location cards, or replies.
              </p>
            </div>

            {/* Audio & Video calling */}
            <div className="glass-card p-8 rounded-2xl border border-gray-800 hover:border-brandTeal/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-brandViolet/10 flex items-center justify-center text-brandViolet mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">HD Voice & Video</h3>
              <p className="text-gray-400 leading-relaxed">
                High-definition audio and video connections powered by WebRTC. Screen share directly in your browser.
              </p>
            </div>

            {/* Security */}
            <div className="glass-card p-8 rounded-2xl border border-gray-800 hover:border-brandTeal/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-brandTeal/10 flex items-center justify-center text-brandTeal mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Secure Credentials</h3>
              <p className="text-gray-400 leading-relaxed">
                Double-cookie JWT session rotations, CSRF protections, email OTP activations, and encrypted local sessions.
              </p>
            </div>

            {/* Groups & Channels */}
            <div className="glass-card p-8 rounded-2xl border border-gray-800 hover:border-brandTeal/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-brandViolet/10 flex items-center justify-center text-brandViolet mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Groups & Channels</h3>
              <p className="text-gray-400 leading-relaxed">
                Host group conversations with customizable admin permission structures, announcement-only boards, or public channels.
              </p>
            </div>

            {/* Instant sync */}
            <div className="glass-card p-8 rounded-2xl border border-gray-800 hover:border-brandTeal/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-brandTeal/10 flex items-center justify-center text-brandTeal mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-time Updates</h3>
              <p className="text-gray-400 leading-relaxed">
                Socket.io feeds synchronize messages, statuses, active stories, device changes, and online presence instantly.
              </p>
            </div>

            {/* Media Uploads */}
            <div className="glass-card p-8 rounded-2xl border border-gray-800 hover:border-brandTeal/30 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-brandViolet/10 flex items-center justify-center text-brandViolet mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Media sharing</h3>
              <p className="text-gray-400 leading-relaxed">
                Share files, images, videos, spreadsheets, document reports, or voice notes, backed by secure Cloudinary CDN storage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 border-t border-gray-900">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Everything you need to know about the VChats architecture.</p>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6 rounded-xl">
              <h4 className="text-lg font-bold mb-2 flex items-center gap-2 text-brandTeal">
                <HelpCircle className="w-5 h-5" /> How does VChats authenticate users without phone numbers?
              </h4>
              <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                VChats uses an email-based login system. During registration, a mandatory 6-digit OTP is delivered to your email. You must verify the OTP to activate your account and login.
              </p>
            </div>

            <div className="glass-card p-6 rounded-xl">
              <h4 className="text-lg font-bold mb-2 flex items-center gap-2 text-brandTeal">
                <HelpCircle className="w-5 h-5" /> Is my session secure across devices?
              </h4>
              <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                Yes! We maintain an active device list. You can view all logged-in devices and trigger a "Logout from All Devices" which invalidates all refresh tokens instantly.
              </p>
            </div>

            <div className="glass-card p-6 rounded-xl">
              <h4 className="text-lg font-bold mb-2 flex items-center gap-2 text-brandTeal">
                <HelpCircle className="w-5 h-5" /> What storage does VChats use for media?
              </h4>
              <p className="text-gray-400 text-sm pl-7 leading-relaxed">
                VChats integrates with Cloudinary to store images, videos, audio logs, and documents. For local development environments, it gracefully falls back to local workspace disk folders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-900 bg-black/40">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-500">
          <div>&copy; 2026 VChats. Built with Google DeepMind Antigravity AI assistant.</div>
          <div className="flex gap-6">
            <Link to="/login" className="hover:text-gray-300">Login</Link>
            <Link to="/register" className="hover:text-gray-300">Register</Link>
            <span className="text-gray-700">|</span>
            <span className="text-brandTeal">Production Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
