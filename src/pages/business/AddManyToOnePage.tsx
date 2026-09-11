import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";
import DatePicker from "../../components/common/DatePicker";
import FormSelect from "../../components/forms/FormSelect";
import FormInput from "../../components/forms/FormInput";
import CalendarIcon from "../../assets/icons/calendar.svg";
// import { useP2PMembersQuery, type P2PMember } from "../../services/p2pApi";
import { useGetEdUsersByChapterQuery } from "../../services/ed/edUsersApi";
import { useCreateM2OMutation } from "../../services/m2oApi";
import { useAppSelector } from "../../app/store";
import { useToast } from "../../components/toast/ToastProvider";

// Members now sourced from ED Chapter Users API

const timeOptions = [
  "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00",
];

export default function AddManyToOnePage() {
  const navigate = useNavigate();
  const authUser = useAppSelector((s) => s.auth.user);
  const [userName] = useState("Mike");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedMember, setSelectedMember] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [place, setPlace] = useState("");
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [createM2O] = useCreateM2OMutation();
  const { showToast } = useToast();

  const myChapterId = String((authUser as any)?.basicInfo?.chapter || "");
  const { data: chapterUsersRes } = useGetEdUsersByChapterQuery(
    myChapterId ? { 
      chapterId: myChapterId, 
      page: 1, 
      limit: 15, 
      sort: "name", 
      order: "asc",
      q: searchTerm.length >= 2 ? searchTerm : undefined
    } : ({} as any),
    { skip: !myChapterId }
  );
  const memberOptions = React.useMemo(() => {
    const base: { value: string; label: string }[] = [{ value: "", label: "Select a member" }];
    const items = (chapterUsersRes as any)?.data?.items || (chapterUsersRes as any)?.data || [];
    // Filter items based on search term if search is active
    const filteredItems = searchTerm.length >= 2 
      ? items.filter((u: any) => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : items;
    for (const u of filteredItems) base.push({ value: String(u.id), label: u.name });
    return base;
  }, [chapterUsersRes, searchTerm]);

  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) navigate("/login");
  }, [navigate]);

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "Many to One", onClick: () => navigate("/business/many-to-one") },
    { label: "Add Many to One" },
  ];

  const toIsoDateTime = (ymd: string, timeLabel: string): string => {
    try {
      const [hhStr, mmStr] = timeLabel.split(":");
      const hhPad = String(parseInt(hhStr, 10) || 0).padStart(2, "0");
      const mmPad = String(parseInt(mmStr, 10) || 0).padStart(2, "0");
      // Send as UTC ISO to be consistent
      return `${ymd}T${hhPad}:${mmPad}:00.000Z`;
    } catch {
      return `${ymd}T00:00:00.000Z`;
    }
  };

  const handleCreate = async () => {
    try {
      setErrMsg(null);
      setSubmitting(true);
      if (!selectedMember || !selectedDate) throw new Error("Please select member and date");
      const dateTime = selectedTime ? toIsoDateTime(selectedDate, selectedTime) : `${selectedDate}T00:00:00.000Z`;
      await createM2O({ 
        targetMemberId: selectedMember, 
        date: dateTime,
        meetingTopic: topic,
        place: place
      }).unwrap();
      showToast({ title: "Many to One created", kind: "success" });
      navigate("/business/many-to-one");
    } catch (e: any) {
      setErrMsg(e?.data?.message || e?.message || "Failed to create Many to One");
      showToast({ title: "Failed to create Many to One", description: e?.data?.message || e?.message, kind: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/business/many-to-one");
  };

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
                    searchable
                    searchPlaceholder="Search member"
                    onSearchChange={setSearchTerm}
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

                {/* Topic */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Topic</label>
                  <FormInput
                    label=""
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter meeting topic"
                  />
                </div>

                {/* Place */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Place</label>
                  <FormInput
                    label=""
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="Enter place"
                  />
                </div>


                {/* Buttons */}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleCreate}
                    disabled={submitting || !selectedMember || !selectedDate || !selectedTime}
                    className="flex-1 px-6 py-3 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Creating..." : "Create"}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {errMsg && <div className="text-red-400 text-sm pt-2">{errMsg}</div>}
              </div>
            </div>
          </GradientContainer>
        </div>
      </main>
    </div>
  );
}
