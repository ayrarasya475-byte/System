import { useState, FormEvent } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { X, Send, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function SuggestionForm({ onClose, showToast }: { onClose: () => void, showToast: any, key?: string }) {
  const [form, setForm] = useState({ promptName: '', details: '', status: 'legal' as 'legal' | 'illegal' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return showToast('Silakan login terlebih dahulu.', 'error');
    if (!form.promptName || !form.details) return showToast('Data wajib diisi!', 'error');

    setLoading(true);
    try {
      await addDoc(collection(db, 'suggestions'), {
        ...form,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });
      showToast('Saran Anda telah kami terima!', 'success');
      onClose();
    } catch (e) {
      showToast('Gagal mengirim saran.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <div className="w-full max-w-lg glass rounded-[32px] p-8 md:p-10 flex flex-col overflow-hidden shadow-2xl relative border-white/10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight mb-1">Saran Prompt</h2>
            <p className="text-[11px] text-white/30 font-medium tracking-tight">Bantu kami memperkaya koleksi Grextar.</p>
          </div>
          <button onClick={onClose} className="p-2 glass rounded-full text-white/40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Nama Prompt</label>
            <input 
              type="text" 
              className="w-full h-11 bg-white/5 border border-white/5 rounded-xl px-5 outline-none focus:border-white/10 transition-all font-medium text-xs"
              value={form.promptName}
              onChange={e => setForm({...form, promptName: e.target.value})}
              placeholder="Apa nama prompt yang disarankan?"
            />
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Klasifikasi</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setForm({...form, status: 'legal'})}
                className={cn(
                  "h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] border transition-all",
                  form.status === 'legal' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-transparent text-white/20"
                )}
              >
                LEGAL
              </button>
              <button 
                type="button"
                onClick={() => setForm({...form, status: 'illegal'})}
                className={cn(
                  "h-11 rounded-xl font-bold uppercase tracking-widest text-[10px] border transition-all",
                  form.status === 'illegal' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-white/5 border-transparent text-white/20"
                )}
              >
                JAILBREAK
              </button>
            </div>
          </div>

          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Detail Prompt</label>
            <textarea 
              className="w-full h-32 bg-white/5 border border-white/5 rounded-xl p-5 outline-none focus:border-white/10 transition-all resize-none font-medium text-xs"
              value={form.details}
              onChange={e => setForm({...form, details: e.target.value})}
              placeholder="Jelaskan draf promptnya..."
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary h-12 flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
          >
            {loading ? 'Mengirim...' : <><Send className="w-4 h-4" /> Kirim Saran</>}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
