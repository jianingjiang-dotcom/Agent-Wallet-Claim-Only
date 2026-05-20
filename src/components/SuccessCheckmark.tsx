// SuccessCheckmark — shared animated checkmark for connection / signing success.
// Mimics Lottie-style "spring scale + path draw" feel using framer-motion only.

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
}

export function SuccessCheckmark({ size = 80, className }: Props) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.05 }}
      className={cn(
        'relative rounded-full bg-success/15 flex items-center justify-center',
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Inner solid circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 20, delay: 0.15 }}
        className="absolute inset-2 rounded-full bg-success/25"
      />
      {/* Check path */}
      <svg
        viewBox="0 0 24 24"
        width={size * 0.55}
        height={size * 0.55}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative text-success"
      >
        <motion.path
          d="M5 12.5 L10 17.5 L19 7.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, delay: 0.25, ease: 'easeOut' }}
        />
      </svg>

      {/* Outer ring pulse */}
      <motion.div
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: 1.6, opacity: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
        className="absolute inset-0 rounded-full border-2 border-success"
      />
    </motion.div>
  );
}
