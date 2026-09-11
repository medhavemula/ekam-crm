import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import DatePicker from "../../components/common/DatePicker";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import { useConnectionsListQuery } from "../../services/connectionsApi";
import { useCreateP2PMutation } from "../../services/p2pApi";
import type { ConnectionCardApi } from "../../services/connectionsApi";
import CalendarIcon from "../../assets/icons/calendar.svg";
import { todayInputDate } from "../../utils/date";
import { useToast } from "../../components/toast/ToastProvider";

interface P2PFormData {
  meetWith: string;
  location: string;
  topic: string;
  date: string;
}

// Members fetched from API

export default function AddP2PPage() {
  const navigate = useNavigate();
  const [userName] = useState("Mike");
  const { showToast } = useToast();

  // Auth gate
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) navigate("/login");
  }, [navigate]);

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "P2P", onClick: () => navigate("/business/p2p") },
    { label: "Add P2P" },
  ];

  // Get today's date in YYYY-MM-DD format for the default value
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [formData, setFormData] = useState<P2PFormData>({
    meetWith: "",
    location: "",
    topic: "",
    date: todayString, // Set today's date as default
  });
  const [topicError, setTopicError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isTopicValid = (v: string) => (v ? v.replace(/[^a-zA-Z]/g, "").length >= 3 : false);

  // Fetch my connections for dropdown with search
  const { data: connectionsResp, isLoading: membersLoading, isError: membersError } = useConnectionsListQuery({ 
    type: "my", 
    limit: 20,
    q: searchQuery 
  });
  const memberOptions = React.useMemo(
    () => (connectionsResp?.data || []).map((c: ConnectionCardApi) => ({ 
      value: c.user.id, 
      label: `${c.user.name} - ${c.user.chapter || 'No Chapter'}` 
    })),
    [connectionsResp]
  );

  const [createP2P, { isLoading: isCreating, error: createError }] = useCreateP2PMutation();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
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
      meetWith: formData.meetWith,
      location: formData.location || undefined,
      topic: formData.topic,
      status: "COMPLETED" as const,
    };
    try {
      await createP2P(payload as any).unwrap();
      navigate("/business/p2p", {
        state: {
          toast: {
            title: "P2P Created!",
            description: "Your P2P has been added successfully.",
            kind: "success",
            durationMs: 4500,
          },
        },
        replace: true,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Create P2P failed", err);
      showToast({
        title: "Failed to create P2P",
        description: "Please try again later.",
        kind: "error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="max-w-2xl mx-auto">
          <GradientContainer>
            <div className="rounded-2xl p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Meet with */}
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
                  onSearchChange={setSearchQuery}
                  disableClientSideFilter
                />

                {/* Invited By removed as per requirements */}

                {membersError && (
                  <div className="text-sm text-yellow-400">Unable to load members. Please retry later.</div>
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
                  <label className="block text-sm text-gray-300 mb-1.5">Date</label>
                  {/* A P2P is a log of a meeting that already happened: it is saved
                      COMPLETED, the list filter cannot be extended past today, and the
                      view card only opens for a past date. Without this cap a future
                      date saved fine and then vanished - no list row, no view, no KPI. */}
                  <DatePicker
                    value={formData.date}
                    maxDate={todayInputDate()}
                    onChange={(v) => {
                      setFormData(prev => ({
                        ...prev,
                        date: v
                      }));
                    }}
                    iconSrc={CalendarIcon}
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={isCreating || !formData.meetWith || !formData.topic}
                    className="flex-1 px-6 py-3 bg-[#D85D27] hover:hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/business/p2p")}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
              {createError && (
                <div className="mt-3 text-sm text-red-400">Failed to create P2P. Please try again.</div>
              )}
            </div>
          </GradientContainer>
        </div>
      </main>
    </div>
  );
}
