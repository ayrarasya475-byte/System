import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signInWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { Prompt, Model } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PromptGrid from './components/PromptGrid';
import AdminPanel from './components/AdminPanel';
import Chat from './components/Chat';
import SuggestionForm from './components/SuggestionForm';
import { Search, Shield, User, LogOut } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState<'browse' | 'chat' | 'suggest' | 'admin' | 'faq' | 'privacy'>('browse');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Simplified query to avoid index requirement during initial setup
    const q = query(
      collection(db, 'prompts')
    );
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setPrompts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'prompts');
        showToast("Gagal memuat data prompt.");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'models'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        setModels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Model)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'models');
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredPrompts = [...prompts]
    .filter(p => {
      // Filter for active status in the UI to skip index Requirement
      const isActive = p.status === 'active';
      const matchesModel = !selectedModel || p.modelId === selectedModel;
      const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (p.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      return isActive && matchesModel && matchesSearch;
    })
    // Sort in-memory to skip index requirement
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

  const handleAdminLogin = () => {
    if (adminPass === '92727292827') {
      setView('admin');
      setIsAdminLoginOpen(false);
      setAdminPass('');
    } else {
      showToast('Sandi akses salah!');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#030303]">
        <motion.div 
          animate={{ scale: [0.95, 1, 0.95], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-lg font-bold tracking-[0.2em] text-white/50"
        >
          GREXTAR
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] flex flex-col md:flex-row relative">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(63,94,251,0.05)_0%,rgba(0,0,0,0)_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(252,70,107,0.05)_0%,rgba(0,0,0,0)_50%)] pointer-events-none" />

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar 
        currentView={view} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onViewChange={(v) => {
          if ((v === 'chat' || v === 'suggest') && !user) {
            signInWithGoogle();
          } else {
            setView(v);
            setIsSidebarOpen(false);
          }
        }} 
      />

      <main className="flex-1 flex flex-col items-center px-4 md:px-12 pt-16 md:pt-24 pb-12 w-full h-screen overflow-y-auto scrollbar-hide scroll-smooth relative z-10">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        
        {view === 'browse' && (
          <div className="w-full max-w-5xl flex flex-col items-center">
            <div className="w-full max-w-xl mt-6 md:mt-10 mb-6 relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-white/60 transition-colors" />
              <input 
                type="text"
                placeholder="Cari prompt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 md:h-14 pl-12 pr-6 glass-card rounded-2xl text-sm focus:outline-none focus:border-white/20 transition-all placeholder:text-white/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-8 no-scrollbar overflow-x-auto w-full px-4">
              <button
                onClick={() => setSelectedModel(null)}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  !selectedModel ? "bg-white text-black" : "bg-white/5 text-white/40 hover:text-white"
                )}
              >
                Semua
              </button>
              {models.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={cn(
                    "px-5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    selectedModel === m.id ? "bg-white text-black" : "bg-white/5 text-white/40 hover:text-white"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>

            <PromptGrid prompts={filteredPrompts} models={models} showToast={showToast} />
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'chat' && <Chat key="chat" onClose={() => setView('browse')} showToast={showToast} />}
          {view === 'suggest' && <SuggestionForm key="suggest" onClose={() => setView('browse')} showToast={showToast} />}
          {view === 'admin' && <AdminPanel key="admin" onClose={() => setView('browse')} />}
          {view === 'faq' && (
            <motion.div 
              key="faq"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="max-w-xl w-full glass p-8 rounded-[32px] mt-8"
            >
              <h2 className="text-xl font-black mb-6 tracking-tight">FAQ</h2>
              <div className="space-y-6 text-sm">
                <div>
                  <p className="font-bold text-white/80 mb-2">Bagaimana cara menggunakan Grextar?</p>
                  <p className="text-white/40 leading-relaxed">Cari prompt yang Anda butuhkan, salin kodenya, dan tempelkan ke model AI favorit Anda.</p>
                </div>
                <div>
                  <p className="font-bold text-white/80 mb-2">Berapa biaya layanannya?</p>
                  <p className="text-white/40 leading-relaxed">Grextar 100% gratis untuk komunitas selamanya.</p>
                </div>
              </div>
              <button onClick={() => setView('browse')} className="mt-10 btn-secondary w-full">Kembali Ke Beranda</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Top Action Bar */}
      <div className="fixed top-4 right-4 md:top-8 md:right-8 z-[51] flex items-center gap-2 md:gap-3">
        {user ? (
          <div className="flex items-center gap-2 bg-white/5 p-1.5 pr-4 rounded-full border border-white/5 backdrop-blur-xl">
            <img src={user.photoURL || ''} className="w-7 h-7 rounded-full" alt="avatar" />
            <div className="hidden sm:block text-left mr-2">
              <p className="text-[10px] font-bold truncate max-w-[80px]">{user.displayName}</p>
            </div>
            <button onClick={logout} className="p-1.5 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={signInWithGoogle} className="btn-secondary h-10 px-4 py-0 flex items-center gap-2">
            <User className="w-4 h-4" /> <span className="hidden sm:inline">Login</span>
          </button>
        )}
        <button 
          onClick={() => {
            if (view === 'admin') setView('browse');
            else setIsAdminLoginOpen(true);
          }}
          className={cn(
            "p-3 rounded-2xl transition-all border",
            view === 'admin' ? "bg-white text-black border-white" : "bg-white/5 text-white/40 border-white/5 hover:border-white/10"
          )}
        >
          <Shield className="w-4 h-4" />
        </button>
      </div>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {isAdminLoginOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm glass p-8 rounded-[32px] text-center"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white/40">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Admin Panel</h3>
              <p className="text-xs text-white/30 mb-6">Verifikasi identitas diperlukan.</p>
              <input 
                type="password"
                placeholder="Masukkan Sandi"
                autoFocus
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                className="w-full h-12 bg-white/5 border border-white/5 rounded-2xl px-5 text-center outline-none focus:border-white/20 mb-4 tracking-[0.5em]"
              />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setIsAdminLoginOpen(false)} className="btn-secondary">Batal</button>
                <button onClick={handleAdminLogin} className="btn-primary">Masuk</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl text-xs font-bold shadow-2xl backdrop-blur-md border",
              toast.type === 'error' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
