type Status = "stable" | "review" | "insufficient";

interface StatusBadgeProps {
  status: Status;
  label?: string;
}

const statusConfig: Record<Status, { bg: string; text: string; dot: string; defaultLabel: string }> = {
  stable: {
    bg: "bg-status-stable-bg",
    text: "text-status-stable",
    dot: "bg-status-stable",
    defaultLabel: "Stable compared with baseline",
  },
  review: {
    bg: "bg-status-review-bg",
    text: "text-status-review",
    dot: "bg-status-review",
    defaultLabel: "Change worth reviewing",
  },
  insufficient: {
    bg: "bg-status-insufficient-bg",
    text: "text-status-insufficient",
    dot: "bg-status-insufficient",
    defaultLabel: "Insufficient evidence",
  },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${config.bg} ${config.text} px-3 py-1 rounded-full text-sm font-medium`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {label ?? config.defaultLabel}
    </span>
  );
}