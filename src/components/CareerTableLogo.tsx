type Props = {
  size?: "sm" | "md" | "lg";
  wordmark?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { img: 28, text: "text-lg" },
  md: { img: 40, text: "text-2xl" },
  lg: { img: 56, text: "text-4xl" },
};

export default function CareerTableLogo({ size = "md", wordmark = true, className = "" }: Props) {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-2 group ${className}`}>
      <div
        className="relative animate-float group-hover:animate-wiggle"
        style={{ width: s.img, height: s.img }}
        aria-label="Career-table mascot"
      >
        <svg
          viewBox="0 0 64 64"
          width={s.img}
          height={s.img}
          className="drop-shadow-[0_4px_12px_hsl(var(--primary-glow)/0.5)]"
        >
          <defs>
            <linearGradient id="capGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" />
              <stop offset="50%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
            </linearGradient>
          </defs>
          {/* cap base */}
          <ellipse cx="32" cy="38" rx="18" ry="6" fill="hsl(var(--primary))" opacity="0.9" />
          {/* cap top */}
          <polygon points="32,16 60,28 32,40 4,28" fill="url(#capGrad)" />
          {/* button */}
          <circle cx="32" cy="28" r="2" fill="hsl(var(--background))" />
          {/* tassel - swings */}
          <g style={{ transformOrigin: "32px 28px" }} className="origin-center animate-tassel">
            <line x1="32" y1="28" x2="46" y2="44" stroke="hsl(var(--accent))" strokeWidth="2" strokeLinecap="round" />
            <circle cx="46" cy="46" r="3" fill="hsl(var(--accent))" />
          </g>
        </svg>
        {/* sparkles */}
        <span className="absolute -top-1 -right-1 text-cyan-400 animate-sparkle-1">✦</span>
        <span className="absolute -bottom-1 -left-1 text-violet-400 animate-sparkle-2 text-xs">✦</span>
        <span className="absolute top-1/2 -right-2 text-fuchsia-400 animate-sparkle-3 text-[10px]">✦</span>
      </div>
      {wordmark && (
        <span className={`font-display ${s.text} chrome-text tracking-wide leading-none`}>
          Career-table
        </span>
      )}
    </div>
  );
}
