import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function Card({
  children,
  className = "",
  onClick,
  hoverable = false,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-[#E3E8E5] bg-[#FFFFFF] p-6 shadow-[0_1px_3px_0_rgba(23,59,56,0.04)] ${
        hoverable ? "transition hover:border-[#147D72]/40 hover:shadow-[0_4px_12px_0_rgba(23,59,56,0.07)]" : ""
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}