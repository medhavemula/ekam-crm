import React, { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import DatePicker from "../../components/common/DatePicker";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import { useConnectionsListQuery } from "../../services/connectionsApi";
import type { ConnectionCardApi } from "../../services/connectionsApi";
import { useP2PGetQuery, useUpdateP2PMutation } from "../../services/p2pApi";
import CalendarIcon from "../../assets/icons/calendar.svg";
import { todayInputDate } from "../../utils/date";
import { useToast } from "../../components/toast/ToastProvider";

interface P2PFormData {
  meetWith: string;
  location: string;
  topic: string;
  date: string;
}

/** ISO instant -> the YYYY-MM-DD the DatePicker expects, in local time. */
const toInputDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export default function EditP2PPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [userName] = useState("Mike");

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) navigate("/login");
  }, [navigate]);

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "P2P", onClick: () => navigate("/business/p2p") },
    { label: "Edit P2P" },
  ];

  const { data: p2pResp, isLoading: recordLoading, isError: recordError } = useP2PGetQuery(id!, {
    skip: !id,
  });
  const record = p2pResp?.data;

  const [formData, setFormData] = useState<P2PFormData | null>(null);
  const [topicError, setTopicError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Prefill once the record arrives. Keyed on the record id so a later refetch
  // does not overwrite edits the member has already typed.
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  React.useEffect(() => {
    if (!record) return;
    const rid = String(record._id || record.id || "");
    if (!rid || prefilledFor === rid) return;
    setFormData({
      meetWith: String(record.meetWith?.id || record.meetWith || ""),
      location: record.location || "",
      topic: record.topic || "",
      date: toInputDate(record.date),
    });
    setPrefilledFor(rid);
  }, [record, prefilledFor]);

  const isTopicValid = (v: string) => (v ? v.replace(/[^a-zA-Z]/g, "").length >= 3 : false);

  const { data: connectionsResp, isLoading: membersLoading } = useConnectionsListQuery({
    type: "my",
    limit: 20,
    q: searchQuery,
  });

  // The saved counterpart may not appear in the first page of connections, and a
  // select whose value is not among its options renders blank - which would read
  // as "no member" on a record that definitely has one. Seed it from the record.
  const memberOptions = React.useMemo(() => {
    const opts = (connectionsResp?.data || []).map((c: ConnectionCardApi) => ({
      value: c.user.id,
      label: `${c.user.name} - ${c.user.chapter || "No Chapter"}`,
    }));
    const currentId = formData?.meetWith;
    if (currentId && !opts.some((o: { value: string }) => o.value === currentId)) {
      const name =
        (record?.meetWith && (record.meetWith.name as string)) || "Current member";
      opts.unshift({ value: currentId, label: name });
    }
    return opts;
  }, [connectionsResp, formData?.meetWith, record]);

  const [updateP2P, { isLoading: isSaving }] = useUpdateP2PMutation();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!formData || !id) return;
    if (!isTopicValid(formData.topic)) {
      setTopicError("Topic must contain at least 3 letters");
      return;
    }

    // Same rule as the add form: a date-only value becomes local midnight, while
    // "today" keeps the current time so the record sorts where the member expects.
    const selected = new Date(formData.date);
    const now = new Date();
    const isToday = selected.toDateString() === now.toDateString();
    const dateToUse = isToday
      ? now
      : new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());

    try {
      await updateP2P({
        id,
        date: dateToUse.toISOString(),
        meetWith: formData.meetWith,
        location: formData.location || "",
        topic: formData.topic,
      }).unwrap();
      navigate("/business/p2p", {
        state: {
          toast: {
            title: "P2P updated",
            description: "Both members now see the updated details.",
            kind: "success",
            durationMs: 4500,
          },
        },
        replace: true,
      });
    } catch {
      showToast({
        title: "Failed to update P2P",
        description: "Please try again later.",
        kind: "error",
      });
    }
  };

  const body = () => {
    if (recordLoading || (!formData && !recordError)) {
      return <div className="p-6 text-sm text-blue-300">Loading P2P...</div>;
    }
    if (recordError || !formData) {
      return (
        <div className="p-6">
          <p className="text-sm text-red-400">
            This P2P could not be loaded. It may have been removed, or you may not have
            access to it.
          </p>
          <button
            type="button"
            onClick={() => navigate("/business/p2p")}
            className="mt-4 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Back to P2P
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSelect
          label="Meet"
          isRequired
          placeholder={membersLoading ? "Loading members..." : "Select a member"}
          options={memberOptions}
          value={formData.meetWith}
          onChange={(e) => setFormData({ ...formData, meetWith: e.target.value })}
          searchable
          searchPlaceholder="Search member"
          onSearchChange={setSearchQuery}
          disableClientSideFilter
        />

        <FormInput
          label="Location"
          placeholder="Enter location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />

        <FormInput
          label="Topic"
          placeholder="Enter topic discussion"
          value={formData.topic}
          onChange={(e) => {
            setFormData({ ...formData, topic: e.target.value });
            if (topicError) setTopicError("");
          }}
          isRequired
          error={topicError}
        />

        <div>
          <label className="block text-sm text-gray-300 mb-1.5">Date</label>
          {/* Capped for the same reason as the add form: a future date would leave
              the record outside the list filter and the view card. */}
          <DatePicker
            value={formData.date}
            maxDate={todayInputDate()}
            onChange={(v) => setFormData((prev) => (prev ? { ...prev, date: v } : prev))}
            iconSrc={CalendarIcon}
          />
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={isSaving || !formData.meetWith || !formData.topic}
            className="flex-1 px-6 py-3 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() =>
              navigate((location.state as any)?.from || "/business/p2p")
            }
            className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />
      <main className="container mx-auto px-4 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />
        <div className="max-w-2xl mx-auto">
          <GradientContainer>
            <div className="rounded-2xl p-6 md:p-8">{body()}</div>
          </GradientContainer>
        </div>
      </main>
    </div>
  );
}
