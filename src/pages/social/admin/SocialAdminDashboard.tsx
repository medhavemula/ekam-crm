import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../../components/navigation/Navbar";
import GradientContainer from "../../../components/common/GradientContainer";
import StatCard from "../../../components/dashboard/StatCard";
import ChartCard from "../../../components/dashboard/ChartCard";
import DatePicker from "../../../components/common/DatePicker";
import { FormSelect } from "../../../components/forms";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import { useAppSelector } from "../../../app/store";
import {
  useGetSocialDashboardOverviewQuery,
  useGetSocialDashboardChartsQuery,
} from "../../../services/social/socialAdminDashboardApi";
import { useGetSocialActivitiesOverviewQuery } from "../../../services/social";
import { useListRegionsQuery, useListSocialChaptersQuery } from "../../../services/publicApi";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../../utils/date";

const SOCIAL_DASHBOARD_ROLES = new Set([
  "SOCIAL_CHAIRPERSON",
  "REGIONAL_GOVERNOR",
  "ASSISTANT_REGIONAL_GOVERNOR",
  "LAUNCH_GOVERNOR",
  "CHAPTER_GOVERNOR",
]);

function getScopeId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const candidate = (value as { id?: string; _id?: string }).id || (value as { id?: string; _id?: string })._id;
    return candidate ? String(candidate) : "";
  }
  return String(value);
}

export default function SocialAdminDashboard() {
  const navigate = useNavigate();
  const authUser = useAppSelector((s) => s.auth.user);
  const [userName, setUserName] = useState("User");

  const socialAssignment = useMemo(() => {
    const assignments = (authUser as any)?.assignments || [];
    return (
      assignments.find(
        (a: any) =>
          SOCIAL_DASHBOARD_ROLES.has(a?.role) &&
          (a?.scope?.country || a?.scope?.region || a?.scope?.chapter || a?.scope?.socialChapter),
      ) || assignments.find((a: any) => SOCIAL_DASHBOARD_ROLES.has(a?.role)) || null
    );
  }, [authUser]);

  const userRegionId = useMemo(() => {
    return getScopeId((socialAssignment as any)?.scope?.region);
  }, [socialAssignment]);

  const rawCountryId = useMemo(() => {
    return getScopeId((socialAssignment as any)?.scope?.country);
  }, [socialAssignment]);

  const { data: regionsRes } = useListRegionsQuery({ page: 1, limit: 500 });

  const userCountryId = useMemo(() => {
    if (rawCountryId) return rawCountryId;
    if (!userRegionId) return "";
    const matchedRegion = (regionsRes?.data || []).find((region) => String(region.id) === String(userRegionId));
    return matchedRegion?.countryId ? String(matchedRegion.countryId) : "";
  }, [rawCountryId, regionsRes, userRegionId]);

  // Filter UI state (does not trigger API until Search is clicked)
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getLastDayOfMonth());
  const [selectedChapter, setSelectedChapter] = useState("");

  // Applied API params state (updated only on Search)
  const [apiParams, setApiParams] = useState<{
    from?: string;
    to?: string;
    countryId: string;
    regionId?: string;
    socialChapterId?: string;
  } | null>(null);

  const { data: chaptersRes } = useListSocialChaptersQuery({ page: 1, limit: 100 });

  const filteredChapters = useMemo(() => {
    const all = chaptersRes?.data || [];
    if (!userRegionId) return all;
    return all.filter((c) => String(c.regionId || "") === String(userRegionId));
  }, [chaptersRes, userRegionId]);

  const chapterOptions = useMemo(
    () => [{ value: "", label: "Select chapter name" }, ...filteredChapters.map((c) => ({ value: c.id, label: c.name }))],
    [filteredChapters],
  );

  // Apply initial search once we have countryId
  useEffect(() => {
    if (!userCountryId) return;
    setApiParams({
      from: fromDate || undefined,
      to: toDate || undefined,
      countryId: userCountryId,
      regionId: userRegionId || undefined,
      socialChapterId: selectedChapter || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCountryId]);

  const handleSearch = useCallback(() => {
    if (!userCountryId) return;
    setApiParams({
      from: fromDate || undefined,
      to: toDate || undefined,
      countryId: userCountryId,
      regionId: userRegionId || undefined,
      socialChapterId: selectedChapter || undefined,
    });
  }, [fromDate, toDate, selectedChapter, userCountryId, userRegionId]);

  // Dashboard query only runs when Search sets apiParams
  const { data: dashboardData, isLoading: isDashboardLoading } = useGetSocialDashboardOverviewQuery(
    (apiParams || { countryId: "" }) as { countryId: string; from?: string; to?: string; regionId?: string; socialChapterId?: string },
    { skip: !apiParams?.countryId },
  );

  const chartGranularity = useMemo(() => {
    if (!apiParams?.from || !apiParams?.to) return "month" as const;
    try {
      const from = new Date(apiParams.from);
      const to = new Date(apiParams.to);
      const diffMs = to.getTime() - from.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      return diffDays <= 31 ? "week" as const : "month" as const;
    } catch {
      return "month" as const;
    }
  }, [apiParams?.from, apiParams?.to]);

  const { data: dashboardChartsData, isLoading: isChartsLoading } = useGetSocialDashboardChartsQuery(
    apiParams?.countryId
      ? {
          ...apiParams,
          granularity: chartGranularity,
        }
      : ({ countryId: "" } as any),
    { skip: !apiParams?.countryId },
  );

  // Initialize user name from localStorage
  useEffect(() => {
    const name = typeof localStorage !== "undefined" ? localStorage.getItem("userName") : null;
    if (name) setUserName(name);
    else if (authUser?.name) setUserName(authUser.name);
  }, [authUser]);

  const {
    data: activitiesData,
    isLoading: isActivitiesLoading,
  } = useGetSocialActivitiesOverviewQuery(
    apiParams as any,
    { skip: !apiParams?.countryId }
  );
  

  // Extract stats from API response
  const stats = useMemo(() => {
    const org = dashboardData?.data;
    const kpis = activitiesData?.data?.kpis;
  
    return {
      chapters: org?.chapters ?? 0,
      members: org?.members ?? 0,
      regionalMembers: org?.regionalMembers ?? 0,
      volunteers: kpis?.totalVolunteers ?? org?.volunteers ?? 0,
  
      noOfEvents: kpis?.noOfEvents ?? org?.noOfEvents ?? 0,
      totalFundsDonated: kpis?.totalFundsDonated ?? org?.totalFundsDonated ?? 0,
      totalFundsRaised: kpis?.totalFundsRaised ?? org?.totalFundsRaised ?? 0,
      ongoingEvents: kpis?.ongoingEvents ?? org?.ongoingEvents ?? 0,
      upcomingEvents: kpis?.upcomingEvents ?? org?.upcomingEvents ?? 0,
      pendingApprovals: org?.pendingApprovals ?? 0,
    };
  }, [dashboardData, activitiesData]);
  
  

  const formatChartLabel = (period: string) => {
    if (/^\d{4}-W\d{2}$/i.test(period)) {
      const week = period.split("W")[1];
      return `W${week}`;
    }
    if (/^\d{4}-\d{2}$/.test(period)) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthNum = parseInt(period.split("-")[1], 10);
      return monthNames[monthNum - 1] || period;
    }
    return period;
  };

  const memberChartData = useMemo(() => {
    const rows = dashboardChartsData?.data?.membersGrowth || [];
    if (!rows.length) return [{ month: "No data", value: 0 }];
    return rows.map((row) => ({
      month: formatChartLabel(row.period),
      value: Number(row.count) || 0,
    }));
  }, [dashboardChartsData]);

  const fundsRaisedChartData = useMemo(() => {
    const rows = dashboardChartsData?.data?.fundsRaised || [];
    if (!rows.length) return [{ month: "No data", value: 0 }];
    return rows.map((row) => ({
      month: formatChartLabel(row.period),
      value: Number(row.amount) || 0,
    }));
  }, [dashboardChartsData]);

  const fundsDonatedChartData = useMemo(() => {
    const rows = dashboardChartsData?.data?.fundsDonated || [];
    if (!rows.length) return [{ month: "No data", value: 0 }];
    return rows.map((row) => ({
      month: formatChartLabel(row.period),
      value: Number(row.amount) || 0,
    }));
  }, [dashboardChartsData]);

  // Currency formatter
  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const isLoading = isDashboardLoading || isActivitiesLoading || isChartsLoading;


  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      {/* Navbar */}
      <Navbar
        userName={userName}
        onNotificationClick={() => navigate("/notifications")}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">From Date</label>
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              iconSrc={CalendarIcon}
              placeholder="09/06/2025"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To Date</label>
            <DatePicker
              value={toDate}
              onChange={setToDate}
              iconSrc={CalendarIcon}
              placeholder="09/06/2025"
            />
          </div>
          <FormSelect
            label="Chapter"
            options={chapterOptions}
            value={selectedChapter}
            onChange={(e) => setSelectedChapter(e.target.value)}
          />
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={!userCountryId}
              className="w-full h-[46px] bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-4 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
        </div>

        {/* Stats Grid - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <GradientContainer>
            <StatCard title="Chapters" value={String(stats.chapters)} icon="funds-donated" />
          </GradientContainer>
          <GradientContainer>
            <StatCard title="Members" value={String(stats.members)} icon="users" />
          </GradientContainer>
          <GradientContainer>
            <StatCard title="Regional Members" value={String(stats.regionalMembers)} icon="users" />
          </GradientContainer>
          <GradientContainer>
            <StatCard title="No of Events" value={String(stats.noOfEvents)} icon="dot-calender" />
          </GradientContainer>
        </div>

        {/* Stats Grid - Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <GradientContainer>
            <StatCard
              title="Total Funds Donated"
              value={`₹ ${stats.totalFundsDonated.toLocaleString("en-IN")}`}
              icon="funds-donated"
            />
          </GradientContainer>
          <GradientContainer>
            <StatCard title="No of Voluntary" value={String(stats.volunteers)} icon="users" />
          </GradientContainer>
          <GradientContainer>
            <StatCard title="On going events" value={String(stats.ongoingEvents)} icon="tick-calender" />
          </GradientContainer>
          <GradientContainer>
            <StatCard title="Upcoming Events" value={String(stats.upcomingEvents)} icon="up-coming-calender" />
          </GradientContainer>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
          <ChartCard
            title="Total Chapter Members"
            amount={String(stats.members)}
            data={memberChartData}
            color="#D85D27"
            gradientFrom="#D85D27"
            gradientTo="#8B4513"
            showMonthsLabel={true}
          />
          <ChartCard
            title="Total Funds Raised"
            amount={`₹ ${stats.totalFundsRaised.toLocaleString("en-IN")}`}
            data={fundsRaisedChartData}
            color="#6366F1"
            gradientFrom="#6366F1"
            gradientTo="#3730A3"
            yAxisFormatter={formatCurrency}
            showMonthsLabel={true}
          />
          <ChartCard
            title="Total Funds Donated"
            amount={`₹ ${stats.totalFundsDonated.toLocaleString("en-IN")}`}
            data={fundsDonatedChartData}
            color="#06B6D4"
            gradientFrom="#06B6D4"
            gradientTo="#0891B2"
            yAxisFormatter={formatCurrency}
            showMonthsLabel={true}
          />
        </div>

        {/* Loading overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-[#1a2332] rounded-lg p-6 flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
              <span className="text-white">Loading...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
