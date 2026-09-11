import React, { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "./chartTheme";

export interface FigureProps {
  /** Raw value. The component owns its formatting so it can format mid-flight. */
  value: number;
  format: (n: number) => string;
  /** Full-precision string for the title attribute when the display is compacted. */
  title?: string;
  className?: string;
  delay?: number;
  duration?: number;
  /** Rendered after the number, in a quieter weight — "opportunities", "%", etc. */
  suffix?: React.ReactNode;
}

/**
 * A number that counts to its value.
 *
 * Writes straight to the DOM node rather than through state: a 60fps setState on
 * six of these would re-render the whole overview every frame. On a refetch it
 * counts from the previous value rather than from zero, so a filter change reads
 * as the number moving rather than the panel resetting.
 */
export const Figure: React.FC<FigureProps> = ({
  value,
  format,
  title,
  className = "",
  delay = 0,
  duration = 0.9,
  suffix,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from = previous.current;
    previous.current = value;

    if (reduceMotion || from === value) {
      el.textContent = format(value);
      return;
    }

    // Hold the start value through the delay, or the number would sit at its
    // final value and then jump back to zero when the tween begins.
    const start = from ?? 0;
    el.textContent = format(start);

    const controls = animate(start, value, {
      duration,
      delay,
      ease: EASE_OUT,
      onUpdate: (v) => {
        el.textContent = format(v);
      },
      onComplete: () => {
        el.textContent = format(value);
      },
    });

    return () => controls.stop();
  }, [value, format, delay, duration, reduceMotion]);

  return (
    <span className={`ekam-figure ${className}`} title={title}>
      <span ref={ref}>{format(value)}</span>
      {suffix}
    </span>
  );
};

export default Figure;
