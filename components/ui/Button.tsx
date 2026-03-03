'use client';
import { cn } from '@/lib/utils';
import { ReactNode, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  shimmer?: boolean;
  children: ReactNode;
}

const variants = {
  primary:
    'bg-gradient-to-r from-pink-soft to-lavender-deep text-white shadow-glow-pink hover:shadow-glow-purple',
  secondary:
    'glass border border-white/30 text-white hover:bg-white/20',
  ghost:
    'text-white/80 hover:text-white hover:bg-white/10',
  danger:
    'bg-red-500/80 text-white hover:bg-red-500',
};

const sizes = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  shimmer = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'relative font-medium transition-all duration-200 outline-none overflow-hidden',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {shimmer && !disabled && !loading && (
        <span className="absolute inset-0 shimmer opacity-0 hover:opacity-100 transition-opacity" />
      )}
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}
