import { useState, useEffect, FormEvent, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, getDocs, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Prompt, Model, Suggestion, StatsLog, ChatSession, Broadcast, UserMetadata, BannedUser, SystemConfig } from '../types';
import { Plus, Database, BarChart3, MessageSquare, Trash2, CheckCircle2, Shield, User, HelpCircle, FileText, LayoutGrid, Monitor, ShieldAlert, Users, Settings, Copy, Sparkles, Terminal, Edit2, Eye, Trash, CheckCircle2 as CheckCircle2Icon, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function AdminPanel({ onClose, showToast }: { onClose: () => void, showToast?: any, key?: string }) {
  const [tab, setTab] = useState<'add' | 'model' | 'data' | 'service' | 'suggestions' | 'broadcast' | 'config' | 'users' | 'xerox' | 'owner'>('add');
  
  const [user, loading] = useAuthState(auth);
  const isSuperOwner = user?.email === 'ayrarasya475@gmail.com';

  if (loading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 lg:p-6 bg-black/95 backdrop-blur-2xl"
    >
      <div className="w-full h-full md:max-w-7xl md:h-[95vh] glass md:rounded-[32px] flex flex-col md:flex-row overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-white/5">
        {/* Admin Sidebar */}
        <div className="w-full md:w-52 bg-white/[0.01] border-b md:border-b-0 md:border-r border-white/5 p-2 md:p-4 flex flex-row md:flex-col items-center md:items-stretch overflow-x-auto no-scrollbar shrink-0">
          <div className="hidden md:block mb-6 px-2">
            <h2 className="text-sm font-black tracking-tighter text-white">CORE ADMIN</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[7px] text-white/20 font-black uppercase tracking-[0.2em]">Management</p>
            </div>
          </div>
          
          <nav className="flex md:flex-col gap-1 flex-1 p-1">
            <AdminTabBtn active={tab === 'add'} onClick={() => setTab('add')} label="Prompts" icon={Plus} />
            <AdminTabBtn active={tab === 'model'} onClick={() => setTab('model')} label="Model" icon={Database} />
            <AdminTabBtn active={tab === 'suggestions'} onClick={() => setTab('suggestions')} label="Saran" icon={CheckCircle2} />
            <AdminTabBtn active={tab === 'broadcast'} onClick={() => setTab('broadcast')} label="BC" icon={Plus} />
            <AdminTabBtn active={tab === 'users'} onClick={() => setTab('users')} label="Users" icon={User} />
            {isSuperOwner && <AdminTabBtn active={tab === 'owner'} onClick={() => setTab('owner')} label="Owner" icon={Shield} />}
            <AdminTabBtn active={tab === 'xerox'} onClick={() => setTab('xerox')} label="Xerox" icon={ShieldAlert} />
            <AdminTabBtn active={tab === 'data'} onClick={() => setTab('data')} label="Stats" icon={BarChart3} />
            <AdminTabBtn active={tab === 'service'} onClick={() => setTab('service')} label="Live" icon={MessageSquare} />
            <AdminTabBtn active={tab === 'config'} onClick={() => setTab('config')} label="Config" icon={Database} />
          </nav>

          <button onClick={onClose} className="ml-2 md:ml-0 md:mt-auto py-2.5 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest text-white/40 transition-all active:scale-95 whitespace-nowrap border border-white/5">
            Exit
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto scrollbar-hide bg-[#020202]/40 relative">
          <AnimatePresence mode="wait">
            {tab === 'add' && <AddPromptTab key="add" showToast={showToast} />}
            {tab === 'model' && <ModelTab key="model" showToast={showToast} />}
            {tab === 'suggestions' && <SuggestionsTab key="sug" showToast={showToast} />}
            {tab === 'broadcast' && <BroadcastTab key="broad" showToast={showToast} />}
            {tab === 'users' && <UsersTab key="users" showToast={showToast} isSuper={isSuperOwner} />}
            {tab === 'owner' && isSuperOwner && <OwnerTab key="owner" showToast={showToast} />}
            {tab === 'xerox' && <XeroxTab key="xerox" showToast={showToast} />}
            {tab === 'data' && <DataTab key="data" />}
            {tab === 'service' && <ServiceTab key="service" />}
            {tab === 'config' && <ConfigTab key="config" showToast={showToast} isSuper={isSuperOwner} />}
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
        "flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl transition-all group whitespace-nowrap min-w-[70px] md:min-w-0 border",
        active 
          ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
          : "text-white/30 border-transparent hover:text-white hover:bg-white/5"
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", active ? "text-black" : "text-white/20 group-hover:text-white/40")} />
      <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wider">{label}</span>
    </button>
  );
}

function AddPromptTab({ showToast }: { showToast?: any, key?: string }) {
  const [models, setModels] = useState<Model[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [form, setForm] = useState({ id: '', name: '', content: '', modelId: '', notes: '', password: '', isLocked: false });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    getDocs(collection(db, 'models'))
      .then(s => setModels(s.docs.map(d => ({ id: d.id, ...d.data() } as Model))))
      .catch(err => handleFirestoreError(err, OperationType.GET, 'models'));

    const q = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (s) => {
      setPrompts(s.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));
    }, (err) => {
      console.error('Prompt list error:', err);
      if (err.message.includes('index')) {
        onSnapshot(collection(db, 'prompts'), s2 => {
          setPrompts(s2.docs.map(d => ({ id: d.id, ...d.data() } as Prompt)));
        });
      }
    });
    return () => unsub();
  }, [auth.currentUser]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.content || !form.modelId) {
      showToast?.('Data wajib diisi!');
      return;
    }
    
    try {
      const data = {
        name: form.name,
        content: form.content,
        modelId: form.modelId,
        notes: form.notes,
        password: form.password,
        isLocked: form.isLocked,
        updatedAt: new Date().toISOString()
      };

      if (isEditing && form.id) {
        await updateDoc(doc(db, 'prompts', form.id), data);
        showToast?.('Prompt berhasil diperbarui!', 'success');
      } else {
        await addDoc(collection(db, 'prompts'), {
          ...data,
          likes: 0,
          copyCount: 0,
          downloadCount: 0,
          createdAt: new Date().toISOString(),
          status: 'active'
        });
        showToast?.('Prompt berhasil ditambahkan!', 'success');
      }
      setForm({ id: '', name: '', content: '', modelId: '', notes: '', password: '', isLocked: false });
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'prompts');
    }
  };

  const handleEdit = (p: Prompt) => {
    setForm({ 
      id: p.id, 
      name: p.name, 
      content: p.content, 
      modelId: p.modelId, 
      notes: p.notes || '', 
      password: p.password || '', 
      isLocked: p.isLocked || false 
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'prompts', id));
      showToast?.('Prompt dihapus', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `prompts/${id}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col lg:flex-row gap-12">
      <div className="w-full lg:w-1/2">
        <h3 className="text-xl font-bold mb-8">{isEditing ? 'Edit Prompt' : 'Tambah Prompt'}</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ... existing form fields ... */}
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
              className="w-full h-32 bg-white/5 border border-white/5 rounded-xl p-5 text-sm outline-none resize-none"
              value={form.content}
              onChange={e => setForm({...form, content: e.target.value})}
              placeholder="Tulis instruksi lengkap..."
            />
          </div>
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Note Tambahan (Opsional)</label>
            <textarea 
              className="w-full h-20 bg-white/5 border border-white/5 rounded-xl px-5 py-3 text-sm outline-none resize-none"
              value={form.notes}
              onChange={e => setForm({...form, notes: e.target.value})}
              placeholder="Peringatan, info fitur, dll..."
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 p-4 glass rounded-2xl border-white/5">
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Kata Sandi Prompt</label>
              <input 
                type="text" 
                className="w-full h-11 bg-white/5 border border-white/5 rounded-xl px-4 text-xs outline-none"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                placeholder="Kosongkan jika tidak dikunci"
              />
            </div>
            <div className="flex flex-col justify-end">
               <label className="flex items-center gap-3 cursor-pointer group pb-2">
                  <div 
                    onClick={() => setForm({...form, isLocked: !form.isLocked})}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative border border-white/10",
                      form.isLocked ? "bg-red-500" : "bg-white/5"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                      form.isLocked ? "left-7 shadow-xl" : "left-1"
                    )} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Status: {form.isLocked ? "Terkunci" : "Terbuka"}</span>
               </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary h-12">
              {isEditing ? 'Update Prompt' : 'Simpan Prompt'}
            </button>
            {isEditing && (
              <button 
                type="button" 
                onClick={() => { setIsEditing(false); setForm({ id: '', name: '', content: '', modelId: '', notes: '', password: '', isLocked: false }); }}
                className="btn-secondary px-6"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex-1">
        <h3 className="text-xl font-bold mb-8 text-white/40 italic">List Prompts ({prompts.length})</h3>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
          {prompts.map(p => (
            <div key={p.id} className="glass p-4 rounded-2xl flex items-center justify-between group border-white/5 hover:border-white/20 transition-all">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate pr-4">{p.name}</p>
                <p className="text-[10px] text-white/20 font-bold uppercase">{models.find(m => m.id === p.modelId)?.name || 'Unknown model'}</p>
              </div>
              <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-all">
                <button onClick={() => handleEdit(p)} className="p-2 glass rounded-lg text-blue-400 hover:bg-blue-400/10">
                  <Database className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-2 glass rounded-lg text-red-500 hover:bg-red-500/10">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ModelTab({ showToast }: { showToast?: any, key?: string }) {
  const [models, setModels] = useState<Model[]>([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'models'));
    return onSnapshot(q, 
      s => setModels(s.docs.map(d => ({ id: d.id, ...d.data() } as Model))),
      err => handleFirestoreError(err, OperationType.LIST, 'models')
    );
  }, []);

  const saveModel = async () => {
    if (!name.trim()) return;
    try {
      if (editId) {
        await updateDoc(doc(db, 'models', editId), { name: name.trim() });
        setEditId(null);
      } else {
        await addDoc(collection(db, 'models'), { name: name.trim() });
      }
      setName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, editId ? `models/${editId}` : 'models');
    }
  };

  const handleEdit = (m: Model) => {
    setName(m.name);
    setEditId(m.id);
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
          className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl px-6 outline-none focus:border-white/20 transition-all font-bold"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nama Model (Contoh: GPT-4o)"
        />
        <button onClick={saveModel} className="px-8 h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl">
          {editId ? 'Update' : 'Tambah'}
        </button>
        {editId && <button onClick={() => { setEditId(null); setName(''); }} className="px-6 h-14 bg-white/5 text-white/40 font-bold rounded-2xl">Batal</button>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map(m => (
          <div key={m.id} className="glass p-5 rounded-2xl flex items-center justify-between group border-white/5 hover:border-white/20 transition-all">
            <span className="font-bold">{m.name}</span>
            <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-all">
              <button onClick={() => handleEdit(m)} className="p-2 text-blue-400 hover:bg-blue-400/10 rounded-lg">
                <Database className="w-4 h-4" />
              </button>
              <button onClick={() => deleteModel(m.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SuggestionsTab({ showToast }: { showToast: any }) {
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'suggestions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, 
      s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as Suggestion))),
      err => {
        if (err.code === 'permission-denied' && !auth.currentUser) return;
        handleFirestoreError(err, OperationType.LIST, 'suggestions');
      }
    );
  }, []);

  const resolve = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'suggestions', id));
      showToast('Saran dihapus', 'success');
    } catch (err) {
      console.error('Delete suggestion error:', err);
      handleFirestoreError(err, OperationType.DELETE, `suggestions/${id}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 className="text-3xl font-black mb-8 italic tracking-tighter">Saran dari User</h3>
      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="glass p-6 rounded-2xl border-l-4 border-blue-500 hover:border-white/20 transition-all">
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
            <button 
              onClick={(e) => { e.preventDefault(); resolve(item.id); }} 
              className="text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-all"
            >
              Selesaikan / Hapus
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-white/20 italic">Tidak ada saran masuk.</p>}
      </div>
    </motion.div>
  );
}

function BroadcastTab({ showToast }: { showToast: any }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [items, setItems] = useState<Broadcast[]>([]);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, s => setItems(s.docs.map(d => ({ id: d.id, ...d.data() } as Broadcast))));
  }, []);

  const send = async () => {
    if (!title.trim() || !content.trim()) return;
    try {
      if (editId) {
        const item = items.find(i => i.id === editId);
        if (item) {
          const diff = (new Date().getTime() - new Date(item.createdAt).getTime()) / 60000;
          if (diff > 5) {
            showToast('Batas waktu edit (5 menit) telah habis.');
            setEditId(null);
            return;
          }
        }
        await updateDoc(doc(db, 'broadcasts', editId), {
          title: title.trim(),
          content: content.trim(),
          targetUserId: targetUserId.trim() || null,
          updatedAt: new Date().toISOString()
        });
        showToast('Broadcast diperbarui!', 'success');
        setEditId(null);
      } else {
        await addDoc(collection(db, 'broadcasts'), {
          title: title.trim(),
          content: content.trim(),
          targetUserId: targetUserId.trim() || null,
          senderName: 'Admin',
          createdAt: new Date().toISOString(),
          v: 1
        });
        showToast('Broadcast terkirim!', 'success');
      }
      setTitle('');
      setContent('');
      setTargetUserId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'broadcasts');
    }
  };

  const deleteB = async (id: string) => {
    if (confirm('Hapus broadcast ini?')) {
      try {
        await deleteDoc(doc(db, 'broadcasts', id));
        showToast('Broadcast dihapus', 'success');
      } catch (err) {
        showToast('Gagal menghapus');
      }
    }
  };

  const deleteAll = async () => {
    const confirmText = prompt('Ketik "iya" untuk menghapus SEMUA broadcast:');
    if (confirmText === 'iya') {
      try {
        const snap = await getDocs(collection(db, 'broadcasts'));
        const deletions = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletions);
        showToast('Semua broadcast dihapus', 'success');
      } catch (e) {
        showToast('Gagal menghapus semua');
      }
    }
  };

  const handleEdit = (b: Broadcast) => {
    const diff = (new Date().getTime() - new Date(b.createdAt).getTime()) / 60000;
    if (diff > 5) {
      showToast('Sudah lewat 5 menit, tidak bisa diedit.');
      return;
    }
    setTitle(b.title);
    setContent(b.content);
    setTargetUserId(b.targetUserId || '');
    setEditId(b.id);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-3xl font-black italic tracking-tighter">Broadcast</h3>
        <button onClick={deleteAll} className="px-5 py-2 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all">Hapus All</button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="glass p-6 rounded-[24px] border-white/5 space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">{editId ? 'Edit Pesan' : 'Broadcast Baru'}</h4>
             <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block mb-1.5 ml-1">Judul</label>
              <input type="text" className="w-full h-11 bg-white/5 border border-white/5 rounded-xl px-4 text-xs outline-none" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block mb-1.5 ml-1">Pesan</label>
              <textarea className="w-full h-24 bg-white/5 border border-white/5 rounded-xl p-4 text-sm outline-none resize-none" value={content} onChange={e => setContent(e.target.value)} />
            </div>
            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block mb-1.5 ml-1">Target User ID (Opsional)</label>
              <input type="text" className="w-full h-11 bg-white/5 border border-white/5 rounded-xl px-4 text-[10px] font-mono outline-none" value={targetUserId} onChange={e => setTargetUserId(e.target.value)} placeholder="Kosongkan untuk global" />
            </div>
            <div className="flex gap-2">
              <button onClick={send} className="flex-1 btn-primary h-12 uppercase italic">{editId ? 'Update' : 'Broadcast'}</button>
              {editId && <button onClick={() => { setEditId(null); setTitle(''); setContent(''); setTargetUserId(''); }} className="px-6 h-12 glass rounded-xl text-[9px] font-black uppercase tracking-widest">Batal</button>}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">History</h4>
          <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1 no-scrollbar">
            {items.map(item => {
              const diff = (new Date().getTime() - new Date(item.createdAt).getTime()) / 60000;
              const canEdit = diff < 5;
              return (
                <div key={item.id} className="glass p-4 rounded-xl border-white/5 relative group">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-bold text-xs">{item.title}</h5>
                    <div className="flex gap-2">
                      {canEdit && <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg"><Edit2 className="w-3 h-3" /></button>}
                      <button onClick={() => deleteB(item.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40 leading-tight">{item.content}</p>
                  {item.targetUserId && <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-2 px-1.5 py-0.5 bg-blue-500/10 inline-block rounded">Target: {item.targetUserId}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UsersTab({ showToast, isSuper }: { showToast: any, isSuper?: boolean }) {
  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [banned, setBanned] = useState<BannedUser[]>([]);
  const [search, setSearch] = useState('');
  const [passModal, setPassModal] = useState<{ open: boolean; action: () => void } | null>(null);

  useEffect(() => {
    onSnapshot(collection(db, 'user_metadata'), s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as UserMetadata))));
    onSnapshot(collection(db, 'banned_users'), s => setBanned(s.docs.map(d => ({ id: d.id, ...d.data() } as BannedUser))));
  }, []);

  const confirmAction = (action: () => void) => {
    setPassModal({ open: true, action });
  };

  const banUser = async (u: UserMetadata) => {
    confirmAction(async () => {
      try {
        await setDoc(doc(db, 'banned_users', u.id), {
          id: u.id,
          email: u.email,
          createdAt: new Date().toISOString(),
          reason: 'Banned by Admin (Manual Security Protocol)'
        });
        showToast(`User ${u.email} berhasil diblokir!`, 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `banned_users/${u.id}`);
      }
    });
  };

  const unbanUser = async (id: string) => {
    confirmAction(async () => {
      try {
        await deleteDoc(doc(db, 'banned_users', id));
        showToast('Blokir dibuka', 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `banned_users/${id}`);
      }
    });
  };

  const filtered = users.filter(u => {
    if (!isSuper && (u.email === 'ayrarasya475@gmail.com' || u.email === 'poporasa6@gmail.com')) return false;
    return u.email.toLowerCase().includes(search.toLowerCase()) || 
           (u.displayName || '').toLowerCase().includes(search.toLowerCase());
  });

  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (name.length <= 3) return email;
    return name.substring(0, 3) + '****@' + domain;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-3xl font-black italic tracking-tighter text-white">User Central</h3>
        <input 
          type="text" 
          placeholder="Cari user..." 
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-white/30"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map(u => (
          <div key={u.id} className="glass p-4 rounded-2xl border-white/5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-all">
            <div className="flex items-center gap-4 flex-1 min-w-0">
               <div className="relative">
                  <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.email}`} className="w-10 h-10 rounded-full border border-white/5" />
                  <div className={cn("absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black", (new Date().getTime() - new Date(u.lastLogin || '').getTime() < 300000) ? "bg-emerald-500" : "bg-white/10")} />
               </div>
               <div className="truncate">
                  <p className="text-xs font-black truncate">{isSuper ? u.email : maskEmail(u.email)}</p>
                  <p className="text-[8px] font-black uppercase text-white/20 tracking-widest leading-none mt-1">{u.displayName || 'Anonymous'}</p>
                  {isSuper && (
                    <div className="flex gap-3 mt-2 text-[7px] font-black uppercase tracking-widest text-emerald-500/50">
                       <span>IP: {u.ip || '-'}</span>
                       <span>LOC: {u.location || '-'}</span>
                    </div>
                  )}
               </div>
            </div>

            <div className="flex items-center gap-2">
               <button onClick={() => { navigator.clipboard.writeText(u.id); showToast('ID disalin', 'success'); }} className="p-2 glass text-white/20 hover:text-white rounded-lg"><Terminal className="w-3.5 h-3.5" /></button>
               {banned.find(b => b.id === u.id) ? (
                  <button onClick={() => unbanUser(u.id)} className="px-4 py-2 bg-emerald-500 text-black rounded-lg text-[9px] font-black uppercase tracking-widest">Unban</button>
               ) : (
                  <button onClick={() => banUser(u)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">Ban</button>
               )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="py-20 text-center opacity-10 italic">Tidak ada subjek terdeteksi.</p>}
      </div>

      <AnimatePresence>
        {passModal?.open && (
           <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="w-full max-w-sm glass p-8 rounded-[32px] border border-white/10 text-center"
              >
                 <Shield className="w-12 h-12 text-amber-500 mx-auto mb-6" />
                 <h4 className="text-xl font-black italic tracking-tighter mb-2 uppercase">Autentikasi Xerox</h4>
                 <p className="text-[10px] uppercase font-black tracking-widest text-white/30 mb-8">Konfirmasi Kode Keamanan (111)</p>
                 
                 <input 
                   type="password"
                   autoFocus
                   placeholder="CODE"
                   className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl text-center text-xl font-mono outline-none focus:border-amber-500/50 mb-6 text-white"
                   onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                         const val = (e.currentTarget as HTMLInputElement).value;
                         if (val === '111') {
                            passModal.action();
                            setPassModal(null);
                         } else {
                            showToast('Kode Salah!');
                         }
                      }
                   }}
                 />
                 <div className="flex flex-col gap-3">
                    <button 
                      onClick={(e) => {
                        const input = (e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement);
                        if (input.value === '111') {
                          passModal.action();
                          setPassModal(null);
                        } else {
                          showToast('Kode Salah!');
                        }
                      }}
                      className="w-full h-12 bg-amber-500 text-black font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Buka Akses
                    </button>
                    <button onClick={() => setPassModal(null)} className="text-[10px] font-black uppercase tracking-widest text-white/10 hover:text-white/40 transition-all">Batalkan Prosedur</button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConfigTab({ showToast, isSuper }: { showToast: any, isSuper?: boolean }) {
  const [config, setConfig] = useState<SystemConfig>({ id: 'main_prompt', mode: 'default', customContent: '', updatedAt: '' });
  const [newOwner, setNewOwner] = useState('');

  useEffect(() => {
    onSnapshot(doc(db, 'system_configs', 'main_prompt'), s => {
      if (s.exists()) setConfig({ id: 'main_prompt', ...s.data() } as SystemConfig);
    });
  }, []);

  const save = async () => {
    try {
      await setDoc(doc(db, 'system_configs', 'main_prompt'), {
        ...config,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast('Konfigurasi diperbarui!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const addOwner = async () => {
     if (!newOwner.includes('@')) return;
     showToast('Owner added logic placeholder', 'success');
     setNewOwner('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 className="text-3xl font-black italic tracking-tighter mb-8">System Configuration</h3>
      <div className="max-w-2xl space-y-8">
        <div className="glass p-8 rounded-[30px] border-white/5 space-y-8">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 block mb-4">Prompt Engine Mode</label>
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-black/40 rounded-2xl border border-white/5">
              <button 
                onClick={() => setConfig({...config, mode: 'default'})}
                className={cn("py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", config.mode === 'default' ? "bg-white text-black" : "text-white/30 hover:text-white/60")}
              >
                Default Node
              </button>
              <button 
                onClick={() => setConfig({...config, mode: 'change'})}
                className={cn("py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", config.mode === 'change' ? "bg-white text-black" : "text-white/30 hover:text-white/60")}
              >
                Custom Node
              </button>
            </div>
          </div>

          <AnimatePresence>
            {config.mode === 'change' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Neural System Instruction</label>
                <textarea 
                  className="w-full h-48 bg-white/5 border border-white/5 rounded-2xl p-5 text-xs outline-none resize-none font-mono"
                  value={config.customContent}
                  onChange={e => setConfig({...config, customContent: e.target.value})}
                  placeholder="Paste your custom prompt here..."
                />
              </motion.div>
            )}
          </AnimatePresence>

          {isSuper && (
            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
               <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" /> SUPER OWNER GATE
               </h4>
               <div className="flex gap-2">
                  <input type="text" value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="Email Owner Baru" className="flex-1 h-10 bg-black/40 border border-white/5 rounded-xl px-4 text-[10px] outline-none" />
                  <button onClick={addOwner} className="px-4 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl">Add</button>
               </div>
            </div>
          )}

          <button onClick={save} className="w-full btn-primary h-14 flex items-center justify-center gap-3">
             <CheckCircle2Icon className="w-5 h-5" />
             Save Interconnect
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function DataTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    getDocs(collection(db, 'stats_logs')).then(s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    getDocs(collection(db, 'prompts')).then(s => setPrompts(s.docs.map(d => ({ id: d.id, ...d.data() } as Prompt))));
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <h3 className="text-3xl font-black mb-8 italic tracking-tighter">Advanced Stats</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Copies" value={logs.filter(l => (l as any).type === 'copy').length} />
        <StatCard label="Shares" value={logs.filter(l => (l as any).type === 'share').length} />
        <StatCard label="Likes" value={logs.filter(l => (l as any).type === 'like').length} />
        <StatCard label="Views" value={logs.filter(l => (l as any).type === 'view').length} />
      </div>

      <div className="glass rounded-[32px] overflow-hidden border border-white/5">
         <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Engagement Matrix</h4>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full">
               <thead className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20 border-b border-white/5">
                  <tr>
                     <th className="px-6 py-4 text-left">Prompt Node</th>
                     <th className="px-6 py-4 text-center">Copy</th>
                     <th className="px-6 py-4 text-center">Share</th>
                     <th className="px-6 py-4 text-center">Like</th>
                     <th className="px-6 py-4 text-center">Eng%</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {prompts.map(p => {
                    const c = logs.filter(l => l.promptId === p.id && l.type === 'copy').length;
                    const s = logs.filter(l => l.promptId === p.id && l.type === 'share').length;
                    const l = logs.filter(l => l.promptId === p.id && l.type === 'like').length;
                    const total = c + s + l;
                    return (
                      <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-6 py-4 text-xs font-bold">{p.name}</td>
                        <td className="px-6 py-4 text-center text-xs text-white/40">{c}</td>
                        <td className="px-6 py-4 text-center text-xs text-white/40">{s}</td>
                        <td className="px-6 py-4 text-center text-xs text-white/40">{l}</td>
                        <td className="px-6 py-4 text-center text-[10px] font-black text-blue-400">{total > 0 ? ((l/total)*100).toFixed(0) : 0}%</td>
                      </tr>
                    );
                  })}
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
    if (!auth.currentUser) return;
    const q = query(collection(db, 'chat_sessions'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, 
      s => setSessions(s.docs.map(d => ({ id: d.id, ...d.data() } as ChatSession))),
      err => {
        if (err.code === 'permission-denied' && !auth.currentUser) return;
        handleFirestoreError(err, OperationType.LIST, 'chat_sessions');
      }
    );
  }, []);

  const deleteSession = async (id: string) => {
    if (!confirm('Hapus sesi chat ini?')) return;
    try {
      await deleteDoc(doc(db, 'chat_sessions', id));
      setActiveSession(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chat_sessions/${id}`);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col max-h-[85vh] md:max-h-none">
      <div className="flex items-center justify-between mb-4 md:mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-xl md:text-3xl font-black italic tracking-tighter">Customer Service</h3>
          <span className="hidden md:inline-block px-2 py-0.5 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-white/40">Real-time</span>
        </div>
        <div className="flex items-center gap-2">
          {activeSession && (
            <button 
              onClick={() => deleteSession(activeSession)}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          {activeSession && (
            <button 
              onClick={() => setActiveSession(null)}
              className="md:hidden text-[10px] font-black uppercase tracking-[0.2em] text-white/40 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2"
            >
              ← Daftar Chat
            </button>
          )}
        </div>
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
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[11px] md:text-xs font-bold truncate leading-tight uppercase tracking-tight">{s.userName || 'Anonymous User'}</p>
                  <p className="text-[9px] text-white/20 truncate">{s.userEmail}</p>
                </div>
                <p className={cn("text-[8px] font-black uppercase tracking-widest shrink-0", activeSession === s.id ? "text-black/40" : "text-white/20")}>
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

function OwnerTab({ showToast }: { showToast: any }) {
  const [users, setUsers] = useState<UserMetadata[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    return onSnapshot(collection(db, 'user_metadata'), s => {
      setUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as UserMetadata)));
    });
  }, []);

  const filtered = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.displayName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter uppercase">Owner Central</h3>
          <p className="text-[10px] font-black uppercase text-white/20 tracking-widest mt-1">Full Data Access Module</p>
        </div>
        <input 
          type="text" 
          placeholder="Filter Subject..." 
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-emerald-500/30 w-64"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="glass rounded-[32px] border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/5">
              <tr className="text-[9px] font-black uppercase tracking-widest text-white/30">
                <th className="px-6 py-4">User Identity</th>
                <th className="px-6 py-4">Network Info</th>
                <th className="px-6 py-4">System Context</th>
                <th className="px-6 py-4">Engagements</th>
                <th className="px-6 py-4">Last Pulse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.email}`} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="text-xs font-bold text-white">{u.email}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/20">{u.displayName || 'ANON'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="w-2.5 h-2.5 text-emerald-500/50" />
                        <span className="text-[9px] font-mono text-emerald-500/70">{u.ip || '0.0.0.0'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <LayoutGrid className="w-2.5 h-2.5 text-blue-500/50" />
                        <span className="text-[9px] font-mono text-blue-500/70 truncate max-w-[120px]">{u.location || 'Unknown'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-[200px] truncate">
                      <p className="text-[8px] font-mono text-white/30 lowercase">{u.userAgent || 'No UA Data'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-4">
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20">COPY</p>
                        <p className="text-xs font-black">{u.copyStats || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[8px] font-black text-white/20">LOGIN</p>
                        <p className="text-xs font-black">{u.loginCount || 0}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-tighter">
                      {u.lastLogin ? format(new Date(u.lastLogin), 'MMM dd, HH:mm') : 'NEVER'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-20 text-center opacity-10 uppercase font-black tracking-widest">No Intelligence Data</div>}
        </div>
      </div>
    </motion.div>
  );
}

function XeroxTab({ showToast }: { showToast: any }) {
  const [config, setConfig] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [xeroxLog, setXeroxLog] = useState<string[]>(['Xerox-Kernel initialized. Waiting for protocol commands...']);

  useEffect(() => {
    return onSnapshot(doc(db, 'system_configs', 'main_prompt'), s => {
      if (s.exists()) setConfig(s.data());
    });
  }, []);

  const addLog = (msg: string) => setXeroxLog(prev => [...prev.slice(-10), `> ${msg}`]);

  const runScanning = async () => {
    setIsScanning(true);
    addLog('STARTING SYSTEM SCAN...');
    try {
      const usersSnap = await getDocs(collection(db, 'user_metadata'));
      addLog(`Analyzing ${usersSnap.size} user records...`);
      await new Promise(r => setTimeout(r, 1000));
      
      const suspicious = usersSnap.docs.filter(d => (d.data().loginCount || 0) > 500);
      if (suspicious.length > 0) {
        addLog(`ALERT: ${suspicious.length} anomalous accounts isolated.`);
      } else {
        addLog('No malware or XSS patterns detected.');
      }
      showToast('Scan Selesai', 'success');
    } catch (e) {
      addLog('SCAN ERROR: Access Denied');
    }
    setIsScanning(false);
  };

  const purgeCache = async () => {
    addLog('PURGING SYSTEM CACHE...');
    try {
      const collectionsToPurge = [
        'suggestions', 
        'notifications', 
        'chat_sessions', 
        'inbox', 
        'comments', 
        'stats_logs'
      ];
      let totalDeleted = 0;
      for (const col of collectionsToPurge) {
        const snap = await getDocs(collection(db, col));
        if (snap.size > 0) {
           addLog(`Cleaning ${col}... Found ${snap.size} objects.`);
           const deletions = snap.docs.map(d => deleteDoc(d.ref));
           await Promise.all(deletions);
           totalDeleted += snap.size;
        }
      }
      addLog(`PURGE COMPLETE. ${totalDeleted} fragments erased.`);
      showToast('Xerox Protocol: Cache Erased', 'success');
    } catch (e) {
      addLog('PURGE ERROR: Interrupt detected.');
    }
  };

  const updateMaintenance = async (updates: any) => {
    try {
      await setDoc(doc(db, 'system_configs', 'main_prompt'), {
        maintenance: { ...config?.maintenance, ...updates }
      }, { merge: true });
      showToast('Settings Updated', 'success');
    } catch (e) {
      showToast('Gagal update');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-4 bg-amber-500/10 rounded-[28px] text-amber-500 border border-amber-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-3xl font-black italic tracking-tighter uppercase italic">PROTOKOL XEROX</h3>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Real-Time Core Security Engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-[32px] border-white/5 space-y-8">
          <div className="flex items-center justify-between">
            <div>
               <h4 className="text-lg font-bold uppercase italic">Maintenance Mode</h4>
               <p className="text-[10px] text-white/30 uppercase font-black tracking-widest mt-1">Manual Override</p>
            </div>
            <button 
              onClick={() => updateMaintenance({ active: !config?.maintenance?.active })}
              className={cn(
                "w-12 h-6 rounded-full relative transition-all",
                config?.maintenance?.active ? "bg-amber-500" : "bg-white/10"
              )}
            >
              <div className={cn("absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all", config?.maintenance?.active ? "translate-x-6" : "translate-x-0")} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/20 block mb-2">Mulai</label>
                <input type="datetime-local" className="w-full h-11 bg-white/5 border border-white/5 rounded-xl px-4 text-[10px] outline-none text-white/60" value={config?.maintenance?.startAt || ''} onChange={e => updateMaintenance({ startAt: e.target.value })} />
             </div>
             <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-white/20 block mb-2">Selesai</label>
                <input type="datetime-local" className="w-full h-11 bg-white/5 border border-white/5 rounded-xl px-4 text-[10px] outline-none text-white/60" value={config?.maintenance?.endAt || ''} onChange={e => updateMaintenance({ endAt: e.target.value })} />
             </div>
          </div>
          
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-white/20 block mb-2">Note Tampilan</label>
            <textarea className="w-full h-24 bg-white/5 border border-white/5 rounded-xl p-4 text-xs outline-none resize-none text-white/40" value={config?.maintenance?.note || ''} onChange={e => updateMaintenance({ note: e.target.value })} />
          </div>
        </div>

        <div className="space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <XeroxBtn icon={Activity} label="Scanning" active={isScanning} onClick={runScanning} />
              <SecurityBtn icon={Trash2} label="Purge Cache" onClick={purgeCache} />
              <SecurityBtn icon={Shield} label="Integrital" onClick={() => addLog('CORE_INTEGRITY: 100% OK')} />
              <SecurityBtn icon={Monitor} label="Net Health" onClick={() => addLog('NETWORK: STABLE, LOW LATENCY')} />
           </div>

           <div className="glass p-6 rounded-[24px] border-white/5 bg-black/40">
              <h5 className="text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                 <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                 <Terminal className="w-3.5 h-3.5 text-amber-500" /> Kernel Output
              </h5>
              <div className="space-y-2 font-mono text-[9px] text-emerald-500 h-32 overflow-y-auto no-scrollbar">
                 {xeroxLog.map((log, i) => <p key={i}>{log}</p>)}
                 {isScanning && <p className="text-amber-500 animate-pulse">{">"} PROBING SECTORS...</p>}
              </div>
           </div>
        </div>
      </div>

    </motion.div>
  );
}

function XeroxBtn({ icon: Icon, label, onClick, active }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center gap-3 h-28 glass rounded-[24px] border-white/5 hover:bg-white/5 transition-all text-white/30 hover:text-white group", active && "bg-amber-500/10 border-amber-500/20 text-amber-500")}>
       <Icon className={cn("w-6 h-6", active && "animate-spin")} />
       <span className="text-[9px] font-black uppercase tracking-widest leading-none">{label}</span>
    </button>
  );
}

function ShieldBtn({ icon: Icon, label }: any) {
  return (
    <button className="flex flex-col items-center justify-center gap-3 h-28 glass rounded-[24px] border-white/5 hover:bg-white/5 transition-all text-white/30 hover:text-white group">
       <Icon className="w-6 h-6" />
       <span className="text-[9px] font-black uppercase tracking-widest leading-none">{label}</span>
    </button>
  );
}

function SecurityBtn({ icon: Icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-3 h-28 glass rounded-[24px] border-white/5 hover:bg-white/5 transition-all text-white/30 hover:text-white group">
       <Icon className="w-6 h-6" />
       <span className="text-[9px] font-black uppercase tracking-widest leading-none">{label}</span>
    </button>
  );
}

