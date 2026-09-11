import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import DatePicker from "../../components/common/DatePicker";
import FormSelect from "../../components/forms/FormSelect";
import FormInput from "../../components/forms/FormInput";
import CalendarIcon from "../../assets/icons/calendar.svg";
import { useGetEdUsersByChapterQuery } from "../../services/ed/edUsersApi";
import { useUpdateM2OMutation, useGetM2OQuery } from "../../services/m2oApi";
import { useAppSelector } from "../../app/store";
import { useToast } from "../../components/toast/ToastProvider";

const timeOptions = [
  "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00",
];

export default function EditManyToOnePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = useAppSelector((s) => s.auth.user);
  const [userName] = useState("Mike");

  const [selectedMember, setSelectedMember] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [place, setPlace] = useState("");
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [updateM2O] = useUpdateM2OMutation();
  const { showToast } = useToast();

  // Get record from navigation state
  const record = (location.state as any)?.record;
  const m2oId = record?.id;

  // Fetch full M2O data
  const { data: m2oData, error: fetchError } = useGetM2OQuery(m2oId, {
    skip: !m2oId,
  });

  const myChapterId = String((authUser as any)?.basicInfo?.chapter || "");
  const { data: chapterUsersRes } = useGetEdUsersByChapterQuery(
    myChapterId ? { chapterId: myChapterId, page: 1, limit: 1000, sort: "name", order: "asc" } : ({} as any),
    { skip: !myChapterId }
  );

  const memberOptions = React.useMemo(() => {
    const base: { value: string; label: string }[] = [{ value: "", label: "Select a member" }];
    const items = (chapterUsersRes as any)?.data?.items || (chapterUsersRes as any)?.data || [];
    for (const u of items) base.push({ value: String(u.id), label: u.name });
    return base;
  }, [chapterUsersRes]);

  // Populate form with existing data
  useEffect(() => {
    if (m2oData?.data) {
      const data = m2oData.data;
      
      // Handle targetMemberId as object with _id property
      setSelectedMember(data.targetMemberId?._id || "");
      setPlace(data.place || "");
      setTopic(data.meetingTopic || "");
      
      // Parse date and time
      if (data.date) {
        const dateObj = new Date(data.date);
        const dateStr = dateObj.toISOString().split('T')[0];
        setSelectedDate(dateStr);
        
        const hours = dateObj.getUTCHours();
        const minutes = dateObj.getUTCMinutes();

        const timeValue = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
        const matchingTime = timeOptions.find((t) => t === timeValue);
        setSelectedTime(matchingTime || "");
      }
      setLoading(false);
    } else if (fetchError) {
      setErrMsg("Failed to load M2O session data");
      setLoading(false);
    }
  }, [m2oData, fetchError]);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) navigate("/login");
  }, [navigate]);

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Many to One", onClick: () => navigate("/business/many-to-one") },
    { label: "Edit Many to One" },
  ];

  const toIsoDateTime = (ymd: string, timeLabel: string): string => {
    try {
      const [hhStr, mmStr] = timeLabel.split(":");
      const hhPad = String(parseInt(hhStr, 10) || 0).padStart(2, "0");
      const mmPad = String(parseInt(mmStr, 10) || 0).padStart(2, "0");
      return `${ymd}T${hhPad}:${mmPad}:00.000Z`;
    } catch {
      return `${ymd}T00:00:00.000Z`;
    }
  };

  const handleUpdate = async () => {
    try {
      setErrMsg(null);
      setSubmitting(true);
      if (!selectedMember || !selectedDate) throw new Error("Please select member and date");
      
      const dateTime = selectedTime ? toIsoDateTime(selectedDate, selectedTime) : `${selectedDate}T00:00:00.000Z`;
      
      await updateM2O({
        id: m2oId,
        body: {
          targetMemberId: selectedMember,
          date: dateTime,
          meetingTopic: topic,
          place: place
        }
      }).unwrap();
      
      showToast({ title: "Many to One updated", kind: "success" });
      navigate("/business/many-to-one", { state: { toast: "M2O session updated successfully" } });
    } catch (e: any) {
      setErrMsg(e?.data?.message || e?.message || "Failed to update Many to One");
      showToast({ title: "Failed to update Many to One", description: e?.data?.message || e?.message, kind: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/business/many-to-one");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <Navbar userName={userName} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center text-white py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="mt-2">Loading M2O session...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!m2oId) {
    return (
      <div className="min-h-screen bg-[#0f1419]">
        <Navbar userName={userName} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center text-white py-8">
            <p className="text-red-500">M2O session ID not found</p>
            <button onClick={() => navigate("/business/many-to-one")} className="mt-4 px-4 py-2 bg-[#D85D27] rounded-md">
              Go Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />
      <main className="container mx-auto px-4 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="max-w-2xl mx-auto">
          <GradientContainer>
            <div className="rounded-2xl p-6 md:p-8">
              <div className="space-y-6">
                {/* Choose member */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Choose member</label>
                  <FormSelect
                    label=""
                    value={selectedMember}
                    onChange={(e) => setSelectedMember(e.target.value)}
                    options={memberOptions}
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Date</label>
                  <DatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    iconSrc={CalendarIcon}
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Time</label>
                  <FormSelect
                    label=""
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    options={[
                      { value: "", label: "Select Time" },
                      ...timeOptions.map(t => ({ value: t, label: t }))
                    ]}
                  />
                </div>

                {/* Place */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Place</label>
                  <FormInput
                    label=""
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="Enter meeting location"
                  />
                </div>

                {/* Topic */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Meeting Topic</label>
                  <FormInput
                    label=""
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter meeting topic"
                  />
                </div>

                {/* Error message */}
                {errMsg && (
                  <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg">
                    {errMsg}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleUpdate}
                    disabled={submitting}
                    className="flex-1 py-3 px-6 bg-[#D85D27] hover:bg-[#C24F20] disabled:bg-[#8B4513] text-white font-medium rounded-md transition-colors disabled:cursor-not-allowed"
                  >
                    {submitting ? "Updating..." : "Update M2O"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 px-6 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </GradientContainer>
        </div>
      </main>
    </div>
  );
}
