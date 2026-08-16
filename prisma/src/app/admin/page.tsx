import { prisma } from '@/lib/prisma';
import { getServerSession } from 'nextauth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  const userCount = await prisma.user.count();
  const premiumCount = await prisma.user.count({ where: { tier: 'PREMIUM' } });
  const chatCount = await prisma.chat.count();
  const messageCount = await prisma.message.count();

  return (
    <div className="min-h-screen bg-dark-bg text-white p-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent mb-8">
        Admin & Moderation Analytics Panel
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-dark-card border border-dark-border p-6 rounded-xl shadow-lg">
          <p className="text-gray-400 text-sm">Total Users</p>
          <p className="text-2xl font-bold text-neon-purple">{userCount}</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-xl shadow-lg">
          <p className="text-gray-400 text-sm">Active Subscribers</p>
          <p className="text-2xl font-bold text-neon-pink">{premiumCount}</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-xl shadow-lg">
          <p className="text-gray-400 text-sm">Active Conversations</p>
          <p className="text-2xl font-bold text-neon-cyan">{chatCount}</p>
        </div>
        <div className="bg-dark-card border border-dark-border p-6 rounded-xl shadow-lg">
          <p className="text-gray-400 text-sm">Messages Exchanged</p>
          <p className="text-2xl font-bold text-green-400">{messageCount}</p>
        </div>
      </div>
    </div>
  );
}
