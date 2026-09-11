import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { XCircle } from "lucide-react";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import FormInput from "../../../components/forms/FormInput";
import { ADMIN_THEME } from "../../../theme/themeScope";

/** Half-hour slots from 07:00 to 20:00, plus a way out to a free-text time. */
const MEETING_TIME_OPTIONS = [
  { value: "", label: "Select time" },
  ...Array.from({ length: 27 }, (_, i) => {
    const minutes = 7 * 60 + i * 30;
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = minutes % 60 === 0 ? "00" : "30";
    const label = hh + ":" + mm;
    return { value: label, label };
  }),
  { value: "custom", label: "Custom time..." },
];
import FormSelect from "../../../components/forms/FormSelect";
import DatePicker from "../../../components/common/DatePicker";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { useToast } from "../../../components/toast/ToastProvider";
import { 
  useUpdateEdChapterMutation,
  useGetEdChaptersQuery,
  useGetEdChapterQuery
} from "../../../services/ed";

// Format date for display in input type="date"
const formatDateForInput = (dateString?: string) => {
  if (!dateString) return '';
  try {
    // Handle ISO date strings
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return ''; // Return empty if invalid date
    return date.toISOString().split('T')[0];
  } catch (error) {
    return '';
  }
};

export default function EditChapterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { chapterId } = useParams<{ chapterId: string }>();
  const [errorMsg, setErrorMsg] = useState<string>("");
  // Fetch single chapter data via API
  const { data: chapterDataRes } = useGetEdChapterQuery(
    chapterId || '',
    { skip: !chapterId }
  );
  
  // Extract chapter data from API response
  const chapterFromApi = (chapterDataRes?.data as any)?.chapter || {} as any;
  const chapterData = chapterFromApi ? {
    regionId: chapterFromApi.region || '',
    regionName: '', // We'll need to fetch this separately if needed
    chapterName: chapterFromApi.name || chapterFromApi.chapterName || '',
    area: chapterFromApi.area || chapterFromApi.city || '',
    launchDate: chapterFromApi.launchDate || chapterFromApi.createdAt || '',
    meetingCadence: chapterFromApi.meetingCadence || chapterFromApi.meetingType || '',
    alternate_interval_weeks: chapterFromApi.alternate_interval_weeks || 2,
    meetingDate: chapterFromApi.meetingDate || '',
    meetingTime: chapterFromApi.meetingTime || '',
    meetingDay: chapterFromApi.meetingDay || '',
    meetingWeekday: chapterFromApi.meetingWeekday || 0,
    members: chapterFromApi.members || [],
    leadership: chapterFromApi.leadership || {},
    lastMeetingAt: chapterFromApi.lastMeetingAt || '',
    meetingMode: chapterFromApi.meetingMode || '',
    status: chapterFromApi.status || '',
    createdAt: chapterFromApi.createdAt || '',
    updatedAt: chapterFromApi.updatedAt || '',
  } : {
    // Default empty state when no chapter data
    regionId: '',
    regionName: '',
    chapterName: '',
    area: '',
    launchDate: '',
    meetingCadence: '',
    alternate_interval_weeks: 2,
    meetingDate: '',
    meetingTime: '',
    meetingDay: '',
    meetingWeekday: 0,
    members: [],
    leadership: {},
    lastMeetingAt: '',
    meetingMode: '',
    status: '',
    createdAt: '',
    updatedAt: '',
  };
  
  // Redirect back if required data is missing
  useEffect(() => {
    if (!chapterData || !chapterData.regionId || !chapterData.chapterName) {
      showToast({
        title: "Error",
        description: "Missing required chapter data. Please try again.",
        kind: "error"
      });
      navigate(`/admin/regional-board/chapter/${chapterId}`);
    }
  }, [chapterData, navigate, showToast]);
  
  // Don't render the form if we don't have the required data
  if (!chapterData || !chapterData.regionId || !chapterData.chapterName) {
    return (
      <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
        <Navbar userName="Admin" />
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-6">
            <h1 className="mb-2 text-[26px] font-bold text-[var(--ov-ink)]">Edit chapter</h1>
            <PageHeader
              breadcrumbs={[
                { 
                  label: "Regional Board", 
                  onClick: () => navigate("/admin/regional-board") 
                },
                { 
                  label: "Chapter Detail", 
                  onClick: () => navigate(`/admin/regional-board/chapter/${chapterId}`) 
                },
                { label: `Edit Chapter` },
              ]}
            />
          </div>
        </div>
      </div>
    );
  }

  // Form state - we can safely use non-null assertion here because we've already checked these values
  const [formData, setFormData] = useState<{
    name: string;
    regionId: string;
    launchDate: string;
    area: string;
    meetingCadence: string;
    alternate_interval_weeks: number;
    meetingDate: string;
    meetingTime: string;
    meetingDay: string;
    meetingWeekday: number;
  }>({
    name: chapterData.chapterName,
    regionId: chapterData.regionId,
    launchDate: formatDateForInput(chapterData.launchDate),
    area: chapterData.area || "",
    meetingCadence: chapterData.meetingCadence || "",
    alternate_interval_weeks: chapterData.alternate_interval_weeks || 2,
    meetingDate: formatDateForInput(chapterData.meetingDate),
    meetingTime: chapterData.meetingTime || "",
    meetingDay: chapterData.meetingDay || "",
    meetingWeekday: chapterData.meetingWeekday || 0,
  });
  
  // Add search state for areas
  const [areaSearch, setAreaSearch] = useState("");
  const [showCustomAreaInput, setShowCustomAreaInput] = useState(false);
  const [originalArea, setOriginalArea] = useState(chapterData.area || "");

  // Update mutation with proper error handling
  const [updateChapter] = useUpdateEdChapterMutation();
  
  // Fetch existing chapters to get areas (with search filter)
  const { data: chaptersRes } = useGetEdChaptersQuery({ 
    limit: 20, 
    city: areaSearch || undefined 
  });
  
  // Extract unique areas from existing chapters
  const existingAreas = useMemo(() => {
    if (!chaptersRes?.data?.items) return [];
    const areas = chaptersRes.data.items
      .map(chapter => chapter.area)
      .filter((area): area is string => area !== undefined && area.trim() !== '');
    return [...new Set(areas)].sort(); // Remove duplicates and sort alphabetically
  }, [chaptersRes, areaSearch]); // Add areaSearch to dependency array
  
  const initialSnapshot = useMemo(() => ({
    name: chapterData.chapterName || "",
    area: chapterData.area || "",
    meetingCadence: chapterData.meetingCadence || "",
    meetingTime: chapterData.meetingTime || "",
    meetingDate: formatDateForInput(chapterData.meetingDate) || "",
    launchDate: formatDateForInput(chapterData.launchDate) || "",
    alternate_interval_weeks: chapterData.alternate_interval_weeks || 2,
  }), [chapterData]);

  const isDirty = useMemo(() => {
    return (
      formData.name !== initialSnapshot.name ||
      formData.area !== initialSnapshot.area ||
      formData.meetingCadence !== initialSnapshot.meetingCadence ||
      formData.meetingTime !== initialSnapshot.meetingTime ||
      formData.meetingDate !== initialSnapshot.meetingDate ||
      formData.launchDate !== initialSnapshot.launchDate ||
      formData.alternate_interval_weeks !== initialSnapshot.alternate_interval_weeks
    );
  }, [formData, initialSnapshot]);

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (field: string, date: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: date
    }));
    // Popup should not open on Meeting Date changes
  };


  const handleSubmit = async () => {
    setErrorMsg("");
    
    try {
      if (!chapterId) {
        throw new Error("Chapter ID is missing");
      }

      const normalizedLaunch = formData.launchDate ? new Date(formData.launchDate).toISOString().slice(0, 10) : undefined;
      const normalizedMeeting = formData.meetingDate ? new Date(formData.meetingDate).toISOString().slice(0, 10) : undefined;
      const weekdayIdx = formData.meetingDate ? new Date(formData.meetingDate).getUTCDay() : undefined;
      const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
      const derived_meeting_day = typeof weekdayIdx === "number" ? dayMap[weekdayIdx] : undefined;
      const derived_meeting_weekday = typeof weekdayIdx === "number" ? weekdayIdx : undefined;

      if (!formData.name) {
        setErrorMsg("Chapter name is required.");
        return;
      }

      const initial = {
        name: chapterData.chapterName || "",
        area: chapterData.area || "",
        meetingCadence: chapterData.meetingCadence || "",
        meetingTime: chapterData.meetingTime || "",
        meetingDate: formatDateForInput(chapterData.meetingDate) || "",
        launchDate: formatDateForInput(chapterData.launchDate) || "",
        alternate_interval_weeks: chapterData.alternate_interval_weeks || 2,
      };

      const patchData: Record<string, any> = {};

      if (formData.name !== initial.name) patchData.name = formData.name;
      if (formData.area !== initial.area) patchData.area = formData.area;
      if (formData.launchDate && formData.launchDate !== initial.launchDate) patchData.launchDate = normalizedLaunch;
      if (formData.meetingTime !== initial.meetingTime && formData.meetingTime) patchData.meetingTime = formData.meetingTime;
      if (formData.meetingDate && formData.meetingDate !== initial.meetingDate) {
        patchData.meetingDate = normalizedMeeting;
        if (typeof derived_meeting_day !== 'undefined') patchData.meetingDay = derived_meeting_day;
        if (typeof derived_meeting_weekday !== 'undefined') patchData.meetingWeekday = derived_meeting_weekday;
      }
      if (formData.meetingCadence !== initial.meetingCadence) {
        if (formData.meetingCadence) patchData.meetingCadence = formData.meetingCadence;
      }

      const cleanedData = Object.fromEntries(
        Object.entries(patchData).filter(([_, v]) => v !== undefined && v !== "")
      );

      await updateChapter({ chapterId, data: cleanedData }).unwrap();


      showToast({
        title: "Success",
        description: "Chapter updated successfully",
        kind: "success"
      });
      navigate(`/admin/regional-board/chapter/${chapterId}`);
    } catch (error: any) {
      const errorMessage = error.data?.message || "Failed to update chapter";
      setErrorMsg(errorMessage);
      showToast({
        title: "Error",
        description: errorMessage,
        kind: "error"
      });
    }
  };

  const handleCancel = () => {
    navigate(`/admin/regional-board/chapter/${chapterId}`);
  };



  const breadcrumbs = [
    { label: "Regional Board", onClick: () => navigate("/admin/regional-board") },
    { label: "Chapter Detail", onClick: () => navigate(`/admin/regional-board/chapter/${chapterId}`) },
    { label: "Edit chapter" },
  ];

  /** A section of the form, so seven fields read as two groups rather than a list. */
  const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
    <section className="border-t border-[color:var(--ov-line-faint)] pt-5 first:border-t-0 first:pt-0">
      <h2 className="ekam-eyebrow text-[9.5px] font-semibold text-[var(--ov-ink-4)]">{title}</h2>
      {hint && <p className="mt-1 text-[12.5px] leading-5 text-[var(--ov-ink-4)]">{hint}</p>}
      <div className="mt-3.5 space-y-4">{children}</div>
    </section>
  );

  const fieldLabel = "mb-1.5 block text-xs text-[var(--field-label)]";

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar userName="Admin" />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} className="mb-3" />

        <div className="mx-auto max-w-2xl">
          <div className="mb-5">
            <h1 className="text-[26px] font-bold leading-tight text-[var(--ov-ink)] sm:text-[30px]">
              Edit chapter
            </h1>
            <p className="mt-2 text-[12.5px] text-[var(--ov-ink-4)]">
              {formData.name || "This chapter"} · changes take effect for every member of it.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
            <div className="space-y-6">
              <Section title="Chapter">
                <FormInput
                  label="Chapter name"
                  name="name"
                  className="text-[13px]"
                  value={formData.name}
                  onChange={handleChange}
                  isRequired
                  placeholder="Enter chapter name"
                />

                <div>
                  <FormSelect
                    label="Area"
                    name="area"
                    className="text-[13px]"
                    value={formData.area}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "custom") {
                        setOriginalArea(formData.area);
                        setShowCustomAreaInput(true);
                        setFormData((prev) => ({ ...prev, area: "" }));
                      } else {
                        setShowCustomAreaInput(false);
                        setFormData((prev) => ({ ...prev, area: value }));
                      }
                    }}
                    onSearchChange={setAreaSearch}
                    options={[
                      { value: "", label: "Select area..." },
                      ...existingAreas.map((area) => ({ value: area, label: area })),
                      { value: "custom", label: "+ Add new area..." },
                    ]}
                    searchable
                    searchPlaceholder="Search areas..."
                    disableClientSideFilter={true}
                  />

                  {showCustomAreaInput && (
                    <div className="mt-2.5">
                      <FormInput
                        label="New area"
                        type="text"
                        className="text-[13px]"
                        placeholder="Enter new area name"
                        value={formData.area}
                        onChange={(e) => {
                          const newArea = e.target.value.trim();
                          if (newArea && existingAreas.includes(newArea)) {
                            setErrorMsg(`"${newArea}" already exists. Please select from the dropdown.`);
                            return;
                          }
                          setErrorMsg("");
                          setFormData((prev) => ({ ...prev, area: newArea }));
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomAreaInput(false);
                          setFormData((prev) => ({ ...prev, area: originalArea }));
                        }}
                        className="mt-2 text-[12.5px] font-medium text-[var(--ov-ink-3)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                      >
                        ← Back to the list
                      </button>
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Meetings" hint="When this chapter launched, and when it meets.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabel}>Launch date</label>
                    <DatePicker
                      value={formData.launchDate}
                      iconSrc={CalendarIcon}
                      onChange={(date) => handleDateChange("launchDate", date)}
                    />
                  </div>

                  <FormSelect
                    label="Meeting type"
                    name="meetingCadence"
                    className="text-[13px]"
                    value={formData.meetingCadence}
                    onChange={handleChange}
                    options={[
                      { value: "", label: "Select meeting type" },
                      { value: "WEEKLY", label: "Weekly" },
                      { value: "ALTERNATE", label: "Alternate weeks" },
                      { value: "MONTHLY", label: "Monthly" },
                    ]}
                    isRequired
                  />

                  <div>
                    <label className={fieldLabel}>
                      Meeting date <span className="text-[var(--field-invalid)]">*</span>
                    </label>
                    <DatePicker
                      value={formData.meetingDate}
                      iconSrc={CalendarIcon}
                      onChange={(date) => handleDateChange("meetingDate", date)}
                    />
                  </div>

                  <div>
                    {formData.meetingTime !== "custom" ? (
                      <FormSelect
                        label="Meeting time"
                        className="text-[13px]"
                        value={formData.meetingTime}
                        onChange={(e) => setFormData((prev) => ({ ...prev, meetingTime: e.target.value }))}
                        options={MEETING_TIME_OPTIONS}
                      />
                    ) : (
                      <>
                        <label className={fieldLabel}>Meeting time</label>
                        <input
                          type="time"
                          placeholder="HH:MM"
                          value={formData.meetingTime}
                          onChange={(e) => setFormData((prev) => ({ ...prev, meetingTime: e.target.value }))}
                          className="h-11 w-full rounded-[var(--field-radius)] border border-[color:var(--field-border)] bg-[var(--field-bg)] px-3 text-[13px] text-[var(--field-ink)] transition-colors focus:border-[color:var(--field-border-focus)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, meetingTime: "" }))}
                          className="mt-2 text-[12.5px] font-medium text-[var(--ov-ink-3)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                        >
                          ← Back to the list
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Section>
            </div>

            {errorMsg && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[var(--ov-danger-wash)] px-3.5 py-3">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ov-danger)]" aria-hidden="true" />
                <p className="text-[13px] leading-5 text-[var(--ov-danger)]">{errorMsg}</p>
              </div>
            )}

            {/* One action, and the way out beside it — not two equal blocks. The
                update stays closed until something has actually changed. */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t border-[color:var(--ov-line-faint)] pt-5">
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-2)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isDirty}
                title={!isDirty ? "Nothing has changed yet" : undefined}
                className="inline-flex h-10 items-center rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
