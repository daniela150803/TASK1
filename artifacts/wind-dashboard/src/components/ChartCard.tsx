import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, children, className = "" }: Props) {
  return (
    <div className={`bg-[hsl(222,40%,10%)] border border-[hsl(220,30%,16%)] rounded-lg overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-[hsl(220,30%,16%)]">
        <h3 className="text-sm font-semibold text-[hsl(210,40%,88%)]">{title}</h3>
        {subtitle && <p className="text-xs text-[hsl(220,20%,50%)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
