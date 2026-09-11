import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import GradientContainer from "./GradientContainer";
import type { ModerationReason } from "../../services/moderationApi";

const REASON_OPTIONS: { value: ModerationReason; label: string }[] = [
  { value: "SPAM", label: "Spam or misleading" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE", label: "Hate speech" },
  { value: "SEXUAL_CONTENT", label: "Sexual or explicit content" },
  { value: "VIOLENCE", label: "Violence or dangerous content" },
  { value: "MISINFORMATION", label: "False information" },
  { value: "OTHER", label: "Other" },
];

export interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: ModerationReason, details: string) => void | Promise<void>;
  isSubmitting?: boolean;
  /** Short noun for what is being reported, e.g. "post", "comment", "message", "profile". */
  contentLabel?: string;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

export const ReportDialog = (props: ReportDialogProps) => {
  const {
    isOpen,
    onClose,
    onConfirm,
    isSubmitting = false,
    contentLabel = "content",
    title,
    description,
    confirmText = "Submit Report",
    cancelText = "Cancel",
  } = props;

  const [reason, setReason] = useState<ModerationReason | "">("");
  const [details, setDetails] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);

  // Reset the form whenever the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setDetails("");
      setMenuOpen(false);
    }
  }, [isOpen]);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  if (!isOpen) return null;

  const selectedLabel = REASON_OPTIONS.find((o) => o.value === reason)?.label;

  const canSubmit = !!reason && !isSubmitting;

  const handleSubmit = () => {
    if (!reason) return;
    onConfirm(reason, details.trim());
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/70 z-[9998]" onClick={onClose} />

      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <GradientContainer className="w-full max-w-lg mx-auto">
          <div className="rounded-2xl flex flex-col p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-white">
              {title || `Report this ${contentLabel}?`}
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              {description ||
                `Tell us what's wrong so our admins can review it. This ${contentLabel} will be hidden from your view immediately, and we act on reports within 24 hours.`}
            </p>

            {/* Reason */}
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Reason
            </label>
            <div className="relative mt-2" ref={selectRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                className={`w-full flex items-center justify-between gap-2 bg-[#0f1419] border rounded-lg px-3 py-2.5 text-sm text-left transition-colors focus:outline-none focus:ring-1 focus:ring-[#D85D27] ${
                  menuOpen ? "border-[#D85D27]" : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <span className={selectedLabel ? "text-white" : "text-gray-500"}>
                  {selectedLabel || "Select a reason"}
                </span>
                <svg
                  className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {menuOpen && (
                <ul
                  role="listbox"
                  className="absolute z-10 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-gray-700 bg-[#1a2332] py-1 shadow-xl"
                >
                  {REASON_OPTIONS.map((o) => {
                    const active = o.value === reason;
                    return (
                      <li
                        key={o.value}
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setReason(o.value);
                          setMenuOpen(false);
                        }}
                        className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${
                          active ? "bg-[#D85D27]/15 text-[#F0A87E]" : "text-gray-200 hover:bg-gray-700/60"
                        }`}
                      >
                        <span>{o.label}</span>
                        {active && (
                          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Concern / details */}
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Your concern <span className="text-gray-500 normal-case">(optional)</span>
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="Describe the issue in your own words…"
              className="mt-2 w-full resize-none bg-[#0f1419] border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#D85D27]"
            />
            <div className="mt-1 text-right text-[11px] text-gray-500">{details.length}/1000</div>

            {/* Actions */}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-200 bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-60"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white border-2 border-[#D85D27] bg-transparent hover:bg-[#D85D27]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting…
                  </>
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </div>
          </div>
        </GradientContainer>
      </div>
    </>,
    document.body
  );
};

export default ReportDialog;
