import { useState, useEffect, useRef, FormEvent } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, setDoc, doc, updateDoc } from 'firebase/firestore';
import { MessageSquare, Send, X, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

export default function Chat({ onClose }: { onClose: () => void, key?: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userUid = auth.currentUser.uid;
    const sessionRef = doc(db, 'chat_sessions', userUid);
    
    const path = `chat_sessions/${userUid}`;
    setDoc(sessionRef, {
      userId: userUid,
      userEmail: auth.currentUser.email,
      updatedAt: new Date().toISOString(),
      status: 'open'
    }, { merge: true })
    .then(() => setSessionId(userUid))
    .catch((error) => handleFirestoreError(error, OperationType.WRITE, path));

    const messagesPath = `chat_sessions/${userUid}/messages`;
    const q = query(collection(db, messagesPath), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (s) => {
        setMessages(s.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, messagesPath)
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !auth.currentUser) return;

    const userUid = auth.currentUser.uid;
    const messagesPath = `chat_sessions/${userUid}/messages`;
    try {
      await addDoc(collection(db, messagesPath), {
        text: text.trim(),
        senderId: userUid,
        chatId: userUid,
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'chat_sessions', userUid), {
        lastMessage: text.trim(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, messagesPath);
    }

    setText('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <div className="w-full max-w-md h-[550px] glass rounded-[32px] flex flex-col overflow-hidden shadow-2xl relative">
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Admin Support</h3>
              <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Active Chat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 glass rounded-full text-white/30 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide bg-black/30">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.senderId === 'admin' ? "justify-start" : "justify-end")}>
              <div className={cn(
                "max-w-[85%] p-3.5 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm",
                m.senderId === 'admin' ? "bg-white/10 text-white rounded-tl-none border border-white/5" : "bg-white text-black rounded-tr-none"
              )}>
                {m.text}
                <p className={cn("text-[8px] mt-1.5 font-bold opacity-40 text-right")}>
                  {format(new Date(m.createdAt), 'HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={send} className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-3">
          <input 
            type="text" 
            className="flex-1 h-11 bg-white/5 border border-white/5 rounded-xl px-4 text-xs outline-none focus:border-white/20 transition-all font-medium"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Ketik pesan..."
          />
          <button type="submit" className="p-3 bg-white text-black rounded-xl hover:scale-105 transition-all">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
