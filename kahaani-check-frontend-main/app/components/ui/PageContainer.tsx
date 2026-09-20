import React from "react";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({
  children,
  className = "",
}: PageContainerProps) {
  return (
    <div className={`mx-auto max-w-[1280px] px-6 py-8 sm:px-8 lg:px-10 ${className}`}>
      {children}
    </div>
  );
}
