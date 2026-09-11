import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import DatePicker from "../../../components/common/DatePicker";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useCreateEdChapterMutation, useGetEdRegionsQuery, useGetEdChaptersQuery } from "../../../services/ed";

/** Half-hour slots from 07:00 to 20:00, plus a way out to a free-text time. */
const MEETING_TIME_OPTIONS = [
  { value: "", label: "Select time" },
  ...Array.from({ length: 27 }, (_, i) => {
    const minutes = 7 * 60 + i * 30;
    const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
    const mm = minutes % 60 === 0 ? "00" : "30";
    const label = `${hh}:${mm}`;
    return { value: label, label };
  }),
  { value: "custom", label: "Custom time..." },
];

export default function CreateChapterPage() {
  const navigate = useNavigate();
  const [userName] = useState("Mike");

  // Form states
  const [chapterName, setChapterName] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingCadence, setMeetingCadence] = useState("");
  const [areaName, setAreaName] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [showCustomAreaInput, setShowCustomAreaInput] = useState(false);
  const [regionId, setRegionId] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Fetch regions
  const { data: regionsRes } = useGetEdRegionsQuery();

  // Fetch existing chapters to get areas (with search filter)
  const { data: chaptersRes } = useGetEdChaptersQuery({
    limit: 20,
    city: areaSearch || undefined
  });

  // Extract unique areas from existing chapters
  const existingAreas = React.useMemo(() => {
    if (!chaptersRes?.data?.items) return [];
    const areas = chaptersRes.data.items
      .map(chapter => chapter.area) // Use area field (correct spelling) instead of city
      .filter((area): area is string => area !== undefined && area.trim() !== '');
    return [...new Set(areas)].sort(); // Remove duplicates and sort alphabetically
  }, [chaptersRes, areaSearch]); // Add areaSearch to dependency array

  // Auto-set regionId when regions are loaded
  React.useEffect(() => {
    if (regionsRes?.data?.items && regionsRes.data.items.length > 0 && !regionId) {
      const firstRegion = regionsRes.data.items[0];
      setRegionId(firstRegion.id);
    }
  }, [regionsRes, regionId]);

  // Create chapter mutation
  const [createChapter, { isLoading: isCreating }] = useCreateEdChapterMutation();

  const handleSubmit = async () => {
    setErrorMsg("");
    if (!chapterName) {
      setErrorMsg("Please enter chapter name.");
      return;
    }
    if (!areaName) {
      setErrorMsg("Area is required.");
      return;
    }
    if (!launchDate) {
      setErrorMsg("Launch date is required.");
      return;
    }
    if (!meetingDate) {
      setErrorMsg("Meeting date is required.");
      return;
    }

    // Normalize dates once for use in both paths
    const normalizedLaunch = launchDate ? new Date(launchDate).toISOString().slice(0, 10) : undefined; // YYYY-MM-DD
    const normalizedMeeting = meetingDate ? new Date(meetingDate).toISOString().slice(0, 10) : undefined; // YYYY-MM-DD
    // Derive weekday fields for backend when a meeting date is chosen
    const weekdayIdx = meetingDate ? new Date(meetingDate).getUTCDay() : undefined; // 0=Sun..6=Sat
    const dayMap = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
    const meeting_day = typeof weekdayIdx === "number" ? dayMap[weekdayIdx] : undefined;
    const meeting_weekday = typeof weekdayIdx === "number" ? weekdayIdx : undefined;

    // Validate required fields when meeting_cadence is set
    if (meetingCadence) {
      if (!meetingTime) {
        setErrorMsg("Meeting time is required when meeting cadence is set.");
        return;
      }
      // meeting_weekday can be 0 (Sunday) — that is a valid weekday, not a
      // missing one. `!meeting_weekday` treated Sunday as absent and refused
      // every chapter whose meeting date happened to land on one.
      if (meeting_weekday == null) {
        setErrorMsg("Meeting date is required when meeting cadence is set.");
        return;
      }
    } else {
      // If no meeting cadence, meeting time is not required but other validations still apply
    }

    try {
      // Prepare the payload according to the API specification
      const payload: any = {
        regionId: regionId,
        name: chapterName,
        area: areaName,
        city: areaName || "Mumbai", // Default to Mumbai if not provided
        launchDate: normalizedLaunch,
        meetingDate: normalizedMeeting,
        meetingCadence: meetingCadence,
        meetingWeekday: meeting_weekday,
        meetingDay: meeting_day,
        meetingTime: meetingTime,
        meetingMode: "IN_PERSON"
      };

      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      await createChapter(payload).unwrap();
      navigate("/admin/regional-board");
    } catch (e: any) {
      setErrorMsg(e?.data?.message || "Failed to create chapter. Please try again.");
    }
  };

  const handleCancel = () => {
    navigate("/admin/regional-board");
  };

  const breadcrumbs = [
    { label: "Regional Board", onClick: () => navigate("/admin/regional-board") },
    { label: "Create Chapter" },
  ];

  /** A section of the form, so the fields read as two groups rather than one long list. */
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
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} className="mb-3" />

        <div className="mx-auto max-w-2xl">
          <div className="mb-5">
            <h1 className="text-[26px] font-bold leading-tight text-[var(--ov-ink)] sm:text-[30px]">
              Create chapter
            </h1>
            <p className="mt-2 text-[12.5px] text-[var(--ov-ink-4)]">
              A new chapter in your region, with when it launches and when it meets.
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
            <div className="space-y-6">
              <Section title="Chapter">
                <FormInput
                  label="Chapter name"
                  type="text"
                  className="text-[13px]"
                  placeholder="Enter chapter name"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  isRequired
                />

                <div>
                  <FormSelect
                    label="Area"
                    className="text-[13px]"
                    value={areaName}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "custom") {
                        // Show custom input
                        setShowCustomAreaInput(true);
                        setAreaName("");
                      } else {
                        setShowCustomAreaInput(false);
                        setAreaName(value);
                      }
                    }}
                    onSearchChange={setAreaSearch}
                    options={[
                      { value: "", label: "Select area..." },
                      ...existingAreas.map((area) => ({
                        value: area,
                        label: area
                      })),
                      { value: "custom", label: "+ Add new area..." }
                    ]}
                    isRequired
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
                        value={areaName}
                        onChange={(e) => {
                          const newArea = e.target.value.trim();
                          // Check if area already exists
                          if (newArea && existingAreas.includes(newArea)) {
                            setErrorMsg(`"${newArea}" already exists. Please select from the dropdown.`);
                            return;
                          }
                          setErrorMsg("");
                          setAreaName(newArea);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomAreaInput(false);
                          setAreaName("");
                        }}
                        className="mt-2 text-[12.5px] font-medium text-[var(--ov-ink-3)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                      >
                        ← Back to the list
                      </button>
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Meetings" hint="When this chapter launches, and when it meets.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className={fieldLabel}>
                      Launch date <span className="text-[var(--field-invalid)]">*</span>
                    </label>
                    <DatePicker
                      value={launchDate}
                      iconSrc={CalendarIcon}
                      onChange={setLaunchDate}
                    />
                  </div>

                  <FormSelect
                    label="Meeting type"
                    className="text-[13px]"
                    value={meetingCadence}
                    onChange={(e) => setMeetingCadence(e.target.value)}
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
                      value={meetingDate}
                      iconSrc={CalendarIcon}
                      onChange={setMeetingDate}
                    />
                  </div>

                  {meetingCadence && (
                    <div>
                      {meetingTime !== "custom" ? (
                        <FormSelect
                          label="Meeting time"
                          className="text-[13px]"
                          value={meetingTime}
                          onChange={(e) => setMeetingTime(e.target.value)}
                          options={MEETING_TIME_OPTIONS}
                        />
                      ) : (
                        <>
                          <label className={fieldLabel}>Meeting time</label>
                          <input
                            type="time"
                            placeholder="HH:MM"
                            value={meetingTime === "custom" ? "" : meetingTime}
                            onChange={(e) => setMeetingTime(e.target.value)}
                            className="h-11 w-full rounded-[var(--field-radius)] border border-[color:var(--field-border)] bg-[var(--field-bg)] px-3 text-[13px] text-[var(--field-ink)] transition-colors focus:border-[color:var(--field-border-focus)] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setMeetingTime("")}
                            className="mt-2 text-[12.5px] font-medium text-[var(--ov-ink-3)] transition-colors hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                          >
                            ← Back to the list
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            </div>

            {errorMsg && (
              <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-[var(--ov-danger-wash)] px-3.5 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ov-danger)]" aria-hidden="true" />
                <p className="text-[13px] leading-5 text-[var(--ov-danger)]">{errorMsg}</p>
              </div>
            )}

            {/* One action, and the way out beside it — not two equal blocks. */}
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
                disabled={isCreating}
                className="inline-flex h-10 items-center rounded-xl bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? "Creating…" : "Create chapter"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
