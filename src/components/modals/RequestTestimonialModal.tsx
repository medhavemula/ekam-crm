import { useState, useMemo } from "react";
import GradientContainer from "../common/GradientContainer";
import FormSelect from "../forms/FormSelect";
import { useToast } from "../toast/ToastProvider";

export type RequestMember = { id: string; name: string; avatarUrl?: string; chapter?: string };

export interface RequestTestimonialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (toUserId: string, message: string) => Promise<void> | void;
  members: RequestMember[];
  onSearchChange?: (query: string) => void;
}

export default function RequestTestimonialModal({ isOpen, onClose, onSubmit, members, onSearchChange }: RequestTestimonialModalProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ selectedId: false, message: false });
  const { showToast } = useToast();

  const MAX_LEN = 500;
  const lettersCount = (message || "").replace(/[^a-zA-Z]/g, "").length;
  const isMessageValid = lettersCount >= 20;
  const canSubmit = Boolean(selectedId) && isMessageValid && !submitting;
  const membersSorted = useMemo(() => [...(members || [])].sort((a, b) => a.name.localeCompare(b.name)), [members]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setTouchedFields({ selectedId: true, message: true });
    if (!Boolean(selectedId) || !isMessageValid) return;
    try {
      setSubmitting(true);
      await onSubmit(selectedId, message.trim());
      // success -> show success toast, reset and close
      showToast({ title: "Request sent", description: "Your testimonial request has been sent.", kind: "success" });
      setMessage("");
      setSelectedId("");
      setTouchedFields({ selectedId: false, message: false });
      onClose();
    } catch (e: any) {
      // error -> keep open, show toast
      // eslint-disable-next-line no-console
      console.error(e);
      
      // Handle specific error cases
      let errorMessage = "Please ensure the message meets the requirements and try again.";
      if (e?.status === 409) {
        errorMessage = "You have already sent a testimonial request to this person. Please wait 14 days before sending another request.";
      } else if (e?.data?.message) {
        errorMessage = e.data.message;
      }
      
      showToast({ title: "Failed to send request", description: errorMessage, kind: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setMessage("");
    setSelectedId("");
    setTouchedFields({ selectedId: false, message: false });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-center items-center overflow-y-auto bg-black/70 backdrop-blur-sm pt-30 md:pt-45 pb-10">
      <div className="w-full max-w-xl mx-4">
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h2 className="text-2xl font-semibold text-white">Request Testimonial</h2>
              <button onClick={handleCancel} className="text-orange-500 hover:text-orange-600 transition-colors" aria-label="Close">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="mb-5">
                <FormSelect
                  label="Choose member"
                  placeholder="Select a member"
                  options={[{ value: "", label: "Select a member" }, ...membersSorted.map((m) => ({ value: m.id, label: m.name }))]}
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setTouchedFields(prev => ({ ...prev, selectedId: true }));
                  }}
                  searchable
                  searchPlaceholder="Search member"
                  onSearchChange={onSearchChange}
                  disableClientSideFilter={Boolean(onSearchChange)}
                />
                {touchedFields.selectedId && !selectedId && <p className="text-xs text-red-400 mt-1">Please select a member</p>}
              </div>

              <label className="block text-sm text-gray-300 mb-2">Testimonial</label>
              <textarea
                placeholder="Enter the message"
                value={message}
                onChange={(e) => {
                    if (e.target.value.length <= MAX_LEN) {
                      setMessage(e.target.value);
                      setTouchedFields(prev => ({ ...prev, message: true }));
                    }
                  }}
                rows={6}
                className="w-full px-3 py-2 bg-[#1a2332] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
              <div className="mt-1 flex justify-between text-xs">
                <span className={isMessageValid || !touchedFields.message ? "text-gray-400" : "text-red-400"}>
                  {lettersCount}/20 letters minimum
                </span>
                <span className={message.length >= MAX_LEN ? "text-red-400" : "text-gray-400"}>{message.length}/{MAX_LEN}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-center gap-3 px-6 py-4">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-8 py-2 bg-[#D85D27] hover:bg-[#C24F20] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
              <button onClick={handleCancel} className="px-8 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </GradientContainer>
      </div>
    </div>
  );
}

