import { motion } from 'motion/react';
import { Menu } from 'lucide-react';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="text-center relative w-full mb-8 md:mb-12">
      <button 
        onClick={onMenuClick}
        className="md:hidden absolute left-0 top-0 p-2 glass rounded-xl text-white/60"
      >
        <Menu className="w-5 h-5" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] uppercase tracking-[0.2em] font-black text-white/40 mb-4"
      >
        World Class Prompt Hub
      </motion.div>
      <motion.h1 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="text-4xl md:text-6xl font-black tracking-tighter mb-3 selection:bg-white selection:text-black"
      >
        GREXTAR
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-white/30 text-xs md:text-sm font-medium tracking-tight max-w-md mx-auto leading-relaxed"
      >
        Koleksi prompt terbaik dikurosi oleh profesional. 
        <span className="text-white/60 block mt-1">Efisiensi tanpa batas mulai dari sekarang.</span>
      </motion.p>
    </div>
  );
}
