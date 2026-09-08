import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && (
        <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-text-primary font-semibold text-lg mb-1">{title}</h3>
      {description && (
        <p className="text-text-secondary text-sm max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}