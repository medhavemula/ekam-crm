import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";
import FormTextarea from "../forms/FormTextarea";

export interface WriteTestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: string, body: string) => Promise<void> | void;
  recipientName: string;
}

/**
 * WriteTestimonialModal Component
 * Modal for writing testimonials with only a body field.
 */
const WriteTestimonialModal: React.FC<WriteTestimonialModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  recipientName,
}) => {
  const subject = "";
  const [body, setBody] = useState("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const MIN_LEN = 26;
  const MAX_LEN = 500;

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    if (trimmed.length < MIN_LEN) {
      setErrorMsg(`Testimonial must be at least ${MIN_LEN} characters.`);
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await Promise.resolve(onSubmit(subject, body));
      setBody("");
      onClose();
    } catch (e: any) {
      let msg: string = e?.data?.message || e?.message || "Failed to submit testimonial";
      // Some backends send validation errors as a JSON string array in message
      if (typeof msg === "string") {
        try {
          const parsed = JSON.parse(msg);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.message) {
            msg = String(parsed[0].message);
          }
        } catch (_) {
          // ignore parse errors, show raw message
        }
      }
      setErrorMsg(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setBody("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ov-scrim,rgba(0,0,0,0.55))] backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4">
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--ov-line-faint)] px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
                <h2 className="ekam-figure truncate text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
                  Write a testimonial
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 p-6">
              {/* Who it is about, stated once and quietly: the dialog already
                  has a title, and a second 24px heading competed with it. */}
              <p className="text-[13px] text-[var(--ov-ink-4)]">
                About <span className="font-semibold text-[var(--ov-ink)]">{recipientName}</span>
              </p>

              {/* Body Field */}
              <FormTextarea
                label="Testimonial"
                placeholder="Enter the message"
                value={body}
                onChange={(e) => { if (e.target.value.length <= MAX_LEN) { setBody(e.target.value); if (errorMsg) setErrorMsg(""); } }}
                rows={6}
              />
              <div className="flex justify-between text-[12px]">
                {/* Below the minimum this is the reason Submit is disabled, so
                    it says so rather than sitting there as grey small print. */}
                <span
                  className={
                    body.trim().length > 0 && body.trim().length < MIN_LEN
                      ? "text-[var(--ov-ember)]"
                      : "text-[var(--ov-ink-4)]"
                  }
                >
                  {body.trim().length > 0 && body.trim().length < MIN_LEN
                    ? `${MIN_LEN - body.trim().length} more characters needed`
                    : `Minimum ${MIN_LEN} characters`}
                </span>
                <span
                  className={
                    body.length >= MAX_LEN ? "text-[var(--ov-danger)]" : "text-[var(--ov-ink-4)]"
                  }
                >
                  {body.length}/{MAX_LEN}
                </span>
              </div>
              {errorMsg && (
                <div className="text-[13px] text-[var(--ov-danger)]">{errorMsg}</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--ov-line-faint)] px-6 py-4">
              <button type="button" onClick={handleCancel} className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-fill-subtle)] px-6 text-[13px] font-semibold text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:cursor-not-allowed disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!body.trim() || body.trim().length < MIN_LEN || submitting}
                className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </GradientContainer>
      </div>
    </div>
  );
};

export default WriteTestimonialModal;
