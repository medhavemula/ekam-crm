import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";
import FormInput from "../forms/FormInput";
import FormTextarea from "../forms/FormTextarea";

export interface ComposeMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: string, body: string) => void;
  recipientName: string;
}

const ComposeMessageModal: React.FC<ComposeMessageModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  recipientName,
}) => {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (subject.trim() && body.trim()) {
      onSubmit(subject, body);
      setSubject("");
      setBody("");
      onClose();
    }
  };

  const handleCancel = () => {
    setSubject("");
    setBody("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ov-scrim,rgba(0,0,0,0.55))] backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4">
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--ov-line-faint)] px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
                <h2 className="ekam-figure truncate text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
                  Compose Message
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

            {/* Body */}
            <div className="space-y-4 p-6">
              {/* Who it is going to, stated once and quietly — the dialog is
                  already titled, so a second 24px heading competed with it. */}
              <p className="text-[13px] text-[var(--ov-ink-4)]">
                To <span className="font-semibold text-[var(--ov-ink)]">{recipientName}</span>
              </p>
              <FormInput
                label="Subject"
                placeholder="Enter Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <FormTextarea
                label="Body"
                placeholder="Enter the message"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--ov-line-faint)] px-6 py-4">
              <button type="button" onClick={handleCancel} className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-fill-subtle)] px-6 text-[13px] font-semibold text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:cursor-not-allowed disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!subject.trim() || !body.trim()}
                className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </GradientContainer>
      </div>
    </div>
  );
};

export default ComposeMessageModal;
