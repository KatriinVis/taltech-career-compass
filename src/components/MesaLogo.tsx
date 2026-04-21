import logo from "@/assets/mesai-logo.png";

type Props = {
  size?: "sm" | "md" | "lg";
  wordmark?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { img: 28, text: "text-base" },
  md: { img: 40, text: "text-lg" },
  lg: { img: 56, text: "text-2xl" },
};

export default function MesaLogo({ size = "md", wordmark = true, className = "" }: Props) {
  const s = sizeMap[size];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logo}
        alt="MESA.I mascot"
        width={s.img}
        height={s.img}
        loading="lazy"
        style={{ width: s.img, height: s.img }}
        className="object-contain"
      />
      {wordmark && (
        <span className={`font-display ${s.text} text-primary tracking-tight`}>MESA.I</span>
      )}
    </div>
  );
}
