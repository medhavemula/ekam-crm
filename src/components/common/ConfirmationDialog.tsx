import { useEffect, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Ban,
  Check,
  CircleCheck,
  CircleMinus,
  Loader2,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { activeThemeClass } from "../../theme/themeScope";

type ActionType =
  | 'delete'
  | 'block'
  | 'remove'
  | 'unblock'
  | 'withdraw'
  | 'accept'
  | 'reject';

type Variant = 'danger' | 'warning' | 'info';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  actionType?: ActionType;
  variant?: Variant;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** Extra content between the description and the buttons, e.g. a required choice. */
  children?: ReactNode;
  /** Holds the confirm button closed until the dialog's own content is satisfied. */
  confirmDisabled?: boolean;
}

const VARIANT_ACTION: Record<Variant, ActionType> = {
  danger: 'delete',
  warning: 'remove',
  info: 'accept',
};

/**
 * Copy, icon and tone per action.
 *
 * `destructive` decides which colour the confirm button carries — it is the only
 * thing separating "you are about to undo something" from "you are about to
 * restore something", and both used the same orange outline before.
 *
 * Descriptions are only supplied where the consequence is certain for every
 * caller of this shared dialog. Where it depends on context the caller passes
 * its own rather than this file inventing a reassurance it cannot guarantee.
 */
const ACTIONS: Record<
  ActionType,
  { icon: typeof Ban; title: string; confirm: string; description?: string; destructive: boolean }
> = {
  delete: {
    icon: Trash2,
    title: "Delete this?",
    confirm: "Delete",
    description: "This can't be undone.",
    destructive: true,
  },
  block: {
    icon: Ban,
    title: "Block access?",
    confirm: "Block",
    description: "They won't be able to sign in until you unblock them.",
    destructive: true,
  },
  remove: {
    icon: CircleMinus,
    title: "Remove this?",
    confirm: "Remove",
    destructive: true,
  },
  unblock: {
    icon: CircleCheck,
    title: "Restore access?",
    confirm: "Unblock",
    description: "They'll be able to sign in again straight away.",
    destructive: false,
  },
  withdraw: {
    icon: Undo2,
    title: "Withdraw this request?",
    confirm: "Withdraw",
    destructive: true,
  },
  accept: {
    icon: Check,
    title: "Accept this request?",
    confirm: "Accept",
    destructive: false,
  },
  reject: {
    icon: X,
    title: "Reject this request?",
    confirm: "Reject",
    destructive: true,
  },
};

export const ConfirmationDialog = (props: ConfirmationDialogProps) => {
  const {
    isOpen,
    onClose,
    onConfirm,
    isSubmitting = false,
    actionType,
    children,
    confirmDisabled,
    variant,
    title,
    description,
    confirmText,
    cancelText = 'Cancel'
  } = props;

  const reduceMotion = useReducedMotion();

  // Escape closes, unless a request is already in flight. The dialog previously
  // had no key handling at all.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, isSubmitting, onClose]);

  // The dialog portals to <body>, so it has to carry the page theme with it.
  // Resolving that during render is not enough: when a route mounts with the
  // dialog already open, the themed page wrapper is not in the DOM yet and the
  // query finds nothing, so the whole dialog falls back to the :root palette.
  // The layout effect re-resolves before paint, which covers that case without
  // a flash of the wrong theme.
  const [themeClass, setThemeClass] = useState(activeThemeClass);
  useLayoutEffect(() => {
    if (isOpen) setThemeClass(activeThemeClass());
  }, [isOpen]);

  const effectiveActionType = actionType || (variant ? VARIANT_ACTION[variant] : 'delete');
  const action = ACTIONS[effectiveActionType];
  const Icon = action.icon;

  // The label colour travels with the fill. Destructive stays white on red;
  // the accent fill carries whatever --ov-on-ember says, which is white on the
  // dark themes and the brand navy on Daylight, where the fill is the logo
  // orange and white on it would be 2.3:1.
  const confirmTone = action.destructive
    ? "bg-[var(--ov-danger-fill)] text-white hover:bg-[var(--ov-danger-fill-hover)]"
    : "bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)] hover:bg-[var(--ov-ember-fill-hover)]";

  const iconTone = action.destructive
    ? "bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]"
    : "bg-[var(--ov-ember-wash)] text-[var(--ov-ember)]";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          // Portaled to <body>, so the theme has to travel with it.
          className={`${themeClass} fixed inset-0 z-[9999] flex items-center justify-center p-4`}
        >
          <motion.div
            className="absolute inset-0 bg-black/70"
            onClick={() => !isSubmitting && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={action.description || description ? "confirm-desc" : undefined}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--ov-panel)] p-6 shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-line)]"
          >
            {/* The icon sits beside the question rather than as a 64px graphic
                centred above it — the sentence is the message, not the picture. */}
            <div className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconTone}`}
              >
                <Icon className="h-5 w-5" />
              </span>

              <div className="min-w-0 pt-0.5">
                <h2
                  id="confirm-title"
                  className="text-[17px] font-semibold leading-snug text-[var(--ov-ink)]"
                >
                  {title || action.title}
                </h2>
                {(description || action.description) && (
                  <p
                    id="confirm-desc"
                    className="mt-1.5 text-[13px] leading-5 text-[var(--ov-ink-3)]"
                  >
                    {description || action.description}
                  </p>
                )}
              </div>
            </div>

            {children && <div className="mt-4">{children}</div>}

            {/* Cancel was a solid grey slab and the destructive action a faint
                outline, so the safe choice looked like the primary one. The
                action being confirmed now carries the weight and the colour. */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-3)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting || confirmDisabled}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-60 ${confirmTone}`}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSubmitting ? "Working…" : confirmText || action.confirm}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ConfirmationDialog;
