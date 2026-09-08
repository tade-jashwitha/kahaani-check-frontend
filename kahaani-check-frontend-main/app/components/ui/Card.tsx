import { HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "sm" | "md" | "lg";
}

export default function Card({
  children,
  padding = "md",
  className,
  ...props
}: CardProps) {
  const paddings = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={clsx(
        "bg-surface rounded-card shadow-card border border-border",
        paddings[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}