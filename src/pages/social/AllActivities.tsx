import { useMemo, useState, useCallback } from "react";
import { SocialLayout } from "../../components/social";
import GradientContainer from "../../components/common/GradientContainer";
import { StatCard } from "../../components/dashboard";
import ChartCard from "../../components/dashboard/ChartCard";
import CalendarIcon from "../../assets/icons/calendar.svg";
import DatePicker from "../../components/common/DatePicker";
import { FormSelect } from "../../components/forms";
import { useGetSocialAllActivitiesOverviewQuery } from "../../services/social";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../utils/date";

export default function AllActivities() {
  // Separate UI state for date selections (not immediately used for API)
  const [selectedFromDate, setSelectedFromDate] = useState(getFirstDayOfMonth());
  const [selectedToDate, setSelectedToDate] = useState(getLastDayOfMonth());
  
  // API params for date range (updated only on search)
  const [dateParams, setDateParams] = useState({
    fromDate: getFirstDayOfMonth(),
    toDate: getLastDayOfMonth()
  });
  
  // Filter state for API params (updated only on search)
  const [filterParams, setFilterParams] = useState<{
    eventType?: "" | "DONATION" | "FUNDRAISER" | "MEETING" | "OTHER";
  }>({});
  
  // UI state for event type selection (not immediately used for API)
  const [selectedEventType, setSelectedEventType] = useState("");

  interface StatCardProps {
    title: string;
    value: string | number;
    icon?:
      | "exchange"
      | "users"
      | "dot-calender"
      | "tick-calender"
      | "funds-donated"
      | "funds-raised"
      | "social-users"
      | "on-going-calender"
      | "up-coming-calender";
    className?: string;
  }

  // Map UI event type labels to backend enum values
  const mapEventTypeToApi = (type: string): "" | "DONATION" | "FUNDRAISER" | "MEETING" | "OTHER" => {
    if (!type || type === "All") return "";
    if (type === "Donation") return "DONATION";
    if (type === "Fundraiser") return "FUNDRAISER";
    if (type === "Meeting") return "MEETING";
    return "OTHER";
  };

  // Query All Activities overview with filters - now uses filterParams which is only updated on search
  const {
    data: overviewData,
    isLoading,
  } = useGetSocialAllActivitiesOverviewQuery({
    from: dateParams.fromDate,
    to: dateParams.toDate,
    eventType: filterParams.eventType,
  });

  const kpis = overviewData?.data?.kpis;
  const charts = overviewData?.data?.charts;

  const stats: StatCardProps[] = useMemo(
    () => [
      {
        title: "No of Events",
        value: kpis?.noOfEvents ?? 0,
        icon: "dot-calender",
      },
      {
        title: "No of Attended Events (In/Out)",
        value: kpis?.noOfAttendedEvents ?? 0,
        icon: "tick-calender",
      },
      {
        title: "Funds Donated",
        value: `₹ ${kpis?.totalFundsDonated?.toLocaleString("en-IN") ?? "0"}`,
        icon: "funds-donated",
      },
      {
        title: "Upcoming Events",
        value: kpis?.upcomingEvents ?? 0,
        icon: "up-coming-calender",
      },
    ],
    [kpis],
  );

  const eventTypeOptions = [
    { value: "All", label: "All" },
    { value: "Donation", label: "Donation" },
    { value: "Fundraiser", label: "Fundraiser" },
    { value: "Meeting", label: "Meeting" },
  ];
  
  // Handle search with filters - now also updates event type
  const handleSearch = useCallback(() => {
    // Update date params
    setDateParams({
      fromDate: selectedFromDate,
      toDate: selectedToDate
    });
    
    // Update filter params including event type
    const params: any = {};
    // Add event type to filter params
    params.eventType = mapEventTypeToApi(selectedEventType);
    
    setFilterParams(params);
  }, [selectedFromDate, selectedToDate, selectedEventType]);

  // Charts data from API (fallback to empty arrays)
  const memberChartData = useMemo(
    () =>
      (charts?.totalMember ?? []).map((item) => ({
        month: item.month,
        value: item.count,
      })),
    [charts?.totalMember],
  );

  const attendeesChartData = useMemo(
    () =>
      (charts?.totalAttendees ?? []).map((item) => ({
        month: item.month,
        value: item.total,
      })),
    [charts?.totalAttendees],
  );

  const donatedChartData = useMemo(
    () =>
      (charts?.totalFundsDonated ?? []).map((item) => ({
        month: item.month,
        value: item.total,
      })),
    [charts?.totalFundsDonated],
  );

  return (
    <SocialLayout>
      {/* Filters */}
      <div className="py-1 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">
              From Date <span className="text-red-400">*</span>
            </label>
            <DatePicker 
              value={selectedFromDate} 
              onChange={setSelectedFromDate} 
              iconSrc={CalendarIcon} 
              placeholder="Select From Date" 
            />
          </div>

          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">
              To Date <span className="text-red-400">*</span>
            </label>
            <DatePicker 
              value={selectedToDate} 
              onChange={setSelectedToDate} 
              iconSrc={CalendarIcon} 
              placeholder="Select To Date" 
            />
          </div>

          <FormSelect
            label="Event Type"
            options={eventTypeOptions}
            placeholder="Select event type"
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
          />

          <div className="flex items-end">
            <button 
              onClick={handleSearch}
              className="w-full bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading && !overviewData ? (
          <div className="col-span-full flex items-center justify-center py-8 text-gray-400 text-sm">
            Loading overview...
          </div>
        ) : (
          stats.map((stat) => (
            <GradientContainer key={stat.title}>
              <StatCard title={stat.title} value={stat.value} icon={stat.icon} />
            </GradientContainer>
          ))
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-6">
        <ChartCard
          title="Total Chapter Members"
          amount={String(kpis?.totalMembers ?? 0)}
          data={memberChartData}
          color="#D85D27"
          gradientFrom="#D85D27"
          gradientTo="#8B4513"
          showMonthsLabel={true}
        />

        <ChartCard
          title="Total Attendees"
          amount={`₹ ${(kpis?.totalFundsRaised ?? 0).toLocaleString("en-IN")}`}
          data={attendeesChartData}
          color="#6366F1"
          gradientFrom="#6366F1"
          gradientTo="#3730A3"
          yAxisFormatter={(value) => `₹${value}`}
          showMonthsLabel={true}
        />

        <ChartCard
          title="Total Funds Donated"
          amount={`₹ ${(kpis?.totalFundsDonated ?? 0).toLocaleString("en-IN")}`}
          data={donatedChartData}
          color="#06B6D4"
          gradientFrom="#06B6D4"
          gradientTo="#0891B2"
          yAxisFormatter={(value) => `₹${value}`}
          showMonthsLabel={true}
        />
      </div>
    </SocialLayout>
  );
}