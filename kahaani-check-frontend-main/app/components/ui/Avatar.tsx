import Image from "next/image";

interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { px: 32, class: "w-8 h-8 text-xs" },
  md: { px: 44, class: "w-11 h-11 text-sm" },
  lg: { px: 64, class: "w-16 h-16 text-lg" },
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function Avatar({ src, name, size = "md" }: AvatarProps) {
  const { px, class: sizeClass } = sizeMap[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={px}
        height={px}
        className={`${sizeClass} rounded-full object-cover border border-border`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-primary-light text-primary font-semibold flex items-center justify-center border border-border`}
    >
      {getInitials(name) || "?"}
    </div>
  );
}