import { useCallback, useEffect, useMemo, useState } from "react";
import { ADMIN_THEME } from "../theme/themeScope";
import { Navigate, useNavigate } from "react-router-dom";
import Navbar from "../components/navigation/Navbar";
import StatCard from "../components/dashboard/StatCard";
import GradientContainer from "../components/common/GradientContainer";
import ChartCard from "../components/dashboard/ChartCard";
import DualLineChartCard from "../components/dashboard/DualLineChartCard";
import ReportButton from "../components/dashboard/ReportButton";
import AdminStatCard from "../components/admin/AdminStatCard";
import SuperAdminOverview from "../components/dashboard/superadmin/SuperAdminOverview";
import ModuleGuard from "../components/access/ModuleGuard";
import ModuleLocked from "../components/access/ModuleLocked";
import { useGetDashboardQuery } from "../services/dashboardApi";
import { skipToken } from "@reduxjs/toolkit/query";
import { useAppSelector } from "../app/store";
// Removed unused import
import { useGetAdminDashboardQuery, useGetAdminKpisQuery, useGetAdminSeriesQuery } from "../services/superadmin/adminSaDashboardApi";
import { useGetAdminFiltersQuery } from "../services/superadmin/adminFiltersApi";
import { useGetEdDashboardOverviewQuery, useGetEdDashboardChartsQuery } from "../services/ed/edDashboardApi";
import { useRole } from "../hooks/useRole";
import { getDashboardConfig } from "../config/dashboardConfig";
import { getDashboardRouteForRoles, SOCIAL_ADMIN_ROLES } from "../config/routeConfig";
import type { FilterValues } from "../components/admin/AdminFilters";
import FormSelect from "../components/forms/FormSelect";


// Period options for FormSelect
const periodOptions = [
  { value: "last6m", label: "Last 6 Months" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisYear", label: "This Year" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { role, roles, isAdmin } = useRole();
  const authUser = useAppSelector((s) => s.auth.user);
  const [userName, setUserName] = useState("Mike");
  const [selectedPeriod, setSelectedPeriod] = useState<"last6m" | "thisMonth" | "thisYear">("last6m");
  const fresh = true; // Always true to ensure fresh data on every API call
  const [adminFilterParams, setAdminFilterParams] = useState<{
    date_from?: string;
    date_to?: string;
    country_id?: string;
    region_id?: string;
    chapter_id?: string;
  }>({});
  
  // Separate state for current filter selections (for UI updates)
  const [currentFilters, setCurrentFilters] = useState<{
    country?: string;
    region?: string;
    chapter?: string;
  }>({ country: '', region: '', chapter: '' });

  const storedRoles = useMemo(() => {
    if (typeof localStorage === "undefined") return [] as string[];

    const storedRole = localStorage.getItem("userRole");
    const storedRolesValue = localStorage.getItem("userRoles");
    let parsedRoles: string[] = [];

    try {
      const parsed = storedRolesValue ? JSON.parse(storedRolesValue) : [];
      parsedRoles = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      parsedRoles = [];
    }

    return [storedRole, ...parsedRoles].filter(Boolean) as string[];
  }, []);

  const assignedRoles = useMemo(
    () => Array.from(new Set([role, ...(roles || []), ...storedRoles].filter(Boolean))),
    [role, roles, storedRoles],
  );

  const dashboardRoute = getDashboardRouteForRoles(assignedRoles);
  const isSocialAdminDashboardRole = assignedRoles.some((assignedRole) =>
    SOCIAL_ADMIN_ROLES.includes(assignedRole as any),
  );

  // Get role-based dashboard configuration
  const dashboardConfig = getDashboardConfig(role);

  // Roles that use regular user stats/charts but have tabs and reports
  const hybridRoles = ["PRESIDENT", "VICE_PRESIDENT", "LAUNCH_DIRECTOR", "CHAPTER_DIRECTOR", "SUPPORT_DIRECTOR"];
  const isHybridRole = hybridRoles.includes(role);

  // Check if user is Super Admin
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM";
  const currentMemberId: string | undefined = (() => {
    const id = (authUser as any)?.id || (authUser as any)?.memberId || "";
    return id ? String(id) : undefined;
  })();

  // Memoize date utilities to prevent recreation on every render
  const now = useMemo(() => new Date(), []);
  
  const toEndOfDayUTC = useCallback((d: Date) => 
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999)),
    []
  );
  
  const startOfMonthUTC = useCallback((y: number, m: number) => 
    new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
    []
  );
  
  const endOfMonthUTC = useCallback((y: number, m: number) => 
    new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
    []
  );

  const getDashboardParamsByPeriod = useCallback((period: typeof selectedPeriod) => {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const memberIdParam = currentMemberId ? { memberId: currentMemberId } : {};

    if (period === "thisMonth") {
      const from = startOfMonthUTC(y, m).toISOString();
      const to = endOfMonthUTC(y, m).toISOString();
      return { from, to, granularity: "week", fresh, ...memberIdParam } as const;
    }

    if (period === "thisYear") {
      // This Year: from January 1 to today
      const from = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)).toISOString(); // Jan 1
      const to = toEndOfDayUTC(now).toISOString();
      return { from, to, granularity: "month", fresh, ...memberIdParam } as const;
    }


    // last6m: from 6 months ago to today with fresh flag
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const from = sixMonthsAgo.toISOString();
    const to = toEndOfDayUTC(now).toISOString();
    return { from, to, granularity: "week", fresh, ...memberIdParam } as const;
  }, [now, currentMemberId, toEndOfDayUTC, startOfMonthUTC, endOfMonthUTC]);

  // Determine if we should fetch user dashboard data
  const shouldFetchUserDashboard = !isSuperAdmin && (!isAdmin || isHybridRole);
  
  // Memoize user dashboard args to prevent unnecessary recalculations
  const userDashboardArgs = useMemo(() => {
    if (!shouldFetchUserDashboard) return skipToken;
    return getDashboardParamsByPeriod(selectedPeriod);
  }, [shouldFetchUserDashboard, selectedPeriod, getDashboardParamsByPeriod]);
  const { data: dashboardRes, isLoading, error: dashboardError } = useGetDashboardQuery(userDashboardArgs, {
    // Force refetch on every period change to get fresh data
    refetchOnMountOrArgChange: true,
  });

  // Common date calculations for both Super Admin and ED dashboards
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() is 0-indexed
  const defaultFrom = useMemo(() => `${year}-${String(month).padStart(2, '0')}-01`, [year, month]);
  const lastDay = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);
  const defaultTo = useMemo(() => `${year}-${String(month).padStart(2, '0')}-${lastDay}`, [year, month, lastDay]);
  
  // Super Admin: use AdminFilters date range when available; fallback to current month (01-11-2025 to 30-11-2025)
  const saFrom = (adminFilterParams.date_from as string) || defaultFrom;
  const saTo = (adminFilterParams.date_to as string) || defaultTo;
  // Helpers for ISO conversions
  const toStartIso = (d?: string) => (d ? `${d}T00:00:00` : undefined);
  const toEndIso = (d?: string) => (d ? `${d}T23:59:59` : undefined);
  const saFromISO = toStartIso(saFrom);
  const saToISO = toEndIso(saTo);
  
  // Fetch Super Admin dashboard (totals/series) and KPIs - ONLY for Super Admin
  const saQueryParams = useMemo(() => {
    const params = {
      ...adminFilterParams,
      date_from: saFromISO,
      date_to: saToISO,
    };
    return params;
  }, [saFromISO, saToISO, adminFilterParams]);
  
  const { data: saDashboardRes } = useGetAdminDashboardQuery(isSuperAdmin ? saQueryParams : undefined, {
    skip: !isSuperAdmin,
  });
  
  const { data: saKpisRes, isFetching: isSaKpisFetching } = useGetAdminKpisQuery(
    isSuperAdmin ? saQueryParams : undefined,
    { skip: !isSuperAdmin },
  );

  // ED roles (Executive Director stack)
  const edRoles = ["EXECUTIVE_DIRECTOR","ED_TEAM", "REGIONAL_DIRECTOR", "ASSISTANT_REGIONAL_DIRECTOR"] as const;
  const isEdAdmin = edRoles.includes(role as any);
  
  // Lifetime date calculation for ED, RD, ARD roles (similar to ChapterDetailsPage)
  const getLifetimeDateRange = useCallback(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const startDate = new Date(2023, 0, 1); // January 1st, 2023
    const endDate = new Date(currentYear + 5, 11, 31, 23, 59, 59, 999); // December 31st, 5 years from now
    
    // Format dates as YYYY-MM-DD to match API expectations
    const fromDate = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const toDate = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    
    return {
      from: fromDate,
      to: toDate
    };
  }, []);

  // ED, RD and ARD open on their lifetime range, and then follow the date
  // control the same way the super admin's does. It used to be the constant
  // below whatever the filter bar said, so a range picked there moved the super
  // admin's numbers and left these untouched.
  const lifetimeDates = getLifetimeDateRange();
  const edFrom = (adminFilterParams.date_from as string) || lifetimeDates.from;
  const edTo = (adminFilterParams.date_to as string) || lifetimeDates.to;
  // Format with time components like Super Admin does
  const edFromISO = `${edFrom}T00:00:00`;
  const edToISO = `${edTo}T23:59:59`;

  // Helper to choose chart interval based on date range
  const getIntervalForRange = (from?: string, to?: string): "week" | "month" | "year" => {
    try {
      if (!from || !to) return "month" as const;
      const f = new Date(from);
      const t = new Date(to);

      const diffMs = t.getTime() - f.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
      const monthDiff =
        (t.getUTCFullYear() - f.getUTCFullYear()) * 12 +
        (t.getUTCMonth() - f.getUTCMonth()) +
        1;

      // a6 <= 31 days  -> week
      // a6 <= 12 months -> month
      // a6 > 12 months  -> year
      if (diffDays <= 31) return "week" as const;
      if (monthDiff <= 12) return "month" as const;
      return "year" as const;
    } catch {
      return "month" as const;
    }
  };

  // Fetch ED Dashboard overview with provided date range
  const { data: edOverviewRes, isFetching: isEdOverviewFetching } = useGetEdDashboardOverviewQuery(
    isEdAdmin ? { from: edFromISO as string, to: edToISO as string } : undefined,
    { skip: !isEdAdmin },
  );

  // Fetch ED Dashboard charts with dynamic granularity
  const edInterval = getIntervalForRange(edFromISO as string, edToISO as string);
  const { data: edChartsRes, isFetching: isEdChartsFetching } = useGetEdDashboardChartsQuery(
    isEdAdmin ? { from: edFromISO as string, to: edToISO as string, granularity: edInterval } : undefined,
    { skip: !isEdAdmin },
  );

  // Fetch admin filters for Super Admin
  const { data: filtersRes } = useGetAdminFiltersQuery(isSuperAdmin ? undefined : skipToken, {
    skip: !isSuperAdmin,
  });
  // Transform filter options to match FilterOption type
  const countryOptions = (filtersRes?.data?.countries || []).map(country => ({
    label: country.name,
    value: country.id,
    ...country // Keep original properties for backward compatibility
  }));

  const regionOptions = (filtersRes?.data?.regions || []).map(region => ({
    label: region.name,
    value: region.id,
    ...region // Keep original properties for backward compatibility
  }));

  const chapterOptions = (filtersRes?.data?.chapters || []).map(chapter => ({
    label: chapter.name,
    value: chapter.id,
    ...chapter // Keep original properties for backward compatibility
  }));

  // Filtered options based on current selections
  const filteredRegionOptions = useMemo(() =>
    currentFilters.country
      ? regionOptions.filter((r: any) => r.country_id === currentFilters.country)
      : regionOptions,
    [regionOptions, currentFilters.country]
  );

  const filteredChapterOptions = useMemo(() =>
    currentFilters.region
      ? chapterOptions.filter((ch: any) => ch.region_id === currentFilters.region)
      : chapterOptions,
    [chapterOptions, currentFilters.region]
  );

  // Initialize navbar display name from localStorage if present
  useEffect(() => {
    const name = typeof localStorage !== "undefined" ? localStorage.getItem("userName") : null;
    if (name) setUserName(name);
  }, []);

  // Transform API data for charts
  const dashboard = dashboardRes?.data;

  // Label formatter supports month ("YYYY-MM") and week ("YYYY-Www") and date strings
  const formatLabel = (label: string) => {
    try {
      if (!label) return "";
      // Week label like 2025-W45
      if (/^\d{4}-W\d{2}$/i.test(label)) {
        const wk = label.split("W")[1];
        return `W${wk}`;
      }
      // Date label
      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        const d = new Date(label);
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      }
      // Month label like 2025-03
      if (/^\d{4}-\d{2}$/.test(label)) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthNum = parseInt(label.split("-")[1], 10);
        return monthNames[monthNum - 1] || label;
      }
      return label;
    } catch {
      return label;
    }
  };

  // Currency formatter with compact notation
  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value.toFixed(0)}`;
  };

  const isThisMonth = selectedPeriod === "thisMonth";
  const revenueData = isThisMonth
    ? ((dashboard as any)?.revenueReceivedWeekly || []).map((item: any, idx: number) => ({
        month: `Week ${idx + 1}`,
        value: Number(item.amount) || 0,
      }))
    : (dashboard?.revenueReceivedToMyBusiness || []).map((item) => ({
        month: formatLabel(item.month),
        value: item.amount,
      }));

  // Use businessGiven / businessGivenWeekly for Business Given graph
  const businessGivenData = isThisMonth
    ? ((dashboard as any)?.businessGivenWeekly || []).map((item: { amount: number }, idx: number) => ({
        month: `Week ${idx + 1}`,
        value: Number(item.amount) || 0,
      }))
    : (dashboard?.businessGiven || []).map((item: { month: string; amount: number }) => ({
        month: formatLabel(item.month),
        value: item.amount,
      }));

  const opportunityReceivedData = isThisMonth
    ? ((dashboard as any)?.receivedBusinessOpportunitySeriesWeekly || []).map((item: any, idx: number) => ({
        month: `Week ${idx + 1}`,
        value: Number(item.count) || 0,
      }))
    : (dashboard?.receivedBusinessOpportunitySeries || []).map((item) => ({
        month: formatLabel(item.month),
        value: item.count,
      }));

  // If givenBusinessOpportunitySeries is not available, create matching structure with zeros
  const opportunityGivenData = isThisMonth
    ? (
        (dashboard as any)?.givenBusinessOpportunitySeriesWeekly ||
        ((dashboard as any)?.receivedBusinessOpportunitySeriesWeekly || []).map((_item: any) => ({ count: 0 }))
      ).map((item: any, idx: number) => ({
        month: `Week ${idx + 1}`,
        value: Number(item.count) || 0,
      }))
    : (
        dashboard?.givenBusinessOpportunitySeries ||
        (dashboard?.receivedBusinessOpportunitySeries || []).map((_item) => ({ count: 0, month: _item.month }))
      ).map((item: any) => ({
        month: formatLabel(item.month),
        value: Number(item.count) || 0,
      }));

  // Calculate totals
  const totalRevenue = (revenueData as Array<{ value: number }>).reduce(
    (sum: number, item: { value: number }) => sum + (Number(item.value) || 0),
    0,
  );
  const totalBusinessGiven = (businessGivenData as Array<{ value: number }>).reduce(
    (sum: number, item: { value: number }) => sum + (Number(item.value) || 0),
    0,
  );

  // Use KPI values for business opportunity totals
  const totalOpportunitiesReceived = dashboard?.kpis?.businessOpportunityReceived || 0;
  const totalOpportunitiesGiven = dashboard?.kpis?.businessOpportunityGiven || 0;
  const totalOpportunities = totalOpportunitiesReceived + totalOpportunitiesGiven;

  // const handleLogout = () => {
  //   localStorage.removeItem("isLoggedIn");
  //   localStorage.removeItem("userEmail");
  //   localStorage.removeItem("userName");
  //   navigate("/login");
  // };

  const handleNotificationClick = () => {
    console.log("Notifications clicked");
  };

  const handleReportClick = (reportName: string, route?: string) => {
    console.log(`${reportName} clicked`);
    if (route) {
      navigate(route);
    }
  };

  const handleSearch = (filters: FilterValues) => {
    console.log('handleSearch called with filters:', filters);
    const params: any = {};
    if (filters.fromDate) params.date_from = filters.fromDate;
    if (filters.toDate) params.date_to = filters.toDate;
    if (filters.country) params.country_id = filters.country;
    
    // Only include region if it belongs to the selected country
    if (filters.region && filters.country) {
      const allRegions = filtersRes?.data?.regions ?? [];
      const regionBelongsToCountry = allRegions.some(
        (r: { id: string; country_id: string }) => r.id === filters.region && r.country_id === filters.country
      );
      if (regionBelongsToCountry) {
        params.region_id = filters.region;
      }
    } else if (filters.region && !filters.country) {
      // If region selected but no country, include region (show all regions case)
      params.region_id = filters.region;
    }
    
    if (filters.chapter) params.chapter_id = filters.chapter;
    console.log('Setting admin filter params:', params);
    setAdminFilterParams(params);
  };

  // Handle filter changes without immediate API calls
  const handleCountryChange = (countryId: string) => {
    setCurrentFilters(prev => ({
      ...prev,
      country: countryId,
      // Clear region if it doesn't belong to the new country
      region: (() => {
        if (!countryId || !prev.region) return '';
        const allRegions = filtersRes?.data?.regions ?? [];
        const regionBelongsToCountry = allRegions.some(
          (r: { id: string; country_id: string }) => r.id === prev.region && r.country_id === countryId
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
        const allChapters = filtersRes?.data?.chapters ?? [];
        const chapterBelongsToRegion = allChapters.some(
          (ch: { id: string; region_id?: string | null }) => ch.id === prev.chapter && ch.region_id === regionId
        );
        return chapterBelongsToRegion ? prev.chapter : '';
      })()
    }));
  };

  const handleChapterChange = (chapterId: string) => {
    setCurrentFilters(prev => ({ ...prev, chapter: chapterId }));
  };

  // Super Admin data from APIs
  const saTotals = saDashboardRes?.data?.totals || ({} as any);
  const saKpis = saKpisRes?.data || ({} as Record<string, number>);

  // Map KPI values
  // For ED roles, backend returns KPIs under data.kpis { chapters, regionalMembers, readyToLaunchChapters, totalMembers, opportunities, businessClosedAmount, ... }
  const edOverview = edOverviewRes?.data || ({} as any);
  const edKpis = (edOverview?.kpis as any) || {};
  const adminStatValues: Record<string, number> = isEdAdmin
    ? {
        // ED config keys (see dashboardConfig): chapters, members, regionalMembers, professionalMembers, blockedMembers, businessOpportunity, businessClosed, readyToLaunch
        countries: 0,
        regions: 0,
        chapters: Number(edKpis.chapters ?? 0),
        members: Number(edKpis.totalMembers ?? 0),
        regionalMembers: Number(edKpis.regionalMembers ?? 0),
        professionalMembers: Number(edKpis.professionalUsers ?? 0),
        blockedMembers: Number(edKpis.blockedUsers ?? 0),
        businessOpportunity: Number(edKpis.opportunities ?? 0),
        businessClosed: Number(edKpis.businessClosedAmount ?? 0),
        readyToLaunch: Number(edKpis.readyToLaunchChapters ?? 0),
      }
    : {
        countries: Number(saKpis.countries ?? saTotals.countries ?? 0),
        regions: Number(saKpis.regions ?? saTotals.regions ?? 0),
        chapters: Number(saKpis.chapters ?? saTotals.chapters ?? 0),
        totalMembers: Number(saKpis.totalMembers ?? saTotals.members ?? 0),
        businessOpportunity: Number(saKpis.businessOpportunity ?? saTotals.businessOpportunity ?? 0),
        businessClosed: Number(saKpis.businessClosed ?? saTotals.businessClosed ?? 0),
      };

  // Prepare admin chart data from series
  const pickValue = (item: any) => Number(item?.value ?? item?.amount ?? item?.count ?? 0);
  const getLabel = (item: any, idx: number) =>
    String(item?.month ?? item?.date ?? item?.label ?? item?.period ?? idx + 1);
  const toChartData = (arrInput: any, intv: "week" | "month" | "year" = "month") => {
    const arr = Array.isArray(arrInput) ? arrInput : [];
    if (intv === "year") {
      // Aggregate into yearly buckets
      const bucket = new Map<string, number>();
      arr.forEach((item: any, idx: number) => {
        const label = getLabel(item, idx);
        // extract year from formats: YYYY, YYYY-MM, YYYY-Www, YYYY-MM-DD
        const match = String(label).match(/^(\d{4})/);
        const year = match ? match[1] : "";
        if (!year) return;
        const prev = bucket.get(year) || 0;
        bucket.set(year, prev + pickValue(item));
      });
      return Array.from(bucket.entries())
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([year, sum]) => ({ month: year, value: sum }));
    }
    // week/month formatting
    if (intv === "week") {
      return arr.map((item: any, idx: number) => ({
        month: `Week ${idx + 1}`,
        value: pickValue(item),
      }));
    }
    // month interval: format to short month when possible
    return arr.map((item: any, idx: number) => {
      const raw = getLabel(item, idx);
      return {
        month: /^\d{4}-W\d{2}$/i.test(String(raw)) ? `Week ${idx + 1}` : formatLabel(raw),
        value: pickValue(item),
      };
    });
  };
  const edCharts = edChartsRes?.data || ({} as any);
  // For Super Admin, fetch series via admin/series with dynamic interval
  const computeInterval = (from?: string, to?: string): "week" | "month" | "year" => {
    try {
      if (!from || !to) return "month";
      const f = new Date(from);
      const t = new Date(to);
      const sameYear = f.getUTCFullYear() === t.getUTCFullYear();
      const sameMonth = sameYear && f.getUTCMonth() === t.getUTCMonth();
      if (sameMonth) return "week";
      if (sameYear) return "month";
      return "year";
    } catch {
      return "month";
    }
  };

  const isSuperAdminCharts = isAdmin && !isHybridRole && !isEdAdmin && !isSocialAdminDashboardRole;
  const interval = computeInterval(saFromISO, saToISO);
  // Series query parameters - use the same date range as other Super Admin APIs
  const seriesQueryParams = useMemo(() => {
    if (!isSuperAdminCharts) return {};
    
    return {
      country_id: adminFilterParams.country_id,
      region_id: adminFilterParams.region_id,
      chapter_id: adminFilterParams.chapter_id,
      interval: 'week' as const, // Force literal type 'week'
      date_from: saFromISO,
      date_to: saToISO,
    } as const;
  }, [isSuperAdminCharts, saFromISO, saToISO, adminFilterParams.country_id, adminFilterParams.region_id, adminFilterParams.chapter_id]);

  // Series queries with consistent date range and proper types
  const { data: chaptersSeriesRes, isFetching: isChaptersFetching } = useGetAdminSeriesQuery(
    isSuperAdminCharts ? { ...seriesQueryParams, metric: 'chapters' as const } : skipToken,
    { skip: !isSuperAdminCharts }
  );

  const { data: opportunitySeriesRes, isFetching: isOpportunityFetching } = useGetAdminSeriesQuery(
    isSuperAdminCharts ? { ...seriesQueryParams, metric: 'opportunity' as const } : skipToken,
    { skip: !isSuperAdminCharts }
  );

  const { data: businessClosedSeriesRes, isFetching: isBusinessClosedFetching } = useGetAdminSeriesQuery(
    isSuperAdminCharts ? { ...seriesQueryParams, metric: 'business_closed' as const } : skipToken,
    { skip: !isSuperAdminCharts }
  );

  // Drives the hold-the-frame dim on the Super Admin overview during a refetch.
  const isSuperAdminRefreshing =
    isSaKpisFetching || isChaptersFetching || isOpportunityFetching || isBusinessClosedFetching;

  const saDynamicSeries = {
    chaptersGrowth: toChartData(chaptersSeriesRes?.data || [], interval),
    businessOpportunity: toChartData(opportunitySeriesRes?.data || [], interval),
    businessClosed: toChartData(businessClosedSeriesRes?.data || [], interval),
  } as const;

  const adminSeries = isEdAdmin
    ? {
        // ED charts mapping: memberGrowth, businessOpportunities, businessClosed
        memberGrowth: toChartData(edCharts?.chaptersGrowth ?? [], edInterval),
        businessOpportunities: toChartData(edCharts?.opportunities ?? [], edInterval),
        businessClosed: toChartData(edCharts?.businessClosed ?? [], edInterval),
      }
    : saDynamicSeries;
  const sumValues = (arr: { value: number }[] = []) => arr.reduce((s, x) => s + (Number(x.value) || 0), 0);

  // Ensure consistent vivid colors for charts on dark theme
  const colorMap: Record<string, string> = {
    orange: "#FF6A00",
    purple: "#A855F7",
    cyan: "#00C2FF",
  };

  if (dashboardRoute !== "/dashboard") {
    return <Navigate to={dashboardRoute} replace />;
  }

  // Lock dashboard when business module is disabled.
  // Only pure super-admins and ED-admins bypass this — hybrid roles (PRESIDENT, VP, etc.)
  // still need active business module access.
  const moduleAccess = authUser?.moduleAccess || {};
  const hasBusinessAccess = moduleAccess.business === true;
  if (!isSuperAdmin && !isEdAdmin && !hasBusinessAccess) {
    return (
      <ModuleLocked
        title="You don't have access to the Dashboard"
        description="The Dashboard is available to members with an active Business account. Please contact your administrator to get access."
        moduleKey="business"
      />
    );
  }

  // The Super Admin overview paints its own floor. The shared gradient brightens
  // as it descends, so by the bottom of a long page its panels are darker than the
  // ground behind them and read as holes; the overview floor darkens instead, and
  // a panel stays lighter than the page at every scroll position.
  // Both admin dashboards, on the same layout and the same surface. An ED
  // sees its own scope's numbers through it; the panels are the same panels.
  const isOverviewLayout = isAdmin && !isHybridRole;

  // `ekam-light` re-points every --ov-*/--nav-* token to the porcelain theme for
  // everything inside it, navigation included. Converting another page is this one
  // class on its wrapper — not a colour sweep through its markup. `--ov-floor`
  // falls back to the app's existing gradient when no theme class is present.
  const content = (
    <div
      className={`min-h-screen ${isOverviewLayout ? ADMIN_THEME : ""}`}
      style={{ background: "var(--ov-floor)" }}
    >
      {/* Navbar - automatically shows role-based navigation */}
      <Navbar
        userName={userName}
        onNotificationClick={handleNotificationClick}
        onProfileClick={() => console.log("Profile clicked")}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Super Admin overview — command bar, network cascade, business flow, trends */}
        {isOverviewLayout && (
          <SuperAdminOverview
            stats={dashboardConfig.stats}
            statValues={adminStatValues}
            charts={dashboardConfig.charts}
            series={adminSeries as Record<string, Array<{ month: string; value: number }>>}
            isRefreshing={isEdAdmin ? isEdOverviewFetching || isEdChartsFetching : isSuperAdminRefreshing}
            showCountries={dashboardConfig.showFilters.countries}
            showRegions={dashboardConfig.showFilters.regions}
            showChapters={dashboardConfig.showFilters.chapters}
            showDateRange={dashboardConfig.showFilters.dateRange}
            countries={countryOptions}
            regions={filteredRegionOptions}
            chapters={filteredChapterOptions}
            initialFilters={{
              country: currentFilters.country,
              region: currentFilters.region,
              chapter: currentFilters.chapter,
            }}
            appliedFilters={adminFilterParams}
            onSearch={handleSearch}
            onCountryChange={handleCountryChange}
            onRegionChange={handleRegionChange}
            onChapterChange={handleChapterChange}
            rangeFrom={isEdAdmin ? edFrom : saFrom}
            rangeTo={isEdAdmin ? edTo : saTo}
          />
        )}

        {/* The overview carries the date control now. */}
        {isEdAdmin && !isOverviewLayout && (
          <div className="mb-6">
            {/* 
            <AdminFilters
              showCountries={false}
              showRegions={false}
              showChapters={false}
              showDateRange={true}
              showTimeRange={false}
              onSearch={handleSearch}
              appliedFilters={adminFilterParams}
            />
            */}
          </div>
        )}

        {/* Period Selector (for regular users and hybrid roles) */}
        {(!isAdmin || isHybridRole) && (
          <div className="flex justify-end mb-6">
            <div className="w-[200px]">
              <FormSelect
                label=""
                value={selectedPeriod}
                onChange={(e) =>
                  setSelectedPeriod(
                    e.target.value as "last6m" | "thisMonth" | "thisYear",
                  )
                }
                options={periodOptions}
                placeholder="Select period"
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 text-[var(--ov-ink-4)]">Loading dashboard...</div>
        )}

        {/* Error State */}
        {dashboardError && (
          <div className="py-12 text-center text-[var(--ov-danger)]">
            {"data" in dashboardError
              ? (dashboardError.data as any)?.message
              : "message" in dashboardError
              ? dashboardError.message
              : "Failed to load dashboard data. Please try again."}
          </div>
        )}

        {/* Stats Grid - ED Admin Roles. Superseded by the overview above for any ED
            role that reaches it; kept for one that does not. */}
        {isEdAdmin && !isOverviewLayout && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {dashboardConfig.stats.map((stat, index) => (
              <AdminStatCard
                key={index}
                title={stat.title}
                value={adminStatValues[stat.key] ?? 0}
                icon={stat.icon}
                onClick={stat.key === 'blockedMembers' ? () => navigate('/admin/blocked-members') : undefined}
              />
            ))}
          </div>
        )}

        {/* Stats Grid - Regular User and Hybrid Roles */}
        {(!isAdmin || isHybridRole) && !isLoading && !dashboardError && dashboard && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-6">
            <GradientContainer>
              <StatCard
                title="BOG (Business Opportunity Given)"
                value={String(dashboard.kpis.businessOpportunityGiven)}
                icon="exchange"
                onClick={() => navigate("/business/opportunity-given")}
              />
            </GradientContainer>
            <GradientContainer>
              <StatCard
                title="BOR (Business Opportunity Received)"
                value={String(dashboard.kpis.businessOpportunityReceived)}
                icon="exchange"
                onClick={() => navigate("/business/opportunity-received")}
              />
            </GradientContainer>
            <GradientContainer>
              <StatCard
                title="P2P"
                value={String(dashboard.kpis.p2p)}
                icon="users"
                onClick={() => navigate("/business/p2p")}
              />
            </GradientContainer>
            <GradientContainer>
              <StatCard
                title="Visitors"
                value={String(dashboard.kpis.visitors)}
                icon="users"
                onClick={() => navigate("/business/visitors")}
              />
            </GradientContainer>
            <GradientContainer>
              <StatCard
                title="Chapter Member Count"
                value={String(dashboard.kpis.chapterMemberCount)}
                icon="users"
              />
            </GradientContainer>
          </div>
        )}

        {/* Charts Grid - ED Admin Roles. Superseded by the overview above. */}
        {isEdAdmin && !isOverviewLayout && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
            {dashboardConfig.charts.map((chart, index) => {
              const seriesData = (adminSeries as any)[chart.key] || [];
              const total = sumValues(seriesData);
              const amount =
                chart.format === "currency"
                  ? `₹ ${total.toLocaleString("en-IN")}`
                  : String(total);
              return (
                <ChartCard
                  key={index}
                  title={chart.title}
                  amount={amount}
                  data={seriesData}
                  color={colorMap[chart.color as string] || (chart.color as string)}
                  yAxisFormatter={
                    chart.format === "currency" ? formatCurrency : undefined
                  }
                  buffer={0.2}
                  gradientFrom={
                    chart.title.toLowerCase().includes("revenue") ? "#FF6A00" : undefined
                  }
                  gradientTo={
                    chart.title.toLowerCase().includes("revenue") ? "#FFB347" : undefined
                  }
                  showMonthsLabel={edInterval === "month"}
                />
              );
            })}
          </div>
        )}

        {/* Charts Grid - Regular User and Hybrid Roles */}
        {(!isAdmin || isHybridRole) && !isLoading && !dashboardError && dashboard && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
            <DualLineChartCard
              title="Business Opportunities"
              amount={String(totalOpportunities)}
              data1={opportunityGivenData}
              data2={opportunityReceivedData}
              label1="Given"
              label2="Received"
              color1="#FF6A00"
              color2="#00C2FF"
              total1={totalOpportunitiesGiven}
              total2={totalOpportunitiesReceived}
            />
            <ChartCard
              title="Business Given"
              amount={`₹ ${totalBusinessGiven.toLocaleString("en-IN")}`}
              data={businessGivenData}
              color="#A855F7"
              yAxisFormatter={formatCurrency}
              buffer={0.2}
            />
            <ChartCard
              title="Business Closed"
              amount={`₹ ${totalRevenue.toLocaleString("en-IN")}`}
              data={revenueData}
              color="#FF6A00"
              gradientFrom="#FF6A00"
              gradientTo="#FFB347"
              yAxisFormatter={formatCurrency}
              buffer={0.2}
            />
          </div>
        )}

        {/* Reports Grid - For Regular Users and Hybrid Roles */}
        {(!isAdmin || isHybridRole) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <ReportButton
              title="Your Weekly Report"
              onClick={() => handleReportClick("Weekly Report", "/reports/weekly")}
            />
            <ReportButton
              title="Business Opportunity Received Report"
              onClick={() =>
                handleReportClick("BOR Report", "/reports/opportunity-received")
              }
            />
            <ReportButton
              title="Personal PALMS Report"
              onClick={() =>
                handleReportClick("Personal PALMS Report", "/reports/personal-palms")
              }
            />
            <ReportButton
              title="Inducted By Report"
              onClick={() => handleReportClick("Inducted By Report", "/reports/inducted-by")}
            />
            <ReportButton
              title="PALMS Attendance Report"
              onClick={() =>
                handleReportClick("PALMS Attendance Report", "/reports/palms-attendance")
              }
            />
            <ReportButton
              title="Personal Many to One Report"
              onClick={() =>
                handleReportClick(
                  "Personal Many to One Report",
                  "/reports/personal-many-to-one",
                )
              }
            />
            <ReportButton
              title="PALMS Summary Report"
              onClick={() =>
                handleReportClick(
                  "PALMS Summary Report",
                  "/reports/palms-summary",
                )
              }
            />
          </div>
        )}
      </main>
    </div>
  );

  // Admin dashboards should not be blocked by member module access.
  return isAdmin ? content : (
    <ModuleGuard moduleKey="business">{content}</ModuleGuard>
  );
}
