import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import FilterSection from "../../components/common/FilterSection";
import DataTable from "../../components/common/DataTable";
import type { TableColumn } from "../../components/common/DataTable";
import { useGetEdChaptersQuery } from "../../services/ed";
import { useListVisitorsQuery } from "../../services/visitorsApi";
import { ReportInfoBar } from "../../components/reports";
import GradientContainer from "../../components/common/GradientContainer";

interface VisitorRecord {
  id: number;
  memberName: string;
  companyName: string;
  phone: string;
  email: string;
  profession: string;
  specialty: string;
  visitDate: string;
  meetingFormat: string;
  invitedBy: string;
  description: string;
  type: string;
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "memberName", label: "Member Name", sortable: true, searchable: false },
  { key: "companyName", label: "Company Name", sortable: true, searchable: false },
  { key: "phone", label: "Phone", sortable: true, searchable: false },
  { key: "email", label: "Email", sortable: true, searchable: false },
  { key: "profession", label: "Profession", sortable: true, searchable: false },
  { key: "specialty", label: "Specialty", sortable: true, searchable: false },
  { key: "visitDate", label: "Visit Date", sortable: true, searchable: false },
  { key: "meetingFormat", label: "Meeting Format", sortable: true, searchable: false },
  { key: "invitedBy", label: "Invited By", sortable: true, searchable: false },
  { key: "description", label: "Description", sortable: true, searchable: false },
  { key: "type", label: "Type", sortable: true, searchable: false },
];



export default function VisitorRegistrationReportPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useSelector((state: RootState) => state.auth.role);
  const [userName] = useState("Mike");
  
  // Check if user is a director role (admin view)
  const isAdminRole = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"].includes(
    userRole || "",
  );
  // Default to current week
  const firstDayOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(monday.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayOfMonth}`;
  };
  const lastDayOfWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Adjust for Sunday end
    const sunday = new Date(d.setDate(diff));
    const y = sunday.getFullYear();
    const m = String(sunday.getMonth() + 1).padStart(2, "0");
    const dayOfMonth = String(sunday.getDate()).padStart(2, "0");
    return `${y}-${m}-${dayOfMonth}`;
  };
  const [startDate, setStartDate] = useState(firstDayOfWeek());
  const [endDate, setEndDate] = useState(lastDayOfWeek());
  const [selectedChapter, setSelectedChapter] = useState<string>(() => {
    const st: any = location.state;
    return st?.chapterId ? String(st.chapterId) : "";
  });
  const [columnSearches] = useState<{ [key: string]: string }>({});

  // Load chapters for admin chapter dropdown
  const { data: chaptersRes } = useGetEdChaptersQuery({ page: 1, limit: 50 });
  const chapterOptions = React.useMemo(() => {
    const base = [{ label: "All Chapters", value: "" }];
    const items = ((chaptersRes as any)?.data?.items ?? []) as any[];
    for (const c of items) base.push({ label: c.name, value: String(c.id) });
    return base;
  }, [chaptersRes]);

  const selectedChapterLabel = React.useMemo(() => {
    const opt = chapterOptions.find((o) => o.value === selectedChapter);
    return opt?.label || "All Chapters";
  }, [chapterOptions, selectedChapter]);

  // If navigated from ChapterDetailsPage with chapterId in state, preselect it
  React.useEffect(() => {
    const st: any = location.state;
    if (st && st.chapterId) {
      setSelectedChapter(String(st.chapterId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // FilterSection defers by default: it edits its own draft and only calls
  // onStartDateChange / onEndDateChange when Search is pressed. So startDate and
  // endDate already *are* the applied range, and the query can depend on them
  // directly. Copying them into a separate "applied" state on Search read the
  // previous render's values - FilterSection raises both callbacks in one tick -
  // so the range never moved and no refetch happened.
  const handleSearch = () => {
    // FilterSection has already pushed the chosen range up; the query refetches on it.
  };

  const handlePrint = () => {
    window.print();
  };

  const handleColumnSearchChange = () => {
    // Not needed for this report
  };

  const {
    data: visitorsRes,
    isLoading: visitorsLoading,
    isError: visitorsError,
  } = useListVisitorsQuery({
    from: startDate || undefined,
    to: endDate || undefined,
    chapterId: selectedChapter || undefined,
    page: 1,
    limit: 100,
    sortBy: "visitDate",
    sortDir: "desc",
  });

  // Columns the visit record does not carry yet (specialty, meeting format) are
  // left blank rather than guessed at, so the table never implies data we do not hold.
  const visitorData: VisitorRecord[] = React.useMemo(
    () =>
      ((visitorsRes?.data as any[]) || []).map((v, idx) => ({
        id: idx + 1,
        memberName: v.visitorName || "",
        companyName: v.company || "",
        phone: v.phone || "",
        email: v.email || "",
        profession: v.category || "",
        specialty: "",
        visitDate: v.visitDate ? new Date(v.visitDate).toLocaleDateString("en-GB") : "",
        meetingFormat: "",
        invitedBy: v.invitedByName || "",
        description: v.notes || "",
        type: v.type === "REGISTER_MYSELF" ? "Self" : v.type ? "Someone else" : "",
      })),
    [visitorsRes],
  );

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            // { label: "Dashboard", onClick: () => navigate("/dashboard") },
            { label: "Visitor Registration Report" },
          ]}
        />
        {/* Admin Filters */}
        {isAdminRole ? (
          <FilterSection
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onSearch={handleSearch}
            onPrint={handlePrint}
            showDropdown={true}
            dropdownLabel="Chapter"
            dropdownOptions={chapterOptions}
            dropdownValue={selectedChapter}
            onDropdownChange={(v) => setSelectedChapter(v)}
            allowFutureStartDate
            allowFutureEndDate
            skipAutoInit
          />
        ) : (
          <FilterSection
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onSearch={handleSearch}
            onPrint={handlePrint}
          />
        )}

        {/* Table Section with Gradient */}
        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            <ReportInfoBar
              chapter={selectedChapterLabel}
              member=""
              region="Hyderabad"
              fromDate={startDate}
              toDate={endDate}
            />

            {/* Data Table */}
            {visitorsLoading ? (
              <div className="p-6 text-sm text-blue-300">Loading visitors...</div>
            ) : visitorsError ? (
              <div className="p-6 text-sm text-red-400">
                Could not load the visitor registrations. Please try again.
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={visitorData}
                searchValues={columnSearches}
                onSearchChange={handleColumnSearchChange}
              />
            )}
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
