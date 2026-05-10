import React, { useState, useEffect, useRef } from 'react';
import { Prompt, Model } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, increment, setDoc, query, collection, where, getDocs, serverTimestamp, getDoc, onSnapshot, deleteDoc, orderBy, addDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { Copy, Download, Heart, Check, Terminal, Sparkles, X, Share2, Lock, StickyNote, AlertCircle, Eye, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Comment } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface PromptGridProps {
  prompts: Prompt[];
  models: Model[];
  showToast: (msg: string, type: 'error' | 'success') => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSendToAi: (content: string) => void;
  onShare: (prompt: Prompt) => void;
}

export default function PromptGrid({ prompts, models, showToast, favorites, onToggleFavorite, onSendToAi, onShare }: PromptGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl pb-10">
      {prompts.map((prompt) => (
        <PromptCard 
          key={prompt.id} 
          prompt={prompt} 
          models={models} 
          showToast={showToast} 
          isFavorited={favorites.includes(prompt.id)}
          onToggleFavorite={() => onToggleFavorite(prompt.id)}
          onSendToAi={onSendToAi} 
          onShare={() => onShare(prompt)}
        />
      ))}
    </div>
  );
}

interface PromptCardProps {
  prompt: Prompt;
  models: Model[];
  showToast: (msg: string, type: 'error' | 'success') => void;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onSendToAi: (content: string) => void;
  onShare: () => void;
}

function PromptCard({ prompt, models, showToast, isFavorited, onToggleFavorite, onSendToAi, onShare }: PromptCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLockPrompt, setShowLockPrompt] = useState(false);
  const [lockPassInput, setLockPassInput] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  const model = models.find(m => m.id === prompt.modelId);

  useEffect(() => {
    if (showFull && prompt.id) {
       // Increment view count
       updateDoc(doc(db, 'prompts', prompt.id), { viewCount: increment(1) }).catch(() => {});
       
       // Load comments
       const q = query(collection(db, 'prompts', prompt.id, 'comments'), orderBy('createdAt', 'desc'));
       return onSnapshot(q, s => setComments(s.docs.map(d => ({ id: d.id, ...d.data() } as Comment))));
    }
  }, [showFull, prompt.id]);

  const logStat = async (type: 'copy' | 'download' | 'like' | 'ai' | 'view') => {
    try {
      const logId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await setDoc(doc(db, 'stats_logs', logId), {
        promptId: prompt.id,
        type,
        userId: auth.currentUser?.uid || 'anonymous',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'stats_logs');
    }
  };

  const checkLock = (onSuccess: () => void) => {
    if (prompt.isLocked && !isUnlocked) {
      setShowLockPrompt(true);
    } else {
      onSuccess();
    }
  };

  const verifyLock = () => {
    if (lockPassInput === prompt.password) {
      setIsUnlocked(true);
      setShowLockPrompt(false);
      showToast('Akses Terbuka', 'success');
    } else {
      showToast('Sandi Salah!', 'error');
    }
  };

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    checkLock(async () => {
      await navigator.clipboard.writeText(prompt.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      try {
        await updateDoc(doc(db, 'prompts', prompt.id), { copyCount: increment(1) });
      } catch (error) {
        console.warn('Silent count increment error');
      }
      logStat('copy');
    });
  };

  const handleDownload = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    checkLock(async () => {
      const element = document.createElement("a");
      const file = new Blob([prompt.content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${prompt.name.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(element);
      element.click();
      try {
        await updateDoc(doc(db, 'prompts', prompt.id), { downloadCount: increment(1) });
      } catch (error) {
        console.warn('Silent count increment error');
      }
      logStat('download');
    });
  };

  const handleAiSend = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    checkLock(() => {
      onSendToAi(prompt.content);
      logStat('ai');
    });
  };

  const handleShare = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    checkLock(() => {
      onShare();
    });
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser) return showToast('Login untuk Like', 'error');
    
    if (!isFavorited) {
      try {
        const likeId = `${prompt.id}_${auth.currentUser.uid}`;
        // Verify unique like via prompt_likes collection
        const likeDoc = await getDoc(doc(db, 'prompt_likes', likeId));
        if (likeDoc.exists()) return; // Already liked

        await setDoc(doc(db, 'prompt_likes', likeId), {
           at: serverTimestamp()
        });
        await updateDoc(doc(db, 'prompts', prompt.id), { likes: increment(1) });
        onToggleFavorite();
        logStat('like');
      } catch (e) {
        console.warn('Like failed');
      }
    }
  };

  const postComment = async () => {
    if (!commentInput.trim() || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'prompts', prompt.id, 'comments'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        content: commentInput,
        createdAt: new Date().toISOString()
      });
      setCommentInput('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <motion.div 
        layout
        onClick={() => setShowFull(true)}
        className="glass-card rounded-[24px] p-5 flex flex-col group h-[190px] cursor-pointer relative overflow-hidden transition-all hover:scale-[1.02]"
      >
        {prompt.isLocked && (
          <div className="absolute top-0 right-0 p-3 text-red-500/40">
            <Lock className="w-3 h-3" />
          </div>
        )}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[8px] font-black uppercase tracking-wider text-white/20 bg-white/5 px-2 py-0.5 rounded-md">
                {model?.name || 'GENERIC'}
              </span>
              {prompt.notes && (
                <span className="text-[8px] font-black uppercase tracking-wider text-amber-500/40 flex items-center gap-1">
                  <StickyNote className="w-2 h-2" /> Note
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold tracking-tight text-white/80 group-hover:text-white transition-colors truncate">
              {prompt.name}
            </h3>
          </div>
        </div>

        <div className="flex-1 text-[10px] text-white/20 line-clamp-3 leading-relaxed font-mono mt-1 group-hover:text-white/40 transition-colors">
          {prompt.isLocked ? '[ PROMPT INI DIKUNCI ]' : prompt.content}
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3">
             <button 
              onClick={handleFavoriteClick}
              className={cn("flex items-center gap-1.5 transition-all text-xs font-black", isFavorited ? "text-red-500" : "text-white/10 hover:text-white")}
            >
              <Heart className={cn("w-3.5 h-3.5", isFavorited && "fill-current animate-pulse")} />
              {prompt.likes + (isFavorited ? 1 : 0)}
            </button>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/10">
              <Eye className="w-3.5 h-3.5" />
              {prompt.viewCount || 0}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/10">
              <MessageSquare className="w-3.5 h-3.5" />
              {comments.length}
            </div>
          </div>

          <div className="flex gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleAiSend}
              className="p-2 glass rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleShare} className="p-2 glass rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCopy} className="p-2 glass rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showFull && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl glass p-6 sm:p-8 rounded-[32px] max-h-[90vh] flex flex-col relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-6">
                   <div>
                    <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded-md text-white/30 uppercase mb-2 inline-block">
                      {model?.name}
                    </span>
                    <h3 className="text-xl font-bold">{prompt.name}</h3>
                   </div>
                   <div className="flex items-center gap-4 border-l border-white/5 pl-6">
                      <div className="text-center">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Views</p>
                         <p className="text-sm font-black italic">{prompt.viewCount || 1}</p>
                      </div>
                      <div className="text-center">
                         <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Likes</p>
                         <p className="text-sm font-black italic">{prompt.likes}</p>
                      </div>
                   </div>
                </div>
                <button onClick={() => setShowFull(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex gap-1 mb-6 p-1 bg-white/5 rounded-xl self-start">
                 <button onClick={() => setShowComments(false)} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", !showComments ? "bg-white text-black shadow-lg" : "text-white/40")}>Prompt</button>
                 <button onClick={() => setShowComments(true)} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", showComments ? "bg-white text-black shadow-lg" : "text-white/40")}>Komentar ({comments.length})</button>
              </div>

              {showComments ? (
                 <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-6 no-scrollbar">
                       {comments.map(c => (
                          <div key={c.id} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                             <div className="flex justify-between mb-2">
                                <span className="text-[10px] font-black text-white/40">{c.userEmail.split('@')[0]}</span>
                                <span className="text-[8px] text-white/10 uppercase font-bold">{format(new Date(c.createdAt), 'dd MMM')}</span>
                             </div>
                             <p className="text-sm text-white/70">{c.content}</p>
                          </div>
                       ))}
                       {comments.length === 0 && <p className="text-center py-20 text-white/10 italic">Belum ada komentar.</p>}
                    </div>
                    <div className="flex gap-2">
                       <input 
                         value={commentInput}
                         onChange={e => setCommentInput(e.target.value)}
                         placeholder="Tulis komentar..."
                         className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 text-sm outline-none"
                       />
                       <button onClick={postComment} className="p-4 bg-white text-black rounded-xl hover:scale-95 transition-all"><Send className="w-4 h-4" /></button>
                    </div>
                 </div>
              ) : (
                <>
                  {prompt.notes && (
                    <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3 items-start">
                       <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Catatan Admin</p>
                          <p className="text-xs text-white/60 leading-relaxed italic">{prompt.notes}</p>
                       </div>
                    </div>
                  )}
                  
                  <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 font-mono text-sm text-white/60 overflow-y-auto mb-6 whitespace-pre-wrap relative">
                    {prompt.isLocked && !isUnlocked ? (
                      <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                         <Lock className="w-12 h-12" />
                         <p className="text-sm font-black uppercase tracking-[0.4em]">Prompt Terkunci</p>
                      </div>
                    ) : prompt.content}
                  </div>
                </>
              )}
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mt-auto pt-6 border-t border-white/5">
                <div className="flex gap-2 flex-1">
                   <button 
                    onClick={handleAiSend}
                    className="flex-1 px-4 h-12 glass rounded-2xl flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 transition-all border border-red-500/20 text-xs font-black uppercase tracking-widest"
                  >
                    <Sparkles className="w-4 h-4" /> Buka di AI
                  </button>
                  <button onClick={handleCopy} className="flex-1 btn-primary flex items-center justify-center gap-2 h-12 text-xs font-black uppercase tracking-widest">
                    <Copy className="w-4 h-4" /> {isCopied ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleDownload} className="glass h-12 w-12 rounded-2xl text-white/40 hover:text-white transition-all flex items-center justify-center border border-white/5">
                    <Download className="w-5 h-5" />
                  </button>
                  <button onClick={handleShare} className="glass h-12 w-12 rounded-2xl text-white/40 hover:text-white transition-all flex items-center justify-center border border-white/5">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLockPrompt && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
             className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
           >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm glass p-8 rounded-[40px] border-red-500/20 flex flex-col items-center text-center"
              >
                 <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20 animate-pulse">
                    <Lock className="w-8 h-8" />
                 </div>
                 <h4 className="text-2xl font-black italic tracking-tighter mb-2">Prompt Locked</h4>
                 <p className="text-xs text-white/40 mb-8 max-w-[200px]">Prompt ini khusus. Masukkan kata sandi akses untuk melanjutkan.</p>
                 
                 <input 
                   autoFocus
                   type="password"
                   className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-5 text-center text-xl font-black tracking-[0.5em] outline-none mb-4 focus:border-red-500/40 transition-all"
                   value={lockPassInput}
                   onChange={e => setLockPassInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && verifyLock()}
                 />
                 
                 <div className="flex gap-3 w-full">
                    <button onClick={() => setShowLockPrompt(false)} className="flex-1 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white transition-all">Batal</button>
                    <button onClick={verifyLock} className="flex-1 h-12 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-95 transition-all">Unlock</button>
                 </div>
              </motion.div>
           </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
