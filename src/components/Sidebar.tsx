import { MessageSquare, FileText, ShieldAlert, HelpCircle, LayoutGrid, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface SidebarProps {
  currentView: string;
  isOpen: boolean;
  onClose: () => void;
  onViewChange: (view: any) => void;
}

export default function Sidebar({ currentView, isOpen, onClose, onViewChange }: SidebarProps) {
  const items = [
    { id: 'browse', label: 'Browse', icon: LayoutGrid },
    { id: 'chat', label: 'Admin Support', icon: MessageSquare },
    { id: 'suggest', label: 'Saran Prompt', icon: FileText },
    { id: 'faq', label: 'FAQ Center', icon: HelpCircle },
  ];

  return (
    <aside className={cn(
      "fixed md:sticky top-0 left-0 h-screen glass border-r border-white/5 p-6 flex flex-col z-50 transition-transform duration-500 w-64",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-black text-sm">G</div>
          <span className="text-lg font-bold tracking-tighter">GREXTAR</span>
        </div>
        <button onClick={onClose} className="md:hidden p-2 text-white/40">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="space-y-1.5 flex-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all group",
              currentView === item.id 
                ? "bg-white text-black shadow-lg shadow-white/5" 
                : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className={cn("w-4 h-4", currentView === item.id ? "text-black" : "text-white/20 group-hover:text-white/40")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-8 pt-8 border-t border-white/5">
        <div className="glass-card p-4 rounded-2xl">
          <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-black mb-3">Live Status</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white/60">System Operational</span>
          </div>
          <div className="flex -space-x-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="w-6 h-6 rounded-full border-2 border-[#030303] bg-white/10 flex items-center justify-center text-[8px] font-bold">U{i}</div>
            ))}
            <div className="w-6 h-6 rounded-full border-2 border-[#030303] bg-indigo-500 flex items-center justify-center text-[8px] font-bold">+99</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
