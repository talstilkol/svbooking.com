'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface MotionCardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  hoverLift?: boolean;
}

export default function MotionCard({
  children,
  hoverLift = true,
  className = '',
  ...rest
}: MotionCardProps) {
  return (
    <motion.div
      whileHover={hoverLift ? { y: -6, transition: { type: 'spring', stiffness: 300, damping: 20 } } : undefined}
      whileTap={{ scale: 0.98 }}
      className={`bg-white dark:bg-zinc-900 rounded-2xl shadow-md border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
