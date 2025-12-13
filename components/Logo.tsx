
import React from 'react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "", iconSize = 40, light = false }) => {
  // Colors based on light/dark mode context
  // light=true implies dark background, so logo should be white
  const primaryColor = light ? "#ffffff" : "#0f172a"; 
  const accentColor = "#10b981"; // Emerald 500

  return (
    <div className={`flex items-center gap-3 ${className} select-none`}>
      <div 
        className="relative flex items-center justify-center"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
           {/* Chef Hat Body */}
           <path 
             d="M20 60C20 60 10 40 30 30C30 30 30 10 50 10C70 10 70 30 70 30C90 40 80 60 80 60" 
             stroke={primaryColor} 
             strokeWidth="6" 
             strokeLinecap="round" 
             strokeLinejoin="round"
           />
           {/* Hat Brim */}
           <path 
             d="M20 60H80V70C80 75.5 75.5 80 70 80H30C24.5 80 20 75.5 20 70V60Z" 
             fill={primaryColor}
           />
           
           {/* Insight Graph - Rising Trend Line inside the hat */}
           <path 
             d="M32 45L44 35L56 42L68 25" 
             stroke={accentColor} 
             strokeWidth="6" 
             strokeLinecap="round" 
             strokeLinejoin="round"
           />
           <circle cx="68" cy="25" r="5" fill={accentColor} />
        </svg>
      </div>
      
      <div className={`flex flex-col justify-center ${light ? 'text-white' : 'text-slate-900'}`}>
        <span className="font-extrabold leading-none tracking-tight" style={{ fontSize: iconSize * 0.55 }}>
          BistroConnect
        </span>
        <span className="font-medium leading-none tracking-widest uppercase text-emerald-500" style={{ fontSize: iconSize * 0.28, marginTop: '2px' }}>
          iNsight
        </span>
      </div>
    </div>
  );
};
