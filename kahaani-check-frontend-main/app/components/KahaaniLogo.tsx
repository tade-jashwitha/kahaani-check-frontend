import { HeartHandshake } from "lucide-react";

type KahaaniLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
};

export default function KahaaniLogo({
  size = "md",
  showText = true,
}: KahaaniLogoProps) {
  const sizes = {
    sm: {
      icon: "h-9 w-9",
      iconSize: 18,
      title: "text-base",
      tagline: "text-[10px]",
    },
    md: {
      icon: "h-12 w-12",
      iconSize: 23,
      title: "text-xl",
      tagline: "text-xs",
    },
    lg: {
      icon: "h-20 w-20",
      iconSize: 38,
      title: "text-3xl",
      tagline: "text-sm",
    },
  };

  const current = sizes[size];

  return (
    <div className="flex items-center gap-3">
      {/* Logo mark */}
      <div
        className={`flex ${current.icon} items-center justify-center rounded-[30%] bg-primary-dark text-white shadow-sm`}
      >
        <HeartHandshake size={current.iconSize} strokeWidth={1.8} />
      </div>

      {showText && (
        <div>
          <div
            className={`font-semibold tracking-[-0.02em] text-text-primary ${current.title}`}
          >
            Kahaani-Check
          </div>

          <div className={`mt-0.5 text-text-secondary ${current.tagline}`}>
            Because every story matters
          </div>
        </div>
      )}
    </div>
  );
}