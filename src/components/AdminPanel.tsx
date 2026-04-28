import { useState, useEffect, FormEvent, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Prompt, Model, Suggestion, StatsLog, ChatSession } from '../types';
import { Plus, Database, BarChart3, MessageSquare, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminPanel({ onClose }: { onClose: () => void, key?: string }) {
  const [tab, setTab] = useState<'add' | 'model' | 'data' | 'service' | 'suggestions'>('add');
  
  const [user, loading] = useAuthState(auth);
  const isAdminAccount = user?.email === 'ayrarasya475@gmail.com';

  if (loading) return null;

  if (!isAdminAccount) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-8 text-center">
        <div className="max-w-sm">
          <h3 className="text-xl font-bold mb-4">Akses Tersentralisasi</h3>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Anda telah memasukkan sandi akses, namun akun Google Anda (<strong>{user?.email || 'Belum Login'}</strong>) tidak terdaftar sebagai administrator di database.
          </p>
          <button onClick={onClose} className="btn-primary w-full">Kembali</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-black/90 backdrop-blur-xl"
    >
      <div className="w-full h-full md:max-w-6xl md:h-[85vh] glass md:rounded-[40px] flex flex-col md:flex-row overflow-hidden shadow-2xl border-white/10">
        {/* Admin Sidebar */}
        <div className="w-full md:w-64 bg-white/[0.02] border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-8 flex flex-row md:flex-col items-center md:items-stretch overflow-x-auto no-scrollbar">
          <div className="hidden md:block mb-10">
            <h2 className="text-lg font-black tracking-tighter text-white">ADMIN HUB</h2>
            <p className="text-[9px] text-white/20 font-bold uppercase tracking-widest mt-1">Management</p>
          </div>
          
          <nav className="flex md:flex-col gap-2 flex-1">
            <AdminTabBtn active={tab === 'add'} onClick={() => setTab('add')} label="Add" icon={Plus} />
            <AdminTabBtn active={tab === 'model'} onClick={() => setTab('model')} label="Model" icon={Database} />
            <AdminTabBtn active={tab === 'suggestions'} onClick={() => setTab('suggestions')} label="Saran" icon={CheckCircle2} />
            <AdminTabBtn active={tab === 'data'} onClick={() => setTab('data')} label="Stats" icon={BarChart3} />
            <AdminTabBtn active={tab === 'service'} onClick={() => setTab('service')} label="Live" icon={MessageSquare} />
          </nav>

          <button onClick={onClose} className="ml-4 md:ml-0 md:mt-auto py-2.5 px-4 glass rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 whitespace-nowrap">
            Exit
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-10 overflow-y-auto scrollbar-hide bg-black/20">
          <AnimatePresence mode="wait">
            {tab === 'add' && <AddPromptTab key="add" />}
            {tab === 'model' && <ModelTab key="model" />}
            {tab === 'suggestions' && <SuggestionsTab key="sug" />}
            {tab === 'data' && <DataTab key="data" />}
            {tab === 'service' && <ServiceTab key="service" />}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function AdminTabBtn({ active, onClick, label, icon: Icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group whitespace-nowrap",
        active ? "bg-white text-black" : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className={cn("w-4 h-4", active ? "text-black" : "text-white/20 group-hover:text-white/40")} />
      <span className="text-[11px] font-black uppercase tracking-wider hidden md:block">{label}</span>
    </button>
  );
}

function AddPromptTab() {
  const [models, setModels] = useState<Model[]>([]);
  const [form, setForm] = useState({ name: '', content: '', modelId: '' });

  useEffect(() => {
    getDocs(collection(db, 'models'))
      .then(s => setModels(s.docs.map(d => ({ id: d.id, ...d.data() } as Model))))
      .catch(err => handleFirestoreError(err, OperationType.GET, 'models'));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.content || !form.modelId) return alert('Data wajib diisi!');
    await addDoc(collection(db, 'prompts'), {
      ...form,
      likes: 0,
      copyCount: 0,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      status: 'active'
    });
    setForm({ name: '', content: '', modelId: '' });
    alert('Prompt berhasil ditambahkan!');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-2xl">
      <h3 className="text-xl font-bold mb-8">Tambah Prompt</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Nama Prompt</label>
          <input 
            type="text" 
            className="w-full h-12 bg-white/5 border border-white/5 rounded-xl px-5 text-sm outline-none"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            placeholder="Contoh: Profesional SEO"
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Pilih Model</label>
          <select 
            className="w-full h-12 bg-white/5 border border-white/5 rounded-xl px-5 text-sm outline-none appearance-none"
            value={form.modelId}
            onChange={e => setForm({...form, modelId: e.target.value})}
          >
            <option value="" disabled className="bg-zinc-900">Pilih...</option>
            {models.map(m => <option key={m.id} value={m.id} className="bg-zinc-900">{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Isi Prompt</label>
          <textarea 
            className="w-full h-40 bg-white/5 border border-white/5 rounded-xl p-5 text-sm outline-none resize-none"
            value={form.content}
            onChange={e => setForm({...form, content: e.target.value})}
            placeholder="Tulis instruksi lengkap..."
          />
        </div>
        <button type="submit" className="w-full btn-primary h-12">Simpan Prompt</button>
      </form>
    </motion.div>
  );
}

function ModelTab() {
  const [models, setModels] = useState<Model[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'models'));
    return onSnapshot(q, 
      s => setModels(s.docs.map(d => ({ id: d.id, ...d.data() } as Model))),
      err => handleFirestoreError(err, OperationType.LIST, 'models')
    );
  }, []);

  const addModel = async () => {
    if (!name.trim()) return;
    try {
      await addDoc(collection(db, 'models'), { name: name.trim() });
      setName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'models');
    }
  };

  const deleteModel = async (id: string) => {
    if (!confirm('Hapus model ini?')) return;
    try {
      await deleteDoc(doc(db, 'models', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `models/${id}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 className="text-3xl font-black mb-8 italic tracking-tighter">Manajemen Model</h3>
      <div className="flex gap-4 mb-10">
        <input 
          type="text" 
          className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nama Model (Contoh: GPT-4o)"
        />
        <button onClick={addModel} className="px-8 h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl">Tambah</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {models.map(m => (
          <div key={m.id} className="glass p-5 rounded-2xl flex items-center justify-between group">
            <span className="font-bold">{m.name}</span>
            <button onClick={() => deleteModel(m.id)} className="p-2 opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SuggestionsTab() {
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, 
      s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as Suggestion))),
      err => handleFirestoreError(err, OperationType.LIST, 'suggestions')
    );
  }, []);

  const resolve = async (id: string) => {
    if (confirm('Hapus saran ini?')) await deleteDoc(doc(db, 'suggestions', id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 className="text-3xl font-black mb-8 italic tracking-tighter">Saran dari User</h3>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="glass p-6 rounded-2xl border-l-4 border-blue-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-xl">{item.promptName}</h4>
                <p className="text-xs text-white/40">Oleh: <span className="text-white">{item.userName}</span></p>
              </div>
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", item.status === 'legal' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                {item.status}
              </div>
            </div>
            <p className="text-sm text-white/60 mb-6">{item.details}</p>
            <button onClick={() => resolve(item.id)} className="text-xs font-bold text-red-400 hover:underline">Selesaikan / Hapus</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-white/20 italic">Tidak ada saran masuk.</p>}
      </div>
    </motion.div>
  );
}

function DataTab() {
  const [logs, setLogs] = useState<StatsLog[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    getDocs(collection(db, 'stats_logs'))
      .then(s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() } as StatsLog))))
      .catch(err => handleFirestoreError(err, OperationType.GET, 'stats_logs'));
    getDocs(collection(db, 'prompts'))
      .then(s => setPrompts(s.docs.map(d => ({ id: d.id, ...d.data() } as Prompt))))
      .catch(err => handleFirestoreError(err, OperationType.GET, 'prompts'));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 className="text-3xl font-black mb-8 italic tracking-tighter">Statistik Penggunaan</h3>
      <div className="grid grid-cols-3 gap-6 mb-12">
        <StatCard label="Total Copy" value={logs.filter(l => l.type === 'copy').length} />
        <StatCard label="Total Download" value={logs.filter(l => l.type === 'download').length} />
        <StatCard label="Total Like" value={logs.filter(l => l.type === 'like').length} />
      </div>
      
      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Leaderboard Prompt</h4>
        <div className="glass rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-white/40">
                <th className="px-6 py-4">Nama Prompt</th>
                <th className="px-6 py-4">Model</th>
                <th className="px-6 py-4 text-center">Copy</th>
                <th className="px-6 py-4 text-center">D/L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[...prompts].sort((a,b) => ((b.copyCount || 0) + (b.downloadCount || 0)) - ((a.copyCount || 0) + (a.downloadCount || 0))).map(p => (
                <tr key={p.id} className="text-sm">
                  <td className="px-6 py-4 font-bold">{p.name}</td>
                  <td className="px-6 py-4 text-white/40">{p.modelId}</td>
                  <td className="px-6 py-4 text-center">{p.copyCount || 0}</td>
                  <td className="px-6 py-4 text-center">{p.downloadCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value }: any) {
  return (
    <div className="glass p-6 rounded-3xl">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">{label}</p>
      <p className="text-4xl font-black italic">{value.toLocaleString()}</p>
    </div>
  );
}

function ServiceTab() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'chat_sessions'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, 
      s => setSessions(s.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession))),
      err => handleFirestoreError(err, OperationType.LIST, 'chat_sessions')
    );
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col max-h-[85vh] md:max-h-none">
      <div className="flex items-center justify-between mb-4 md:mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-xl md:text-3xl font-black italic tracking-tighter">Customer Service</h3>
          <span className="hidden md:inline-block px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/40">Real-time</span>
        </div>
        {activeSession && (
          <button 
            onClick={() => setActiveSession(null)}
            className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2"
          >
            ← Daftar Chat
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
        {/* Session List */}
        <div className={cn(
          "w-full md:w-80 flex flex-col gap-2 overflow-y-auto pr-1 md:pr-2 scrollbar-hide shrink-0",
          activeSession ? "hidden md:flex" : "flex"
        )}>
          {sessions.map(s => (
            <button 
              key={s.id}
              onClick={() => setActiveSession(s.id)}
              className={cn(
                "w-full text-left p-4 rounded-xl md:rounded-2xl transition-all border group",
                activeSession === s.id 
                  ? "bg-white text-black border-white shadow-xl shadow-white/5" 
                  : "bg-white/[0.03] border-white/5 hover:border-white/20"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="text-[11px] md:text-xs font-bold truncate leading-tight uppercase tracking-tight max-w-[70%]">{s.userEmail || 'Anonymous User'}</p>
                <p className={cn("text-[8px] font-black uppercase tracking-widest shrink-0 ml-2", activeSession === s.id ? "text-black/40" : "text-white/20")}>
                  {s.updatedAt ? format(new Date(s.updatedAt), 'HH:mm') : '--:--'}
                </p>
              </div>
              <p className={cn(
                "text-[10px] font-medium truncate italic",
                activeSession === s.id ? "text-black/60" : "text-white/30"
              )}>
                {s.lastMessage || 'Menunggu pesan...'}
              </p>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-3xl opacity-30">
              <MessageSquare className="w-6 h-6 mb-2" />
              <p className="text-[8px] uppercase font-black tracking-[0.3em]">No Active Sessions</p>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 glass rounded-2xl md:rounded-3xl relative overflow-hidden flex flex-col",
          !activeSession ? "hidden md:flex" : "flex h-[calc(100vh-250px)] md:h-auto"
        )}>
          {activeSession ? (
            <AdminChat sessionId={activeSession} />
          ) : (
             <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-white/[0.01]">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-white/5 animate-pulse">
                <MessageSquare className="w-10 h-10" strokeWidth={1} />
              </div>
              <h4 className="text-white/20 text-xs font-black uppercase tracking-[0.4em] mb-2">Help Desk Ready</h4>
              <p className="text-white/10 text-[10px] font-bold max-w-[200px] mx-auto leading-relaxed">
                Pilih salah satu percakapan di sebelah kiri untuk mulai memberikan bantuan.
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function AdminChat({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, `chat_sessions/${sessionId}/messages`), orderBy('createdAt', 'asc'));
    return onSnapshot(q, 
      s => setMessages(s.docs.map(d => ({ id: d.id, ...d.data() }))),
      err => handleFirestoreError(err, OperationType.LIST, `chat_sessions/${sessionId}/messages`)
    );
  }, [sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    try {
      await addDoc(collection(db, `chat_sessions/${sessionId}/messages`), {
        text: msg,
        senderId: 'admin',
        chatId: sessionId,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'chat_sessions', sessionId), {
        lastMessage: msg,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-hide">
        {messages.map(m => (
          <div key={m.id} className={cn("flex", m.senderId === 'admin' ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] md:max-w-[80%] p-3.5 md:p-4 rounded-2xl text-[12px] md:text-sm font-medium leading-relaxed shadow-sm",
              m.senderId === 'admin' ? "bg-white text-black rounded-tr-none" : "bg-white/10 text-white rounded-tl-none border border-white/5"
            )}>
              {m.text}
              <p className={cn("text-[8px] mt-1.5 font-bold opacity-40 text-right uppercase tracking-[0.1em]", m.senderId === 'admin' ? "text-black" : "text-white")}>
                {m.createdAt ? format(new Date(m.createdAt), 'HH:mm') : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="p-3 md:p-6 bg-white/[0.03] border-t border-white/5 flex gap-2 md:gap-4 sticky bottom-0">
        <input 
          type="text" 
          className="flex-1 h-11 md:h-14 bg-white/5 border border-white/5 rounded-xl md:rounded-2xl px-4 md:px-6 outline-none text-xs md:text-sm placeholder:text-white/20 focus:border-white/10 transition-all"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Tulis balasan..."
        />
        <button type="submit" className="w-11 md:w-14 h-11 md:h-14 flex items-center justify-center bg-white text-black rounded-xl md:rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-white/5">
          <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </form>
    </>
  );
}
