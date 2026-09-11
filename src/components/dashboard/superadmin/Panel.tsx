import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "./chartTheme";

interface PanelProps {
  children: React.ReactNode;
  className?: string;
  /** Renders as a button-like surface with hover/focus affordance. */
  interactive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  /** Entrance delay, in seconds, on the shared load timeline. */
  delay?: number;
}

/**
 * The single card surface for the Super Admin overview.
 *
 * A hairline ring rather than a gradient frame — across a rail, a flow panel and
 * three charts a heavy frame reads as chrome competing with the data. The top
 * edge carries a one-pixel highlight so a panel catches the light from the same
 * direction as the page floor above it.
 */
export const Panel: React.FC<PanelProps> = ({
  children,
  className = "",
  interactive = false,
  onClick,
  ariaLabel,
  delay = 0,
}) => {
  const reduceMotion = useReducedMotion();

  const base =
    "relative overflow-hidden rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line)] " +
    "shadow-[var(--ov-shadow-panel)]";

  const entrance = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, delay, ease: EASE_OUT },
      };

  if (interactive && onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        whileHover={reduceMotion ? undefined : { y: -2 }}
        transition={{ duration: 0.2, ease: EASE_OUT }}
        {...entrance}
        className={`${base} w-full text-left transition-colors duration-200 hover:bg-[var(--ov-panel-hover)] hover:ring-[color:var(--ov-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${className}`}
      >
        {children}
      </motion.button>
    );
  }

  return (
    <motion.div
      {...entrance}
      className={`${base} transition-colors duration-200 hover:ring-[color:var(--ov-line-strong)] ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default Panel;
