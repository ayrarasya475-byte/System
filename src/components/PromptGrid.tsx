import React, { useState } from 'react';
import { Prompt, Model } from '../types';
import { db, auth } from '../lib/firebase';
import { doc, updateDoc, increment, setDoc, query, collection, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase';
import { Copy, Download, Heart, Check, Terminal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PromptGridProps {
  prompts: Prompt[];
  models: Model[];
  showToast: (msg: string, type: 'error' | 'success') => void;
}

export default function PromptGrid({ prompts, models, showToast }: PromptGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
      {prompts.map((prompt) => (
        <PromptCard key={prompt.id} prompt={prompt} models={models} showToast={showToast} />
      ))}
    </div>
  );
}

interface PromptCardProps {
  key: string;
  prompt: Prompt;
  models: Model[];
  showToast: (msg: string, type: 'error' | 'success') => void;
}

function PromptCard({ prompt, models, showToast }: PromptCardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const model = models.find(m => m.id === prompt.modelId);

  const logStat = async (type: 'copy' | 'download' | 'like') => {
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

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(prompt.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    try {
      await updateDoc(doc(db, 'prompts', prompt.id), { copyCount: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `prompts/${prompt.id}`);
    }
    logStat('copy');
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const element = document.createElement("a");
    const file = new Blob([prompt.content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${prompt.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    try {
      await updateDoc(doc(db, 'prompts', prompt.id), { downloadCount: increment(1) });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `prompts/${prompt.id}`);
    }
    logStat('download');
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser) return showToast("Silakan login untuk memberikan like.", "error");
    
    const userId = auth.currentUser.uid;
    const likeId = `${prompt.id}_${userId}`;
    const likeRef = doc(db, 'prompt_likes', likeId);

    try {
      // Only one like per user/prompt - enforced by doc ID and 'create' rule
      await setDoc(likeRef, {
        promptId: prompt.id,
        userId: userId,
        createdAt: serverTimestamp()
      });
      // If setDoc succeeds (didn't exist), then increment
      await updateDoc(doc(db, 'prompts', prompt.id), { likes: increment(1) });
      setIsLiked(true);
      logStat('like');
      showToast("Telah disukai!", "success");
    } catch (error: any) {
      if (error.code === 'permission-denied' || error.message?.includes('insufficient')) {
        showToast("Anda sudah menyukai prompt ini.", "error");
      } else {
        handleFirestoreError(error, OperationType.UPDATE, `prompts/${prompt.id}`);
      }
    }
  };

  return (
    <>
      <motion.div 
        layout
        onClick={() => setShowFull(true)}
        className="glass-card rounded-[24px] p-5 flex flex-col group h-[200px] cursor-pointer relative overflow-hidden"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[8px] font-black uppercase tracking-wider text-white/20 bg-white/5 px-2 py-0.5 rounded-md">
                {model?.name || 'GENERIC'}
              </span>
            </div>
            <h3 className="text-sm font-bold tracking-tight text-white/80 group-hover:text-white transition-colors truncate">
              {prompt.name}
            </h3>
          </div>
        </div>

        <div className="flex-1 text-[11px] text-white/30 line-clamp-3 leading-relaxed font-mono mt-1">
          {prompt.content}
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-white/5 mt-auto">
          <div className="flex items-center gap-3">
             <button 
              onClick={handleLike}
              className={cn("flex items-center gap-1.5 transition-all text-[10px] font-bold", isLiked ? "text-red-400" : "text-white/20 hover:text-white")}
            >
              <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-current")} />
              {prompt.likes + (isLiked ? 1 : 0)}
            </button>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/20">
              <Download className="w-3.5 h-3.5" />
              {prompt.downloadCount}
            </div>
          </div>

          <div className="flex gap-1.5">
            <button onClick={handleCopy} className="p-2 glass rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={handleDownload} className="p-2 glass rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showFull && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-2xl glass p-8 rounded-[32px] max-h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded-md text-white/30 uppercase mb-2 inline-block">
                    {model?.name}
                  </span>
                  <h3 className="text-xl font-bold">{prompt.name}</h3>
                </div>
                <button onClick={() => setShowFull(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6 font-mono text-sm text-white/60 overflow-y-auto mb-6 whitespace-pre-wrap">
                {prompt.content}
              </div>
              <div className="flex gap-3">
                <button onClick={handleCopy} className="flex-1 btn-primary flex items-center justify-center gap-2 h-12">
                  <Copy className="w-4 h-4" /> {isCopied ? 'Tersalin' : 'Salin Prompt'}
                </button>
                <button onClick={handleDownload} className="btn-secondary h-12 px-6">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
