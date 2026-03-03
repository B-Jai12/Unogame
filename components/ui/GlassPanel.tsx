import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassPanel({ children, className, hover }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl',
        hover && 'transition-all duration-300 hover:shadow-glass-hover hover:-translate-y-0.5',
        className
      )}
    >
      {children}
    </div>
  );
}
