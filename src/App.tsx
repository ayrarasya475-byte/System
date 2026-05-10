import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, getDocs } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, signInWithGoogle, logout, OperationType, handleFirestoreError } from './lib/firebase';
import { Prompt, Model } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PromptGrid from './components/PromptGrid';
import AdminPanel from './components/AdminPanel';
import Chat from './components/Chat';
import AiChat from './components/AiChat';
import SuggestionForm from './components/SuggestionForm';
import { Search, Shield, User, LogOut, Terminal, Database, MessageSquare, Sparkles, LayoutGrid, X, Heart, Bell, Settings as SettingsIcon, User as UserIcon, Activity, Send, Gamepad2, Settings, Info, ShieldAlert, BrainCircuit, Paperclip, ChevronDown, ChevronUp, Maximize2, Minimize2, PlusSquare } from 'lucide-react';
import { cn } from './lib/utils';
import { FavoritesView, ProfileView, NotificationView } from './components/UserViews';

const NavBtn = ({ active, icon: Icon, label, onClick, accent }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center transition-all flex-1 h-full",
      active 
        ? (accent ? "text-red-500" : "text-white") 
        : "text-white/20 hover:text-white/40"
    )}
  >
    <div className={cn("p-1 rounded-lg transition-all", active && (accent ? "bg-red-500/10" : "bg-white/10"))}>
      <Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", active ? "stroke-[3px]" : "stroke-2")} />
    </div>
    <span className={cn("text-[7px] md:text-[9px] font-black uppercase tracking-widest leading-none mt-1", active ? "opacity-100" : "opacity-30")}>{label}</span>
  </button>
);

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [view, setView] = useState<'dashboard' | 'ai' | 'chat' | 'suggest' | 'admin' | 'faq' | 'settings' | 'favorites' | 'profile' | 'notifications'>('dashboard');
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userStats, setUserStats] = useState({ copies: 0, shares: 0, likes: 0 });
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => localStorage.getItem('isAdminAuthenticated') === 'true');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [showSkipBoot, setShowSkipBoot] = useState(false);
  const [bootStatus, setBootStatus] = useState('Initializing Core...');
  const [initialAiPrompt, setInitialAiPrompt] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [isSuperOwner, setIsSuperOwner] = useState(false);

  const [apiConfigs, setApiConfigs] = useState<Record<string, { enabled: boolean, key: string, model: string }>>({
    'Gemini': { enabled: true, key: '', model: 'gemini-3-flash-preview' },
    'OpenAI': { enabled: false, key: '', model: 'gpt-4o' },
    'DeepSeek': { enabled: false, key: '', model: 'deepseek-chat' },
    'Anthropic': { enabled: false, key: '', model: 'claude-3-5-sonnet' },
    'OpenRouter': { enabled: false, key: '', model: 'google/gemini-2.0-flash-001' },
    'Grok': { enabled: false, key: '', model: 'grok-1' },
    'Qwen': { enabled: false, key: '', model: 'qwen-max' }
  });

  const updateApiConfig = (provider: string, updates: Partial<{ enabled: boolean, key: string, model: string }>) => {
    setApiConfigs(prev => ({
      ...prev,
      [provider]: { ...prev[provider], ...updates }
    }));
  };

  const models_list: Record<string, string[]> = {
    'Gemini': [
      'gemini-3-flash-preview', 
      'gemini-3.1-pro-preview', 
      'gemini-3.1-flash-lite', 
      'gemini-3.1-flash-live-preview'
    ],
    'OpenAI': ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
    'Anthropic': ['claude-3-5-sonnet', 'claude-3-opus', 'claude-3-haiku'],
    'OpenRouter': ['google/gemini-2.0-flash-001', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
    'Grok': ['grok-1', 'grok-1.5'],
    'Qwen': ['qwen-max', 'qwen-plus', 'qwen-turbo']
  };

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const installPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      showToast('Aplikasi sudah terinstal atau browser tidak mendukung.');
    }
  };

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [isBanned, setIsBanned] = useState(false);
  const [systemConfig, setSystemConfig] = useState<any>(null);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [activePopups, setActivePopups] = useState<any[]>([]);

  useEffect(() => {
    // Fail-safe to ensure boot screen disappears
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 8000);

    const sequence = async () => {
      try {
        setBootStatus('Connecting to Cloud...');
        await new Promise(r => setTimeout(r, 500));
        setBootStatus('Verifying Security Protocol...');
        
        // Show skip button after a short delay
        setTimeout(() => setShowSkipBoot(true), 2000);

        await new Promise(r => setTimeout(r, 400));
        setBootStatus('Syncing Database...');
        
        const qPrompts = query(collection(db, 'prompts'));
        const unsubPrompts = onSnapshot(qPrompts, (s) => {
          setPrompts(s.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt)));
          if (isBooting) {
            setBootStatus('Grextar Ready.');
            setTimeout(() => setIsBooting(false), 300);
          }
        }, (err) => {
          console.error('Prompts sync error:', err);
          setBootStatus('Limited Access Mode.');
          if (isBooting) setTimeout(() => setIsBooting(false), 1000);
        });

        const unsubModels = onSnapshot(query(collection(db, 'models')), (s) => {
          setModels(s.docs.map(doc => ({ id: doc.id, ...doc.data() } as Model)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'models'));

        return () => {
          unsubPrompts();
          unsubModels();
        };
      } catch (err) {
        setBootStatus('Resilience Mode Engaged.');
        console.error(err);
        setTimeout(() => setIsBooting(false), 1000);
      }
    };
    sequence();
    return () => clearTimeout(timer);
  }, []);

  // Listen for user favorites and stats
  useEffect(() => {
    if (user) {
      const unsubFavs = onSnapshot(doc(db, 'user_favorites', user.uid), (snap) => {
        if (snap.exists()) setFavorites(snap.data().ids || []);
      }, (err) => handleFirestoreError(err, OperationType.GET, `user_favorites/${user.uid}`));
      
      const unsubStats = onSnapshot(doc(db, 'user_profile_stats', user.uid), (snap) => {
        if (snap.exists()) setUserStats(snap.data() as any);
      }, (err) => handleFirestoreError(err, OperationType.GET, `user_profile_stats/${user.uid}`));
      
      return () => { unsubFavs(); unsubStats(); };
    }
  }, [user]);

  // Handle Deep Linking for shared prompts
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promptId = params.get('promptId');
    if (promptId && prompts.length > 0) {
      const prompt = prompts.find(p => p.id === promptId);
      if (prompt) {
        setInitialAiPrompt(prompt.content);
        setView('ai');
        // Clear param to prevent re-opening
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [prompts]);

  const [showAdminPassModal, setShowAdminPassModal] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState('');

  useEffect(() => {
    const unsubs: any[] = [];

    // 1. Check for Ban (only if user logged in)
    if (user) {
      const unsubBan = onSnapshot(doc(db, 'banned_users', user.uid), (snap) => {
        if (snap.exists()) {
          setIsBanned(true);
          logout();
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, `banned_users/${user.uid}`));
      unsubs.push(unsubBan);

      // 2. Refresh/Log User Metadata
      const logMetadata = async () => {
         try {
            const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => null);
            const ipData = ipRes ? await ipRes.json() : null;
            const locRes = await fetch('https://ipapi.co/json/').catch(() => null);
            const locData = locRes ? await locRes.json() : null;

            const data: any = {
              email: user.email,
              displayName: user.displayName,
              lastLogin: new Date().toISOString(),
              ip: ipData?.ip || 'Pending...',
              location: locData ? `${locData.city}, ${locData.country_name}` : 'Pending...',
              userAgent: navigator.userAgent
            };
            const docRef = doc(db, 'user_metadata', user.uid);
            await setDoc(docRef, data, { merge: true });
         } catch (e) { 
           console.error('Metadata log error:', e);
         }
      };
      logMetadata();
    }

    // 3. Load System Config (Always load)
    const unsubConfig = onSnapshot(doc(db, 'system_configs', 'main_prompt'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSystemConfig(data);
        
        // Maintenance logic
        if (data.maintenance?.active) {
          const now = new Date();
          const start = new Date(data.maintenance.startAt);
          const end = new Date(data.maintenance.endAt);
          
          if (now >= start && now <= end) {
             setIsMaintenanceMode(true);
             setMaintenanceNote(data.maintenance.note || 'Sistem sedang dalam pemeliharaan.');
          } else {
             setIsMaintenanceMode(false);
          }
        } else {
          setIsMaintenanceMode(false);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'system_configs/main_prompt'));
    unsubs.push(unsubConfig);

    // Super Owner & Owner Check
    const isOwner = user?.email === 'ayrarasya475@gmail.com';
    const isAdmin = isOwner || user?.email === 'poporasa6@gmail.com';
    
    setIsSuperOwner(isOwner);
    if (!isAdmin && isAdminAuthenticated) {
       setIsAdminAuthenticated(false);
       localStorage.removeItem('isAdminAuthenticated');
    }

    // 4. Load Broadcasts (Always load)
    const unsubBroadcasts = onSnapshot(query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc')), (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBroadcasts(all);
      
      const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
      setActivePopups(all.filter(b => !dismissed.includes(b.id)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'broadcasts'));
    unsubs.push(unsubBroadcasts);

    return () => unsubs.forEach(u => u());
  }, [user]);

  const toggleFavorite = async (id: string) => {
    if (!user) return signInWithGoogle();
    
    setFavorites(prev => {
      const current = new Set(prev);
      const isFav = current.has(id);
      if (isFav) current.delete(id);
      else current.add(id);
      const next = Array.from(current);
      
      // Update DB
      setDoc(doc(db, 'user_favorites', user.uid), { ids: next });
      
      return next;
    });

    const isFav = favorites.includes(id);
    showToast(isFav ? 'Dihapus dari favorit' : 'Ditambahkan ke favorit', 'success');
  };

  const sharePrompt = async (prompt: Prompt) => {
    const url = `${window.location.origin}?promptId=${prompt.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link berhasil disalin!', 'success');
      trackAction('share');
    } catch (e) {
      showToast('Gagal menyalin link');
    }
  };

  const trackAction = async (type: 'copy' | 'share' | 'like') => {
    if (!user) return;
    const docRef = doc(db, 'user_profile_stats', user.uid);
    const newVal = (userStats as any)[type === 'copy' ? 'copies' : type === 'share' ? 'shares' : 'likes'] + 1;
    await setDoc(docRef, { ...userStats, [type === 'copy' ? 'copies' : type === 'share' ? 'shares' : 'likes']: newVal }, { merge: true });
  };

  const filteredPrompts = [...prompts]
    .filter(p => {
      // Filter for active status or no status (fallback)
      const isActive = !p.status || p.status === 'active';
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
    if (!user) {
      showToast('Silakan login terlebih dahulu untuk mengakses Admin.', 'error');
      signInWithGoogle();
      return;
    }
    
    // Auto-login if previously authenticated and session is alive
    if (isAdminAuthenticated && (user?.email === 'ayrarasya475@gmail.com' || user?.email === 'poporasa6@gmail.com')) {
      setView('admin');
      return;
    }

    setShowAdminPassModal(true);
  };

  const confirmAdminPass = () => {
    if (adminPassInput === '97979797') {
      const isAuthorized = user?.email === 'ayrarasya475@gmail.com' || user?.email === 'poporasa6@gmail.com';
      
      if (isAuthorized) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('isAdminAuthenticated', 'true');
        showToast('Akses Admin Diberikan', 'success');
        setView('admin');
        setShowAdminPassModal(false);
        setAdminPassInput('');
      } else {
        showToast('Akses Terbatas: Anda bukan administrator terdaftar.');
        setAdminPassInput('');
      }
    } else {
      showToast('Akses Ditolak: Kode Salah');
      setAdminPassInput('');
    }
  };

  if (isMaintenanceMode && !isAdminAuthenticated && !isSuperOwner) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center overflow-hidden">
         <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
           className="absolute -top-40 -left-40 w-80 h-80 bg-red-500/10 blur-[120px] rounded-full"
         />
         <motion.div 
           animate={{ rotate: -360 }}
           transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
           className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/10 blur-[120px] rounded-full"
         />
         <Activity className="w-16 h-16 text-amber-500 mb-8 animate-pulse" />
         <h1 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic italic">SISTEM MAINTENANCE</h1>
         <div className="px-4 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Protokol Xerox Aktif</span>
         </div>
         <p className="text-white/40 text-xs max-w-md mx-auto leading-relaxed">{maintenanceNote}</p>
         <div className="mt-12 text-[8px] font-black text-white/5 uppercase tracking-[0.5em]">Tunggu beberapa saat lagi...</div>
         
         <button 
           onClick={handleAdminLogin}
           className="mt-20 opacity-10 hover:opacity-100 transition-opacity flex items-center gap-2 text-white/20 text-[10px] uppercase font-black tracking-widest"
         >
           <Shield className="w-3 h-3" /> Admin Bypass
         </button>
      </div>
    );
  }

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

  if (isBanned) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8 text-center">
         <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
         <h1 className="text-4xl font-black text-white mb-4">ACCESS DENIED</h1>
         <p className="text-white/40 text-sm max-w-md mx-auto">Perangkat atau akun Anda telah diblokir secara permanen dari sistem Grextar karena pelanggaran ketentuan layanan.</p>
         <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl">Re-Verify</button>
      </div>
    );
  }

  if (isBooting) {
    return (
      <div className="fixed inset-0 z-[300] bg-[#030303] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-10 relative"
        >
          {/* Main Logo Container */}
          <div className="w-32 h-32 relative">
            {/* outer rings */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-[1px] border-white/5 rounded-full"
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 border-[1px] border-white/5 rounded-full border-t-white/20"
            />
            {/* pulse core */}
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-8 bg-white/10 rounded-full blur-xl"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Terminal className="w-10 h-10 text-white" />
            </div>
          </div>
        </motion.div>

        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-3"
          >
            <span className="w-12 h-[1px] bg-white/10" />
            <h2 className="text-2xl font-black italic tracking-tighter text-white">GREXTAR</h2>
            <span className="w-12 h-[1px] bg-white/10" />
          </motion.div>
          
          <motion.div
            key={bootStatus}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-[10px] uppercase font-black tracking-[0.6em] text-white/40 pl-[0.6em]">
              {bootStatus}
            </p>
            <div className="flex gap-4">
              {bootStatus.includes('Error') && (
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all border border-white/5"
                >
                  Retry Connection
                </button>
              )}
              {showSkipBoot && (
                <button 
                  onClick={() => setIsBooting(false)}
                  className="px-6 py-2 bg-white text-black rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                >
                  Masuk Sekarang
                </button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Binary decoration */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 opacity-5 font-mono text-[8px] tracking-[1em] whitespace-nowrap overflow-hidden w-full text-center">
          01011001 01001111 01010101 01010010 01110011 01010101 01000011 01000011 01000101 01010011 01010011
        </div>
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

      {/* Broadcast Notifications */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[160] w-full max-w-sm px-4 flex flex-col gap-2 pointer-events-none">
         <AnimatePresence>
            {activePopups.map((b, i) => (
               <motion.div 
                 key={b.id}
                 initial={{ opacity: 0, y: -20, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="glass p-5 rounded-[24px] border-amber-500/20 bg-black/60 backdrop-blur-2xl shadow-3xl relative overflow-hidden group pointer-events-auto"
               >
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/40" />
                  <div className="flex justify-between items-start mb-2">
                     <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Broadcast</span>
                     </div>
                     <button 
                       onClick={() => {
                         const dismissed = JSON.parse(localStorage.getItem('dismissed_broadcasts') || '[]');
                         localStorage.setItem('dismissed_broadcasts', JSON.stringify([...dismissed, b.id]));
                         setActivePopups(prev => prev.filter(x => x.id !== b.id));
                       }}
                       className="p-1 hover:bg-white/5 rounded-full text-white/20 hover:text-white"
                     >
                       <X className="w-4 h-4" />
                     </button>
                  </div>
                  <h5 className="text-sm font-bold text-white pr-6">{b.title}</h5>
                  <p className="text-[11px] text-white/40 mt-1 leading-relaxed">{b.content}</p>
               </motion.div>
            ))}
         </AnimatePresence>
      </div>

      <Sidebar 
        currentView={view} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onViewChange={(v) => {
          if ((v === 'chat' || v === 'suggest' || v === 'ai') && !user) {
            signInWithGoogle();
          } else {
            setView(v);
            setIsSidebarOpen(false);
          }
        }} 
      />

      <main className={cn(
        "flex-1 flex flex-col items-center w-full min-h-screen relative z-10",
        view === 'dashboard' ? "px-4 md:px-12 pt-16 md:pt-24 pb-48" : "px-0 pt-0 pb-0"
      )}>
        {view === 'dashboard' && (
          <div className="w-full max-w-5xl flex flex-col items-center">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <div className="w-full max-w-2xl mt-8 md:mt-12 mb-8 relative group">
              <div className="absolute inset-0 bg-white/[0.02] blur-xl rounded-2xl group-focus-within:bg-red-500/5 transition-all" />
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-red-500/50 transition-colors z-10" />
              <input 
                type="text"
                placeholder="Search global prompt database..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 md:h-16 pl-14 pr-6 bg-black/40 border border-white/5 rounded-2xl text-sm focus:outline-none focus:border-red-500/20 transition-all placeholder:text-white/10 font-medium relative z-10"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/5 px-3 py-1 rounded-lg border border-white/5 text-[8px] font-black uppercase tracking-widest text-white/20 z-10">
                 ESC to clear
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 mb-12 no-scrollbar overflow-x-auto w-full px-4">
              <button
                onClick={() => setSelectedModel(null)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  !selectedModel ? "bg-white text-black border-white shadow-xl" : "bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white"
                )}
              >
                All Nodes
              </button>
              {models.map(m => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                    selectedModel === m.id ? "bg-white text-black border-white shadow-xl" : "bg-white/5 text-white/30 border-white/5 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {m.name}
                </button>
              ))}
            </div>

            <PromptGrid 
              prompts={filteredPrompts} 
              models={models} 
              showToast={showToast} 
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onShare={sharePrompt}
              onSendToAi={(content) => {
                setInitialAiPrompt(content);
                setView('ai');
              }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'notifications' && <NotificationView key="notif" broadcasts={broadcasts} onClose={() => setView('dashboard')} />}
          {view === 'ai' && (
            <AiChat 
              key="ai" 
              showToast={showToast} 
              initialPrompt={initialAiPrompt} 
              apiConfigs={apiConfigs}
              onClearInitial={() => setInitialAiPrompt(null)} 
              onClose={() => setView('dashboard')}
            />
          )}
          {view === 'chat' && <Chat key="chat" onClose={() => setView('dashboard')} showToast={showToast} />}
          {view === 'favorites' && (
            <FavoritesView 
              key="favorites" 
              prompts={prompts.filter(p => favorites.includes(p.id))} 
              models={models} 
              showToast={showToast} 
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onShare={sharePrompt}
              onSendToAi={(content) => { setInitialAiPrompt(content); setView('ai'); }} 
              onClose={() => setView('dashboard')} 
            />
          )}
          {view === 'profile' && <ProfileView key="profile" user={user} stats={userStats} isAdmin={isAdminAuthenticated} onAdminLogin={handleAdminLogin} logout={logout} onClose={() => setView('dashboard')} />}
          {view === 'suggest' && <SuggestionForm key="suggest" onClose={() => setView('dashboard')} showToast={showToast} />}
          {view === 'admin' && <AdminPanel key="admin" onClose={() => setView('dashboard')} showToast={showToast} />}
          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-32"
            >
              {/* Settings Header - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 bg-white/[0.02] p-6 sm:p-8 rounded-[32px] border border-white/5">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-[24px] flex items-center justify-center shadow-2xl">
                    <SettingsIcon className="w-7 h-7 sm:w-8 sm:h-8 text-white/80" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase text-white">Config Panel</h2>
                    <p className="text-white/20 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.5em] mt-1">Universal AI Interconnect</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                   <button onClick={() => setView('dashboard')} className="flex-1 sm:flex-none px-6 py-3 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Back</button>
                   <button onClick={() => { setView('dashboard'); showToast('Konfigurasi disimpan', 'success'); }} className="flex-1 sm:flex-none px-8 py-3 bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all font-bold">Save</button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Secondary Sidebar Content */}
                <div className="lg:col-span-4 space-y-6">
                   <div className="p-6 sm:p-8 bg-white/[0.02] border border-white/5 rounded-[32px] backdrop-blur-xl">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" />
                        Quick Actions
                      </h3>
      <div className="space-y-3">
        <button 
          onClick={installPWA} 
          className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 hover:border-white/20 transition-all"
        >
          <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/40 group-hover:text-white transition-all">
                <PlusSquare className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-all">Install App</span>
          </div>
          <ChevronDown className="w-4 h-4 text-white/10 -rotate-90" />
        </button>

        <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Kotak Masuk
          </h3>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
            {broadcasts.length > 0 ? broadcasts.map(b => (
              <div key={b.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest mb-1">{b.title}</h4>
                <p className="text-[11px] text-white/40 leading-tight mb-2">{b.content}</p>
                <p className="text-[8px] font-bold text-white/10 uppercase tracking-widest">{new Date(b.createdAt).toLocaleDateString()}</p>
              </div>
            )) : (
              <p className="text-[10px] text-white/10 text-center py-10 italic">Tidak ada pesan baru.</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-white/[0.01] rounded-2xl border border-white/5">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20 mb-2 block">System Status</span>
                            <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                               <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Core Synchronized</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Main API Configs Grid */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(apiConfigs).map(([provider, config]) => (
                      <div key={provider} className={cn(
                        "p-6 rounded-[32px] border transition-all duration-500 overflow-hidden relative group",
                        config.enabled 
                          ? "bg-white/[0.03] border-white/10 shadow-2xl" 
                          : "bg-black/20 border-white/5 opacity-40 grayscale"
                      )}>
                        {config.enabled && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 rounded-full" />
                        )}
                        
                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                              config.enabled ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/5 text-white/10"
                            )}>
                              {provider === 'Gemini' ? <Sparkles className="w-5 h-5" /> : <Terminal className="w-5 h-5" />}
                            </div>
                            <div>
                               <span className="text-[11px] font-black uppercase tracking-widest text-white/80 block">{provider}</span>
                               <span className={cn("text-[8px] font-black uppercase tracking-widest", config.enabled ? "text-emerald-500" : "text-white/10")}>
                                 {config.enabled ? "Online" : "Offline"}
                               </span>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => updateApiConfig(provider, { enabled: !config.enabled })}
                            className={cn(
                              "w-12 h-6 rounded-full relative transition-all duration-500",
                              config.enabled ? "bg-white" : "bg-white/10"
                            )}
                          >
                            <motion.div 
                              animate={{ x: config.enabled ? 24 : 0 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className={cn("absolute top-1 left-1 w-4 h-4 rounded-full shadow-lg", config.enabled ? "bg-black" : "bg-white/20")} 
                            />
                          </button>
                        </div>

                        {config.enabled && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            className="space-y-5 relative z-10"
                          >
                            <div className="h-[1px] w-full bg-white/5" />
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Secret Key</label>
                              <div className="relative">
                                <input 
                                  type="password" 
                                  value={config.key}
                                  onChange={(e) => updateApiConfig(provider, { key: e.target.value })}
                                  placeholder={provider === 'Gemini' ? "Global SDK (Default)" : "sk-..."}
                                  className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl px-5 text-[11px] font-mono outline-none focus:border-white/30 transition-all placeholder:text-white/10 text-white"
                                />
                                <Shield className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5", config.key ? "text-white/40" : "text-white/10")} />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-2">Select Model</label>
                              <div className="relative">
                                <select 
                                  value={config.model}
                                  onChange={(e) => updateApiConfig(provider, { model: e.target.value })}
                                  className="w-full h-12 bg-white/[0.02] border border-white/10 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-white/30 appearance-none text-white/60 cursor-pointer"
                                >
                                  {models_list[provider].map(m => <option key={m} value={m} className="bg-[#0a0a0a] text-white py-2">{m}</option>)}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {view === 'faq' && (
            // ... (keep FAQ as is but update classes)
            <motion.div 
              key="faq"
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="max-w-xl w-full glass p-8 rounded-[32px] mt-8"
            >
              <h2 className="text-xl font-black mb-6 tracking-tight">FAQ</h2>
              <div className="space-y-6 text-sm">
                <div>
                  <p className="font-bold text-white/80 mb-2 text-xs">Bagaimana cara menggunakan Grextar?</p>
                  <p className="text-white/40 leading-relaxed text-[11px]">Cari prompt yang Anda butuhkan, salin kodenya, dan tempelkan ke model AI favorit Anda.</p>
                </div>
                <div>
                  <p className="font-bold text-white/80 mb-2 text-xs">Berapa biaya layanannya?</p>
                  <p className="text-white/40 leading-relaxed text-[11px]">Grextar 100% gratis untuk komunitas selamanya.</p>
                </div>
              </div>
              <button onClick={() => setView('dashboard')} className="mt-10 btn-secondary w-full">Kembali Ke Beranda</button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Refined */}
      {view !== 'admin' && (
        <div className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
          <div className="bg-black/80 backdrop-blur-3xl h-14 w-full max-w-sm rounded-[24px] border border-white/10 flex items-center justify-around px-2 shadow-[0_25px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
            <NavBtn active={view === 'dashboard'} icon={LayoutGrid} label="Home" onClick={() => setView('dashboard')} />
            <NavBtn active={view === 'ai'} icon={Sparkles} label="Grextar" onClick={() => { if (!user) signInWithGoogle(); else setView('ai'); }} accent />
            <NavBtn active={view === 'favorites'} icon={Heart} label="Fav" onClick={() => { if (!user) signInWithGoogle(); else setView('favorites'); }} />
            <NavBtn active={view === 'profile'} icon={UserIcon} label="Me" onClick={() => { if (!user) signInWithGoogle(); else setView('profile'); }} />
            <NavBtn active={view === 'settings'} icon={SettingsIcon} label="Set" onClick={() => setView('settings')} />
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      {view !== 'admin' && view !== 'ai' && (
        <div className="fixed top-6 right-6 md:top-8 md:right-8 z-[51] flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setView('notifications')} 
            className={cn("p-3 rounded-2xl transition-all border glass relative", view === 'notifications' ? "bg-white text-black border-white" : "text-white/40 border-white/5 hover:border-white/10 hover:text-white")}
          >
            <Bell className="w-5 h-5 md:w-4 md:h-4" />
            {broadcasts.length > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full border-2 border-[#030303]" />
            )}
          </button>
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
              if (isAdminAuthenticated) {
                setView('admin');
              } else {
                handleAdminLogin();
              }
            }}
            className={cn(
              "p-3 rounded-2xl transition-all border bg-white/5 text-white/40 border-white/5 hover:border-white/10"
            )}
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Password Modal */}
      <AnimatePresence>
        {showAdminPassModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm glass p-8 rounded-[32px] border-white/10"
            >
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-red-500/10 rounded-2xl text-red-500">
                    <Shield className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-xl font-black italic tracking-tight">ADMIN ACCESS</h3>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Security Clearance Required</p>
                 </div>
              </div>
              
              <input 
                type="password"
                placeholder="Entry code..."
                autoFocus
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmAdminPass()}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-center text-lg font-mono tracking-[0.5em] outline-none focus:border-white/20 transition-all mb-6"
              />

              <div className="flex gap-3">
                <button onClick={confirmAdminPass} className="flex-1 h-12 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all">Verify</button>
                <button onClick={() => setShowAdminPassModal(false)} className="h-12 px-6 glass text-[10px] font-black uppercase tracking-widest rounded-xl text-white/40">Cancel</button>
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
