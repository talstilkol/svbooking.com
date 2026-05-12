'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  as?: 'div' | 'article' | 'button';
}

export default function MotionCard({ children, className = '', onClick, as = 'div' }: Props) {
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden ${className}`}
      onClick={onClick}
    >
      {children}
    </Comp>
  );
}
