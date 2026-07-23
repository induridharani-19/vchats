import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Users,
  MessageSquare,
  Phone,
  Ban,
  Trash2,
  Megaphone,
  ArrowLeft,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  Search,
  Sparkles,
  Image as ImageIcon,
  Lock,
  Globe,
  Save,
  Info
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  blockedUsers: number;
  onlineUsers: number;
  totalMessages: number;
  totalCalls: number;
  activeSessions: number;
}

interface UserListItem {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  isVerified: boolean;
  isBlocked: boolean;
  isAdmin: boolean;
  status: 'online' | 'offline';
  createdAt: string;
}

interface SystemConfig {
  appName: string;
  appLogo: string;
  accentColor: string;
  showAds: boolean;
  adImageUrl: string;
  adTargetUrl: string;
  adText: string;
  e2eEnforced: boolean;
  autoDeleteDays: number;
  allowNewRegistrations: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Tab State: 'overview' | 'users' | 'privacy' | 'branding'
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'privacy' | 'branding'>('overview');

  // Data States
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Configuration State
  const [config, setConfig] = useState<SystemConfig>({
    appName: 'VChats',
    appLogo: '',
    accentColor: '#0d9488',
    showAds: false,
    adImageUrl: '',
    adTargetUrl: '',
    adText: '',
    e2eEnforced: true,
    autoDeleteDays: 0,
    allowNewRegistrations: true,
    maintenanceMode: false,
    maintenanceMessage: '',
  });

  // Action States
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load all admin dashboard data
  const loadAdminData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data.stats);

      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data.users);

      const configRes = await api.get('/admin/config');
      if (configRes.data.config) {
        setConfig(configRes.data.config);
      }
    } catch (err) {
      console.error('Failed to load admin panel details', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Search users list
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.get(`/admin/users?search=${searchTerm}`);
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle user block status
  const handleToggleBlock = async (userId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.post('/admin/users/block', { targetUserId: userId });
      setSuccessMsg(res.data.message);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Banning user failed.');
    }
  };

  // Delete User Account
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this user account? This action is irreversible.')) {
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      setSuccessMsg(res.data.message);
      loadAdminData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete account.');
    }
  };

  // Send system announcement
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/admin/broadcast', {
        title: broadcastTitle,
        message: broadcastMessage,
      });

      setSuccessMsg('Announcement broadcasted to all online users successfully.');
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to broadcast announcement.');
    } finally {
      setLoading(false);
    }
  };

  // Save Config parameters (Branding / Ads / Security)
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.put('/admin/config', config);
      setSuccessMsg('System configuration settings saved successfully!');
      
      // Dynamic style adjustment if app color changed
      if (config.accentColor) {
        document.documentElement.style.setProperty('--color-brand-teal', config.accentColor);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save system configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="bg-obsidian min-h-screen text-gray-200 p-6 font-sans">
      {/* Header Panel */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-gray-900 pb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brandViolet/10 border border-brandViolet/20">
            <Shield className="w-9 h-9 text-brandViolet" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              VChats Admin Portal <span className="text-[10px] px-2 py-0.5 rounded-full bg-brandTeal/20 text-brandTeal border border-brandTeal/30 uppercase tracking-widest font-extrabold">SECURE</span>
            </h1>
            <p className="text-gray-500 text-xs">Manage system logins, active chats, privacy configurations, brand values, and banner advertisements</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="self-start md:self-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 border border-gray-850 hover:bg-gray-800 hover:text-white transition-all text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
      </div>

      {/* Message Notifications */}
      {successMsg && (
        <div className="max-w-7xl mx-auto mb-6 p-4 rounded-xl bg-teal-950/40 border border-brandTeal/65 text-brandTeal-light text-sm flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="max-w-7xl mx-auto mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-sm flex items-center gap-2 animate-fade-in">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Stats Board Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 rounded-2xl flex items-center justify-between border border-gray-900 shadow-glass">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Total Accounts</span>
            <span className="text-2xl font-extrabold text-white">{stats?.totalUsers || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brandTeal/10 flex items-center justify-center text-brandTeal">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center justify-between border border-gray-900 shadow-glass">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Online Logins</span>
            <span className="text-2xl font-extrabold text-brandTeal">{stats?.onlineUsers || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brandTeal/15 flex items-center justify-center text-brandTeal animate-pulse">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center justify-between border border-gray-900 shadow-glass">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Total Chats</span>
            <span className="text-2xl font-extrabold text-white">{stats?.totalMessages || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brandViolet/10 flex items-center justify-center text-brandViolet">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl flex items-center justify-between border border-gray-900 shadow-glass">
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Calls Connected</span>
            <span className="text-2xl font-extrabold text-white">{stats?.totalCalls || 0}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brandViolet/15 flex items-center justify-center text-brandViolet">
            <Phone className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto mb-6 flex border-b border-gray-900 gap-1.5 overflow-x-auto select-none scrollbar-none pb-1">
        {([
          { id: 'overview', label: 'System Overview', icon: Activity },
          { id: 'users', label: 'User Logins', icon: Users },
          { id: 'privacy', label: 'Privacy & Security', icon: Lock },
          { id: 'branding', label: 'Branding & Ads', icon: Globe },
        ] as const).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 shrink-0 ${
                activeTab === tab.id
                  ? 'border-brandTeal text-brandTeal bg-gray-950/20'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-900/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tabs Panels Container */}
      <div className="max-w-7xl mx-auto">
        {/* TAB 1: SYSTEM OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* System Status Metrics Card */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 rounded-2xl border border-gray-900 shadow-glass">
                <h3 className="font-extrabold text-md text-white mb-4 flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-brandTeal" /> Engine Server Diagnostics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-850">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Node Runtime Status</span>
                    <span className="text-emerald-400 text-sm font-bold block mt-1">🟢 Operational</span>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-850">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Active Device Sessions</span>
                    <span className="text-white text-sm font-bold block mt-1">{stats?.activeSessions || 0} online</span>
                  </div>
                  <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-850">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-bold">Banned Accounts</span>
                    <span className="text-red-400 text-sm font-bold block mt-1">{stats?.blockedUsers || 0} suspended</span>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-gray-900/30 border border-gray-850/50 flex gap-3 text-xs leading-relaxed text-gray-400">
                  <Info className="w-5 h-5 text-brandTeal flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block mb-0.5">Admin Guidelines</span>
                    System-wide modifications affect the database parameters instantly. In-call and message stats reflect database aggregations. Ensure security patches and database backup metrics are observed.
                  </div>
                </div>
              </div>
            </div>

            {/* Broadcast panel */}
            <div>
              <div className="glass-card p-6 rounded-2xl border border-gray-900 shadow-glass">
                <h3 className="font-extrabold text-md text-white mb-4 flex items-center gap-2">
                  <Megaphone className="w-4.5 h-4.5 text-brandTeal" /> Broadcast Alert System
                </h3>
                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div>
                    <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      Announcement Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. System Maintenance"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs focus:border-brandTeal focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      Announcement Body
                    </label>
                    <textarea
                      placeholder="Type alert message to broadcast to all sockets in real time..."
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs focus:border-brandTeal focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !broadcastMessage.trim()}
                    className="w-full py-2.5 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    Emit Live Broadcast
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USER LOGINS & MODERATION */}
        {activeTab === 'users' && (
          <div className="glass-card p-6 rounded-2xl border border-gray-900 shadow-glass">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-extrabold text-md text-white">Registered User Logins</h3>
                <p className="text-xs text-gray-500">Monitor registrations, suspend profiles, or permanently delete database entries</p>
              </div>

              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search username, email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-gray-900 border border-gray-850 text-xs focus:border-brandTeal focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-bold text-xs transition-all"
                >
                  Filter
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-900/60 pb-3">
                    <th className="pb-3 font-bold uppercase tracking-wider text-[10px]">User Account</th>
                    <th className="pb-3 font-bold uppercase tracking-wider text-[10px]">Email Address</th>
                    <th className="pb-3 font-bold uppercase tracking-wider text-[10px]">Joined Date</th>
                    <th className="pb-3 font-bold uppercase tracking-wider text-[10px]">Security Status</th>
                    <th className="pb-3 font-bold uppercase tracking-wider text-[10px] text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/40">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-900/10 transition-colors">
                      <td className="py-3.5">
                        <div className="font-extrabold text-white flex items-center gap-1.5">
                          {u.displayName}
                          {u.isAdmin && (
                            <span className="text-[8px] bg-brandViolet/20 border border-brandViolet/30 text-brandViolet font-extrabold px-1.5 py-0.5 rounded">ADMIN</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500">@{u.username}</div>
                      </td>
                      <td className="py-3.5 text-gray-400">{u.email}</td>
                      <td className="py-3.5 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.isBlocked
                              ? 'bg-red-950/20 text-red-400 border-red-900/40'
                              : u.status === 'online'
                              ? 'bg-teal-950/20 text-brandTeal border-brandTeal/40'
                              : 'bg-gray-900 text-gray-400 border-gray-800'
                          }`}
                        >
                          {u.isBlocked ? 'Banned' : u.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleToggleBlock(u._id)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            u.isBlocked
                              ? 'bg-brandTeal/10 border-brandTeal/30 text-brandTeal hover:bg-brandTeal/20'
                              : 'bg-red-950/20 border-red-900/30 text-red-500 hover:bg-red-950/40'
                          }`}
                          title={u.isBlocked ? 'Unban User' : 'Ban User'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-1.5 rounded-lg bg-red-950/20 border border-red-900/30 text-red-500 hover:bg-red-950/40 transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PRIVACY & SECURITY CONFIGS */}
        {activeTab === 'privacy' && (
          <div className="glass-card p-6 rounded-2xl border border-gray-900 shadow-glass max-w-2xl mx-auto">
            <h3 className="font-extrabold text-md text-white mb-1 flex items-center gap-2">
              <Lock className="w-4.5 h-4.5 text-brandTeal" /> Security & Privacy Policies
            </h3>
            <p className="text-xs text-gray-500 mb-6">Manage end-to-end encryption protocols, database retention, and registration controls</p>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl border border-gray-850">
                <div>
                  <span className="text-xs font-bold text-white block mb-0.5">Enforce End-to-End Encryption</span>
                  <span className="text-[10px] text-gray-500 block">Enforce encryption parameters on all WebRTC calls and dynamic socket relays</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.e2eEnforced}
                    onChange={(e) => handleConfigChange('e2eEnforced', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandTeal"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl border border-gray-850">
                <div>
                  <span className="text-xs font-bold text-white block mb-0.5">New Registrations</span>
                  <span className="text-[10px] text-gray-500 block">Toggle if new user registrations are permitted on the login page</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.allowNewRegistrations}
                    onChange={(e) => handleConfigChange('allowNewRegistrations', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandTeal"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl border border-gray-850">
                <div>
                  <span className="text-xs font-bold text-white block mb-0.5">Platform Maintenance Mode</span>
                  <span className="text-[10px] text-gray-500 block">Stop/start scheduled platform maintenance (blocks non-admin users)</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.maintenanceMode}
                    onChange={(e) => handleConfigChange('maintenanceMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-850 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandTeal"></div>
                </label>
              </div>

              {config.maintenanceMode && (
                <div className="space-y-2 animate-fade-in p-4 bg-gray-900/10 rounded-xl border border-gray-850">
                  <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                    Maintenance Custom Message / New Features Announcement
                  </label>
                  <textarea
                    placeholder="Describe the upgrades or new features being implemented..."
                    value={config.maintenanceMessage}
                    onChange={(e) => handleConfigChange('maintenanceMessage', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-855 text-xs focus:border-brandTeal focus:outline-none resize-none"
                  />
                  <p className="text-[9px] text-gray-500 leading-normal">
                    Describe any new features being added (e.g. WhatsApp-like calls, PiP Mode, etc.). This message will appear on the screen when users are blocked from loading the app.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Message Data Auto-Deletion
                </label>
                <select
                  value={config.autoDeleteDays}
                  onChange={(e) => handleConfigChange('autoDeleteDays', parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-850 text-xs focus:border-brandTeal focus:outline-none"
                >
                  <option value={0}>Never (Keep all history)</option>
                  <option value={7}>Delete messages older than 7 Days</option>
                  <option value={30}>Delete messages older than 30 Days</option>
                  <option value={90}>Delete messages older than 90 Days</option>
                </select>
                <p className="text-[9px] text-gray-500 mt-1.5 leading-relaxed">
                  Automated daemon job deletes chat messages and media attachments based on the selected retention period to save storage.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Security Policies
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: APP BRANDING & ADVERTISING (ADS) */}
        {activeTab === 'branding' && (
          <div className="glass-card p-6 rounded-2xl border border-gray-900 shadow-glass max-w-2xl mx-auto">
            <h3 className="font-extrabold text-md text-white mb-1 flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-brandTeal" /> Branding & Ads Control Panel
            </h3>
            <p className="text-xs text-gray-500 mb-6">Modify platform identity parameters and toggle commercial/sponsor advertisements</p>

            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* Branding Section */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-brandViolet border-b border-gray-900/60 pb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Identity Branding
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={config.appName}
                      onChange={(e) => handleConfigChange('appName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-850 text-xs focus:border-brandTeal focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                      Brand Accent Color (HEX)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => handleConfigChange('accentColor', e.target.value)}
                        className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.accentColor}
                        onChange={(e) => handleConfigChange('accentColor', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-gray-900 border border-gray-855 text-xs font-mono focus:border-brandTeal focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    Brand Logo URL
                  </label>
                  <input
                    type="text"
                    value={config.appLogo}
                    placeholder="https://example.com/logo.png (leave blank for default logo)"
                    onChange={(e) => handleConfigChange('appLogo', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-855 text-xs focus:border-brandTeal focus:outline-none"
                  />
                </div>
              </div>

              {/* Advertisement Settings */}
              <div className="space-y-4 pt-4 border-t border-gray-900/60">
                <h4 className="font-bold text-xs uppercase tracking-wider text-brandTeal border-b border-gray-900/60 pb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" /> Advertisement Control
                </h4>

                <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl border border-gray-850">
                  <div>
                    <span className="text-xs font-bold text-white block mb-0.5">Toggle Ads Banners</span>
                    <span className="text-[10px] text-gray-500 block">Enable or disable banner ads shown inside user chats</span>
                  </div>
                  <label className="relative inline-flex inline-block items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.showAds}
                      onChange={(e) => handleConfigChange('showAds', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brandTeal"></div>
                  </label>
                </div>

                {config.showAds && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                        Ad Image Banner URL
                      </label>
                      <input
                        type="text"
                        value={config.adImageUrl}
                        placeholder="https://example.com/banner.png"
                        onChange={(e) => handleConfigChange('adImageUrl', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-855 text-xs focus:border-brandTeal focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                          Ad Redirection Link (URL)
                        </label>
                        <input
                          type="text"
                          value={config.adTargetUrl}
                          placeholder="https://sponsor.com/deal"
                          onChange={(e) => handleConfigChange('adTargetUrl', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-855 text-xs focus:border-brandTeal focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                          Ad Text Caption
                        </label>
                        <input
                          type="text"
                          value={config.adText}
                          placeholder="Get 50% off VChats premium integrations!"
                          onChange={(e) => handleConfigChange('adText', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-855 text-xs focus:border-brandTeal focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Save Brand & Ads Configurations
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
