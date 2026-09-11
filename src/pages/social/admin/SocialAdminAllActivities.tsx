import { useState, useMemo, useCallback, useEffect } from "react";
import { SocialLayout } from "../../../components/social";
import GradientContainer from "../../../components/common/GradientContainer";
import { StatCard } from "../../../components/dashboard";
import ChartCard from "../../../components/dashboard/ChartCard";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import DatePicker from "../../../components/common/DatePicker";
import { FormSelect } from "../../../components/forms";
import {
  useGetSocialActivitiesOverviewQuery,
} from "../../../services/social/socialAdminDashboardApi";
import { useGetSocialRegionalBoardQuery } from "../../../services/social";
import type { SocialChapterItem } from "../../../services/social/types";
import { useAppSelector } from "../../../app/store";
import { useListCountriesQuery, useListRegionsQuery } from "../../../services/publicApi";
import { getFirstDayOfMonth, getLastDayOfMonth } from "../../../utils/date";

const SOCIAL_SCOPE_ROLES = new Set([
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

export default function SocialAdminAllActivities() {
  const authUser = useAppSelector((s) => s.auth.user);

  const socialAssignment = useMemo(() => {
    const assignments = ((authUser as any)?.assignments || []) as Array<any>;
    return (
      assignments.find(
        (a) =>
          SOCIAL_SCOPE_ROLES.has(a?.role) &&
          (a?.scope?.country || a?.scope?.region || a?.scope?.chapter || a?.scope?.socialChapter),
      ) || assignments.find((a) => SOCIAL_SCOPE_ROLES.has(a?.role)) || null
    );
  }, [authUser]);

  const rawAssignedCountryId = useMemo(() => getScopeId((socialAssignment as any)?.scope?.country), [socialAssignment]);
  const rawAssignedRegionId = useMemo(() => getScopeId((socialAssignment as any)?.scope?.region), [socialAssignment]);

  const { data: assignedRegionLookupRes } = useListRegionsQuery(
    rawAssignedRegionId && !rawAssignedCountryId ? { page: 1, limit: 500 } : undefined,
    { skip: !rawAssignedRegionId || Boolean(rawAssignedCountryId) },
  );

  const assignedScope = useMemo(() => {
    const matchedRegion = (assignedRegionLookupRes?.data || []).find(
      (region) => String(region.id) === String(rawAssignedRegionId),
    );

    return {
      countryId: rawAssignedCountryId || (matchedRegion?.countryId ? String(matchedRegion.countryId) : ""),
      regionId: rawAssignedRegionId || "",
    };
  }, [assignedRegionLookupRes?.data, rawAssignedCountryId, rawAssignedRegionId]);

  // UI state (not sent to API until search is clicked)
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth());
  const [toDate, setToDate] = useState(getLastDayOfMonth());
  const [selectedEventType, setSelectedEventType] = useState("");
  const [currentFilters, setCurrentFilters] = useState<{
    country?: string;
    region?: string;
    chapter?: string;
  }>({ country: '', region: '', chapter: '' });
  
  // API state (only updated on search click)
  const [apiParams, setApiParams] = useState<{
    from: string;
    to: string;
    countryId?: string;
    regionId?: string;
    socialChapterId?: string;
    eventType?: "" | "DONATION" | "FUNDRAISER" | "MEETING" | "OTHER";
  }>({
    from: getFirstDayOfMonth(),
    to: getLastDayOfMonth(),
    countryId: assignedScope.countryId || undefined,
    regionId: assignedScope.regionId || undefined,
  });

  useEffect(() => {
    if (!assignedScope.countryId && !assignedScope.regionId) return;

    setCurrentFilters((prev) => ({
      ...prev,
      country: assignedScope.countryId || prev.country || "",
      region: assignedScope.regionId || prev.region || "",
      chapter: prev.chapter || "",
    }));

    setApiParams((prev) => ({
      ...prev,
      countryId: assignedScope.countryId || prev.countryId,
      regionId: assignedScope.regionId || prev.regionId,
    }));
  }, [assignedScope.countryId, assignedScope.regionId]);
  
  // Fetch public data for countries and regions
  const { data: countriesRes } = useListCountriesQuery(undefined, {
    skip: Boolean(assignedScope.countryId),
  });
  const { data: regionsRes } = useListRegionsQuery(
    assignedScope.countryId ? { countryId: assignedScope.countryId, page: 1, limit: 100 } : undefined,
    { skip: Boolean(assignedScope.regionId) },
  );
  
  // Fetch social chapters from regional board API
  const { data: chaptersRes } = useGetSocialRegionalBoardQuery({ page: 1, limit: 100 });
  
  // Get data from public APIs and social chapters
  const countries = countriesRes?.data || [];
  const regions = regionsRes?.data || [];
  const chapters = chaptersRes?.data?.items || [];

  const filteredCountries = countries;
  const filteredRegions = useMemo(() => {
    if (assignedScope.countryId) {
      return regions.filter((r) => String(r.countryId || "") === String(assignedScope.countryId));
    }
    if (!currentFilters.country) return regions;
    return regions.filter((r) => String(r.countryId || "") === String(currentFilters.country));
  }, [assignedScope.countryId, currentFilters.country, regions]);

  const effectiveRegionId = assignedScope.regionId || currentFilters.region;
  const filteredChapters = useMemo(() => {
    if (!effectiveRegionId) return chapters;
    return chapters.filter((ch: SocialChapterItem) => String(ch.regionId || "") === String(effectiveRegionId));
  }, [chapters, effectiveRegionId]);

  useEffect(() => {
    if (!effectiveRegionId) return;
    setCurrentFilters((prev) => {
      if (!prev.chapter) return prev;
      const chapterStillValid = filteredChapters.some((ch) => ch.id === prev.chapter);
      return chapterStillValid ? prev : { ...prev, chapter: "" };
    });
  }, [effectiveRegionId, filteredChapters]);
  
  const countryOptions = filteredCountries.map((c) => ({ label: c.name, value: c.id }));
  
  // Filter regions based on selected country
  const regionOptions = useMemo(() => {
    if (!currentFilters.country) {
      return filteredRegions.map((r) => ({ label: r.name, value: r.id }));
    }
    return filteredRegions
      .filter((r) => r.countryId === currentFilters.country)
      .map((r) => ({ label: r.name, value: r.id }));
  }, [filteredRegions, currentFilters.country]);
  
  const chapterOptions = useMemo(() => {
    if (!effectiveRegionId) {
      return filteredChapters.map((ch: SocialChapterItem) => ({ label: ch.name, value: ch.id }));
    }
    return filteredChapters
      .filter((ch: SocialChapterItem) => ch.regionId === effectiveRegionId)
      .map((ch: SocialChapterItem) => ({ label: ch.name, value: ch.id }));
  }, [filteredChapters, effectiveRegionId]);

  // API query - only uses apiParams which updates on search click
  const { data: activitiesData, isLoading } = useGetSocialActivitiesOverviewQuery(apiParams);

  // Extract KPIs from API
  const kpis = activitiesData?.data?.kpis;
  const stats = useMemo(() => [
    { title: "No of Events", value: String(kpis?.noOfEvents ?? 0), icon: "dot-calender" as const },
    { title: "No of Attended Events", value: String(kpis?.noOfAttendedEvents ?? 0), icon: "tick-calender" as const },
    { title: "Funds Donated", value: `₹ ${(kpis?.totalFundsDonated ?? 0).toLocaleString("en-IN")}`, icon: "funds-donated" as const },
    { title: "Upcoming Events", value: String(kpis?.upcomingEvents ?? 0), icon: "up-coming-calender" as const },
  ], [kpis]);

  // Handle search with filters - updates API params
  const handleSearch = useCallback(() => {
    const params: any = {
      from: fromDate,
      to: toDate,
    };
    
    const countryId = assignedScope.countryId || currentFilters.country;
    const regionId = assignedScope.regionId || currentFilters.region;

    if (countryId) params.countryId = countryId;

    if (assignedScope.regionId) {
      params.regionId = assignedScope.regionId;
    } else if (regionId && countryId) {
      // Only validate manually selected regions against the selected country.
      const regionBelongsToCountry = filteredRegions.some(
        (r) => r.id === regionId && r.countryId === countryId
      );
      if (regionBelongsToCountry) {
        params.regionId = regionId;
      }
    } else if (regionId && !countryId) {
      params.regionId = regionId;
    }
    
    if (currentFilters.chapter) params.socialChapterId = currentFilters.chapter;
    
    // Only include event type if it's not empty
    if (selectedEventType) {
      params.eventType = selectedEventType as "DONATION" | "FUNDRAISER" | "MEETING" | "OTHER";
    }
    
    setApiParams(params);
  }, [assignedScope.countryId, assignedScope.regionId, currentFilters, filteredRegions, fromDate, toDate, selectedEventType]);
  
  // Handle filter changes without immediate API calls
  const handleCountryChange = (countryId: string) => {
    setCurrentFilters(prev => ({
      ...prev,
      country: countryId,
      // Clear region if it doesn't belong to the new country
      region: (() => {
        if (!countryId || !prev.region) return '';
        const regionBelongsToCountry = filteredRegions.some(
          (r) => r.id === prev.region && r.countryId === countryId
        );
        return regionBelongsToCountry ? prev.region : '';
      })()
    }));
  };

  const handleRegionChange = (regionId: string) => {
    setCurrentFilters(prev => ({
      ...prev,
      region: regionId,
      // Clear chapter if it doesn't belong to the new region
      chapter: (() => {
        if (!regionId || !prev.chapter) return '';
        const chapterBelongsToRegion = filteredChapters.some(
          (ch: SocialChapterItem) => ch.id === prev.chapter && ch.regionId === regionId
        );
        return chapterBelongsToRegion ? prev.chapter : '';
      })()
    }));
  };

  const handleChapterChange = (chapterId: string) => {
    setCurrentFilters(prev => ({ ...prev, chapter: chapterId }));
  };

  const eventTypeOptions = [
    { value: "", label: "Select event type" },
    { value: "DONATION", label: "Donation" },
    { value: "FUNDRAISER", label: "Fundraiser" },
    { value: "MEETING", label: "Meeting" },
    { value: "OTHER", label: "Other" },
  ];

  // Extract chart data from API
  const memberChartData = useMemo(() => {
    const charts = activitiesData?.data?.charts;
    if (!charts?.totalMember?.length) {
      return [{ month: "No data", value: 0 }];
    }
    return charts.totalMember.map((m) => ({
      month: m.month.slice(5),
      value: m.count,
    }));
  }, [activitiesData]);

  const fundsDonatedChartData = useMemo(() => {
    const charts = activitiesData?.data?.charts;
    if (!charts?.totalFundsDonated?.length) {
      return [{ month: "No data", value: 0 }];
    }
    return charts.totalFundsDonated.map((m) => ({
      month: m.month.slice(5),
      value: m.total,
    }));
  }, [activitiesData]);

  const fundsRaisedChartData = useMemo(() => {
    const charts = activitiesData?.data?.charts;
    if (!charts?.totalFundsRaised?.length) {
      return [{ month: "No data", value: 0 }];
    }
    return charts.totalFundsRaised.map((m) => ({
      month: m.month.slice(5),
      value: m.total,
    }));
  }, [activitiesData]);

  // Currency formatter
  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const showCountryFilter = !assignedScope.countryId;
  const showRegionFilter = !assignedScope.regionId;
  const filterGridClass =
    showCountryFilter && showRegionFilter
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7"
      : showCountryFilter || showRegionFilter
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6"
      : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5";

  return (
    <SocialLayout>
      {/* Filters Row */}
      <div className="py-1 mb-6">
        <div className={`grid ${filterGridClass} gap-2`}>
          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">
              From Date <span className="text-red-400">*</span>
            </label>
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              iconSrc={CalendarIcon}
              placeholder="09/06/2025"
            />
          </div>

          <div className="w-full">
            <label className="block text-xs text-gray-400 mb-1.5">
              To Date <span className="text-red-400">*</span>
            </label>
            <DatePicker
              value={toDate}
              onChange={setToDate}
              iconSrc={CalendarIcon}
              placeholder="09/06/2025"
            />
          </div>

          {showCountryFilter && (
            <FormSelect
              label="Countries"
              options={[{ value: "", label: "Select Countries" }, ...countryOptions]}
              placeholder="Select Countries"
              value={currentFilters.country}
              onChange={(e) => handleCountryChange(e.target.value)}
            />
          )}

          {showRegionFilter && (
            <FormSelect
              label="Regions"
              options={[{ value: "", label: "Select Regions" }, ...regionOptions]}
              placeholder="Select Regions"
              value={currentFilters.region}
              onChange={(e) => handleRegionChange(e.target.value)}
            />
          )}

          <FormSelect
            label="Chapter"
            options={[{ value: "", label: "Select chapter name" }, ...chapterOptions]}
            placeholder="Select chapter name"
            value={currentFilters.chapter}
            onChange={(e) => handleChapterChange(e.target.value)}
          />

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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Stats Grid - 4 cards in a row */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <GradientContainer key={stat.title}>
              <StatCard title={stat.title} value={stat.value} icon={stat.icon} />
            </GradientContainer>
          ))}
        </div>
      )}

      {/* Charts Grid - 3 charts */}
      {!isLoading && (
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
            title="Total Funds Raised"
            amount={`₹ ${(kpis?.totalFundsRaised ?? 0).toLocaleString("en-IN")}`}
            data={fundsRaisedChartData}
            color="#6366F1"
            gradientFrom="#6366F1"
            gradientTo="#3730A3"
            yAxisFormatter={formatCurrency}
            showMonthsLabel={true}
          />

          <ChartCard
            title="Total Funds Donated"
            amount={`₹ ${(kpis?.totalFundsDonated ?? 0).toLocaleString("en-IN")}`}
            data={fundsDonatedChartData}
            color="#06B6D4"
            gradientFrom="#06B6D4"
            gradientTo="#0891B2"
            yAxisFormatter={formatCurrency}
            showMonthsLabel={true}
          />
        </div>
      )}
    </SocialLayout>
  );
}
