export default function AppLogo({ size = 'md', className = '', showGlow = true }) {
  const sizeMap = {
    xs: { box: 'w-7 h-7', icon: 18 },
    sm: { box: 'w-9 h-9', icon: 24 },
    md: { box: 'w-11 h-11', icon: 30 },
    lg: { box: 'w-14 h-14', icon: 38 },
    xl: { box: 'w-20 h-20', icon: 54 },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl bg-gradient-to-br from-[#132B2F] via-[#0E1E21] to-[#080F0F] border border-[#28616A] select-none transition-all ${
        showGlow ? 'shadow-lg shadow-[#132B2F]/70' : ''
      } ${currentSize.box} ${className}`}
    >
      <svg
        viewBox="0 0 512 512"
        className="w-full h-full p-1 drop-shadow-[0_0_8px_rgba(163,220,227,0.35)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="appLogoNeon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A3DCE3" />
            <stop offset="60%" stopColor="#43C88A" />
            <stop offset="100%" stopColor="#28616A" />
          </linearGradient>
          <filter id="appLogoGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="16" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Radar Rings */}
        <circle cx="256" cy="230" r="140" stroke="#28616A" strokeWidth="6" strokeDasharray="10 10" opacity="0.5" />
        <circle cx="256" cy="230" r="100" stroke="#315C60" strokeWidth="8" strokeDasharray="8 8" opacity="0.7" />
        <circle cx="256" cy="230" r="60" stroke="#A3DCE3" strokeWidth="10" opacity="0.9" />

        {/* Pin Body */}
        <g filter="url(#appLogoGlow)">
          <path
            d="M 256 120 C 200 120 156 164 156 220 C 156 280 236 370 256 390 C 276 370 356 280 356 220 C 356 164 312 120 256 120 Z"
            fill="url(#appLogoNeon)"
          />
          <circle cx="256" cy="216" r="44" fill="#080F0F" stroke="#132B2F" strokeWidth="8" />
          <circle cx="256" cy="216" r="22" fill="#A3DCE3" />
          <circle cx="256" cy="216" r="10" fill="#FFFFFF" />
        </g>

        {/* Base Pulse Arcs */}
        <ellipse cx="256" cy="420" rx="60" ry="16" stroke="#43C88A" strokeWidth="7" opacity="0.8" />
        <ellipse cx="256" cy="420" rx="30" ry="8" stroke="#A3DCE3" strokeWidth="6" opacity="0.95" />
      </svg>
    </div>
  );
}
