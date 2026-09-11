import React from "react";
import { motion, useReducedMotion } from "framer-motion";

interface FormCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * The single surface a form lives on.
 *
 * One card holding one grid of fields. A form is one object the reader is
 * filling in, so it gets one container — splitting it across panels makes the
 * parts look independently submittable, and adding a scan column of group
 * headings spends horizontal space the inputs need more than the labels do.
 */
export const FormCard: React.FC<FormCardProps> = ({ children, className = "" }) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl bg-[var(--ov-panel)] p-5 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)] sm:p-6 ${className}`}
    >
      {/* Three columns from lg, two from sm. Eight short fields in one column
          make a tall scroll out of a form that fits on one screen. */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </motion.div>
  );
};

export default FormCard;
