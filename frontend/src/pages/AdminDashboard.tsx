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
  Search
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

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // States
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load stats and users list
  const loadAdminData = async () => {
    try {
      const statsRes = await api.get('/admin/stats');
      setStats(statsRes.data.stats);

      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data.users);
    } catch (err) {
      console.error('Failed to load admin logs', err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Search users filter
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.get(`/admin/users?search=${searchTerm}`);
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Ban / Unban
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

      setSuccessMsg('Announcement broadcasted to all active sockets.');
      setBroadcastTitle('');
      setBroadcastMessage('');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to broadcast announcement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-obsidian min-h-screen text-gray-200 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-12 border-b border-gray-900 pb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-10 h-10 text-brandViolet" />
          <div>
            <h1 className="text-3xl font-extrabold text-white">VChats Administration</h1>
            <p className="text-gray-500 text-sm">System management, analytics, and user moderation</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:text-white transition-all text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Chats
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="max-w-7xl mx-auto mb-6 p-4 rounded-xl bg-teal-950/40 border border-brandTeal/60 text-brandTeal-light text-sm flex items-center gap-2">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="max-w-7xl mx-auto mb-6 p-4 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 text-sm flex items-center gap-2">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Grid Stats cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="glass-card p-6 rounded-2xl flex items-center justify-between border border-gray-900">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Registered Users
            </span>
            <span className="text-3xl font-extrabold text-white">{stats?.totalUsers || 0}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brandTeal/10 flex items-center justify-center text-brandTeal">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center justify-between border border-gray-900">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Active Devices
            </span>
            <span className="text-3xl font-extrabold text-white">{stats?.activeSessions || 0}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brandViolet/10 flex items-center justify-center text-brandViolet">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center justify-between border border-gray-900">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Messages Exchanged
            </span>
            <span className="text-3xl font-extrabold text-white">{stats?.totalMessages || 0}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brandTeal/10 flex items-center justify-center text-brandTeal">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center justify-between border border-gray-900">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Call Connections
            </span>
            <span className="text-3xl font-extrabold text-white">{stats?.totalCalls || 0}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brandViolet/10 flex items-center justify-center text-brandViolet">
            <Phone className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main panels */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left pane: User List Moderation */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-gray-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="font-extrabold text-lg text-white">Registered User List</h3>

              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-sm focus:border-brandTeal focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brandTeal hover:bg-brandTeal-dark text-white font-semibold text-sm transition-all"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-900/60 pb-3">
                    <th className="pb-3 font-semibold">User</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/40">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-900/20">
                      <td className="py-3.5">
                        <div className="font-bold text-white">{u.displayName}</div>
                        <div className="text-xs text-gray-500">@{u.username}</div>
                      </td>
                      <td className="py-3.5 text-gray-400">{u.email}</td>
                      <td className="py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.isBlocked
                              ? 'bg-red-950/40 text-red-400 border border-red-900/60'
                              : u.status === 'online'
                              ? 'bg-teal-950/40 text-brandTeal border border-brandTeal/60'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                          }`}
                        >
                          {u.isBlocked ? 'Banned' : u.status === 'online' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleToggleBlock(u._id)}
                          className={`p-2 rounded-lg border transition-all ${
                            u.isBlocked
                              ? 'bg-brandTeal/10 border-brandTeal/30 text-brandTeal hover:bg-brandTeal/20'
                              : 'bg-red-950/20 border-red-900/30 text-red-500 hover:bg-red-950/40'
                          }`}
                          title={u.isBlocked ? 'Unban User' : 'Ban User'}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id)}
                          className="p-2 rounded-lg bg-red-950/20 border border-red-900/30 text-red-500 hover:bg-red-950/40 transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right pane: System Announcements */}
        <div>
          <div className="glass-card p-6 rounded-3xl border border-gray-900">
            <div className="flex items-center gap-2 mb-6">
              <Megaphone className="w-5 h-5 text-brandTeal" />
              <h3 className="font-extrabold text-lg text-white">Broadcast Alerts</h3>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              <div>
                <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                  Alert Title
                </label>
                <input
                  type="text"
                  placeholder="System Maintenance"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm focus:border-brandTeal focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                  Broadcast Message
                </label>
                <textarea
                  placeholder="Type message to broadcast to all sockets..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-sm focus:border-brandTeal focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !broadcastMessage.trim()}
                className="w-full py-3 rounded-xl bg-teal-gradient text-white font-bold shadow-glass hover:shadow-glass-hover transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {loading ? 'Broadcasting...' : 'Emit System Broadcast'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
