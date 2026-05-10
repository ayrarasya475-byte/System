import { motion, AnimatePresence } from 'motion/react';
import { Heart, Hash, Copy, Share2, User as UserIcon, Shield, TrendingUp, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { Prompt, Model } from '../types';
import PromptGrid from './PromptGrid';

export function FavoritesView({ prompts, models, showToast, favorites, onToggleFavorite, onSendToAi, onShare, onClose }: { prompts: Prompt[], models: Model[], showToast: any, favorites: string[], onToggleFavorite: (id: string) => void, onSendToAi: (content: string) => void, onShare: (prompt: Prompt) => void, onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="w-full max-w-5xl flex flex-col items-center"
    >
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-3xl flex items-center justify-center mb-4 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <Heart className="w-6 h-6 text-red-500" />
        </div>
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Prompt Favorit</h2>
        <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em]">Koleksi Pribadi Anda</p>
      </div>

      {prompts.length > 0 ? (
        <PromptGrid 
          prompts={prompts} 
          models={models} 
          showToast={showToast} 
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onSendToAi={onSendToAi} 
          onShare={onShare}
        />
      ) : (
        <div className="py-20 flex flex-col items-center text-center opacity-20">
          <Heart className="w-12 h-12 mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest">Belum ada favorit.</p>
        </div>
      )}
      <button onClick={onClose} className="mt-12 btn-secondary">Kembali</button>
    </motion.div>
  );
}

export function NotificationView({ broadcasts, onClose }: { broadcasts: any[], onClose: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="max-w-2xl w-full flex flex-col items-center"
    >
      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-16 h-16 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-4 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
          <Shield className="w-6 h-6 text-amber-500" />
        </div>
        <h2 className="text-2xl font-black italic tracking-tighter uppercase">Kotak Masuk</h2>
        <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.4em]">Broadcast & Pengumuman</p>
      </div>

      <div className="w-full space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
        {broadcasts.map(b => (
          <div key={b.id} className="glass p-6 rounded-[32px] border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/40" />
             <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">System Notification</span>
                <span className="text-[9px] font-bold text-white/10 uppercase">{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A'}</span>
             </div>
             <h3 className="text-lg font-bold text-white/90 mb-2">{b.title}</h3>
             <p className="text-sm text-white/40 leading-relaxed font-light">{b.content}</p>
          </div>
        ))}
        {broadcasts.length === 0 && (
          <div className="py-20 text-center opacity-10">
             <Shield className="w-12 h-12 mx-auto mb-4" />
             <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada pengumuman.</p>
          </div>
        )}
      </div>

      <button onClick={onClose} className="mt-12 btn-secondary h-14 w-full max-w-sm">Tutup</button>
    </motion.div>
  );
}

export function ProfileView({ user, stats, isAdmin, onAdminLogin, logout, onClose }: any) {
  const statItems = [
    { label: 'Prompt Disalin', value: stats.copies || 0, icon: Copy, color: 'text-blue-400' },
    { label: 'Statistik Berbagi', value: stats.shares || 0, icon: Share2, color: 'text-emerald-400' },
    { label: 'Prompt Disukai', value: stats.likes || 0, icon: Heart, color: 'text-red-400' },
    { label: 'Total Interaksi', value: (stats.copies || 0) + (stats.shares || 0), icon: TrendingUp, color: 'text-amber-400' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="max-w-2xl w-full glass p-8 md:p-12 rounded-[40px] mt-8 overflow-hidden relative"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
        <div className="relative">
          <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl animate-pulse" />
          <img src={user?.photoURL || ''} className="w-24 h-24 rounded-[32px] border-2 border-white/10 relative z-10 shadow-2xl" alt="avatar" />
          {isAdmin && (
            <div className="absolute -bottom-2 -right-2 bg-white text-black p-2 rounded-xl shadow-lg z-20 border border-black/10">
              <Shield className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-1">{user?.displayName}</h2>
          <p className="text-white/40 text-xs font-medium mb-4">{user?.email}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-2">
            <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Bergabung: {new Date(user?.metadata.creationTime).toLocaleDateString()}
            </span>
            {isAdmin && (
               <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400">Verified Admin</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {statItems.map((item, i) => (
          <div key={i} className="glass p-5 rounded-3xl border-white/5 text-center flex flex-col items-center">
            <item.icon className={cn("w-5 h-5 mb-3", item.color)} />
            <p className="text-2xl font-black italic mb-1">{item.value}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-white/20">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <button onClick={logout} className="flex-1 h-14 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-red-500/20 hover:bg-red-500/20 transition-all">Sign Out</button>
        <button onClick={onClose} className="flex-1 h-14 btn-secondary">Tutup</button>
      </div>
    </motion.div>
  );
}
