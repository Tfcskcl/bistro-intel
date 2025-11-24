import React from 'react';
import { Brain, UtensilsCrossed } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "", iconSize = 24, light = false }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className={`absolute inset-0 rounded-xl rotate-6 ${light ? 'bg-yellow-400/20' : 'bg-yellow-400'} blur-sm`}></div>
        <div className={`relative z-10 p-2 rounded-xl border-2 ${light ? 'bg-slate-900 border-yellow-400' : 'bg-white border-slate-900'}`}>
          <div className="relative">
            <Brain size={iconSize} className={light ? 'text-white' : 'text-slate-900'} />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-0.5 border border-white">
                <UtensilsCrossed size={iconSize * 0.4} className="text-slate-900" />
            </div>
          </div>
        </div>
      </div>
      <div>
        <h1 className={`font-bold tracking-tight leading-none ${light ? 'text-white' : 'text-slate-900'}`} style={{ fontSize: iconSize * 0.8 }}>
          Bistro<span className="text-yellow-500">Intel</span>
        </h1>
        <p className={`text-[10px] tracking-widest uppercase opacity-60 ${light ? 'text-slate-300' : 'text-slate-500'}`}>
            Intelligence for F&B
        </p>
      </div>
    </div>
  );
};