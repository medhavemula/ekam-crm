import React, { useState } from "react";
import GradientContainer from "../common/GradientContainer";
import FormInput from "../forms/FormInput";
import FormSelect from "../forms/FormSelect";
import DatePicker from "../common/DatePicker";
import CalendarIcon from "../../assets/icons/calendar.svg";
import { useConnectionsListQuery } from "../../services/connectionsApi";
import { useCreateP2PMutation } from "../../services/p2pApi";
import type { ConnectionCardApi } from "../../services/connectionsApi";
import { useToast } from "../../components/toast/ToastProvider";

export interface AddP2PModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId?: string; // Pre-selected user ID if coming from profile
  recipientName?: string; // Pre-selected user name if coming from profile
}

interface P2PFormData {
  meetWith: string;
  location: string;
  topic: string;
  date: string;
}

const AddP2PModal: React.FC<AddP2PModalProps> = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
}) => {
  const { showToast } = useToast();
  
  // Get today's date in YYYY-MM-DD format for the default value
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [formData, setFormData] = useState<P2PFormData>({
    meetWith: recipientId || "",
    location: "",
    topic: "",
    date: todayString,
  });
  const [topicError, setTopicError] = useState("");

  const isTopicValid = (v: string) => (v ? v.replace(/[^a-zA-Z]/g, "").length >= 3 : false);

  // Fetch my connections for dropdown
  const { data: connectionsResp, isLoading: membersLoading, isError: membersError } = useConnectionsListQuery({ type: "my", limit: 20 });
  const memberOptions = React.useMemo(
    () => (connectionsResp?.data || []).map((c: ConnectionCardApi) => ({ 
      value: c.user.id, 
      label: `${c.user.name} - ${c.user.chapter || 'No Chapter'}` 
    })),
    [connectionsResp]
  );

  const [createP2P, { isLoading: isCreating, error: createError }] = useCreateP2PMutation();

  const handleSubmit = async () => {
    // Validate topic only on submit: at least 3 letters
    if (!isTopicValid(formData.topic)) {
      setTopicError("Topic must contain at least 3 letters");
      return;
    }
    
    // Handle date logic: if selected date is today, use current time; else use 00:00:00
    const selectedDate = new Date(formData.date);
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    let dateToUse: Date;
    if (isToday) {
      // Use current time for today
      dateToUse = new Date();
    } else {
      // Use selected date with time 00:00:00 for other dates
      dateToUse = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    }
    
    const payload = {
      date: dateToUse.toISOString(),
      meetWith: recipientId || formData.meetWith, // Use recipientId if available, otherwise form value
      location: formData.location || undefined,
      topic: formData.topic,
      status: "COMPLETED" as const,
    };
    
    try {
      await createP2P(payload as any).unwrap();
      showToast({ 
        title: "P2P Created!", 
        description: "Your P2P has been added successfully.", 
        kind: "success" 
      });
      handleClose();
    } catch (err) {
      console.error("Create P2P failed", err);
      showToast({
        title: "Failed to create P2P",
        description: "Please try again later.",
        kind: "error",
      });
    }
  };

  const handleClose = () => {
    setFormData({
      meetWith: recipientId || "",
      location: "",
      topic: "",
      date: todayString,
    });
    setTopicError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ov-scrim,rgba(0,0,0,0.55))] p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] relative">
        <GradientContainer>
          <div className="rounded-2xl overflow-visible">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--ov-line-faint)] px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
                <h2 className="ekam-figure truncate text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
                  Add P2P
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
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
            <div className="p-6">
              <div className="space-y-4">
                {/* Meet with */}
                {recipientId && recipientName ? (
                  // Show as readonly input when recipient is pre-selected
                  <FormInput
                    label="Meet"
                    value={recipientName}
                    disabled={true}
                  />
                ) : (
                  // Show as dropdown when no recipient is pre-selected
                  <FormSelect
                    label="Meet"
                    isRequired
                    placeholder={membersLoading ? "Loading members..." : "Select a member"}
                    options={memberOptions}
                    value={formData.meetWith}
                    onChange={(e) => setFormData({ ...formData, meetWith: e.target.value })}
                    searchable
                    searchPlaceholder="Search member"
                    disabled={membersLoading}
                  />
                )}

                {membersError && (
                  <div className="text-[13px] text-[var(--ov-danger)]">Unable to load members. Please retry later.</div>
                )}

                {/* Location */}
                <FormInput
                  label="Location"
                  placeholder="Enter location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />

                {/* Topic */}
                <FormInput
                  label="Topic"
                  placeholder="Enter topic discussion"
                  value={formData.topic}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({ ...formData, topic: v });
                    // Do not validate while typing; clear any previous submit error to avoid confusion
                    if (topicError) setTopicError("");
                  }}
                  isRequired
                  error={topicError}
                />

                {/* Date */}
                <div>
                  <label className="mb-1.5 block text-xs text-[var(--field-label)]">Date</label>
                  <DatePicker
                    value={formData.date}
                    onChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        date: v
                      }));
                    }}
                    iconSrc={CalendarIcon}
                  />
                </div>

                {createError && (
                  <div className="rounded-xl bg-[var(--ov-danger-wash)] p-3 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-danger)]">
                    Failed to create P2P. Please try again.
                  </div>
                )}
              </div>
            </div>

            {/* Footer. The primary sits on the right of a right-aligned pair,
                as it does everywhere else in the app. */}
            <div className="flex items-center justify-end gap-3 border-t border-[color:var(--ov-line-faint)] px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isCreating}
                className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-fill-subtle)] px-6 text-[13px] font-semibold text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isCreating || (!recipientId && !formData.meetWith) || !formData.topic}
                className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </GradientContainer>
      </div>
    </div>
  );
};

export default AddP2PModal;
