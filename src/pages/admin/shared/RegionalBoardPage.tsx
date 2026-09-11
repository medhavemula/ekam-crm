import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search as SearchIcon,
  X,
} from "lucide-react";
import { ADMIN_THEME } from "../../../theme/themeScope";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../app/store";
import Navbar from "../../../components/navigation/Navbar";
import { ChapterCard } from "../../../components/admin";
import FormSelect from "../../../components/forms/FormSelect";
import { ChapterCardGridSkeleton } from "../../../components/common/Skeletons";
import { 
  useGetEdRegionalBoardQuery, 
  useGetEdChaptersQuery,
} from "../../../services/ed";

export default function RegionalBoardPage() {
  const navigate = useNavigate();
  const { role: userRole } = useSelector((state: RootState) => state.auth);

  // Check if user has full regional board access (Executive/Regional/Assistant Regional Director)
  const hasFullAccess = [
    "EXECUTIVE_DIRECTOR",
    "ED_TEAM",
    "REGIONAL_DIRECTOR",
    "ASSISTANT_REGIONAL_DIRECTOR"
  ].includes(userRole || "");

  // Check if user has limited regional access (Chapter/Support/Launch Director, President)
  const hasLimitedAccess = [
    "CHAPTER_DIRECTOR",
    "SUPPORT_DIRECTOR",
    "LAUNCH_DIRECTOR",
    "PRESIDENT"
  ].includes(userRole || "");

  // Pending (UI) filters
  const [pendingArea, setPendingArea] = useState("ALL_AREAS");
  const [pendingChapter, setPendingChapter] = useState("ALL_CHAPTERS");
  // Applied filters
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("ALL_CHAPTERS");
  const [page, setPage] = useState(1);

  // Load chapters for Chapter filter using ED chapters list API with name sorting
  const { data: chaptersRes } = useGetEdChaptersQuery({ 
    page: 1, 
    limit: 50,
  });
  const chapterOptions = (
    [{ value: "ALL_CHAPTERS", label: "All Chapters" }] as Array<{ value: string; label: string }>
  ).concat(
    ((chaptersRes as any)?.data?.items ?? []).map((c: any) => ({ value: c.id, label: c.name })) as Array<{
      value: string;
      label: string;
    }>,
  );

  // Get unique areas from chapters data
  const areaOptions = useMemo(() => {
  const areas = new Set<string>();
  
  ((chaptersRes as any)?.data?.items ?? []).forEach((c: any) => {
    if (c.area) areas.add(c.area);
  });

  return [
    { value: "ALL_AREAS", label: "All Areas" },
    ...Array.from(areas).map(area => ({
      value: area,
      label: area,
    })),
  ];
}, [chaptersRes]);

  // Derive chapter parameter for filtering (applied only)
  const chapterParam = selectedChapter && selectedChapter !== "ALL_CHAPTERS" ? selectedChapter : undefined;
  const selectedChapterLabel =
    chapterOptions.find((option) => option.value === selectedChapter)?.label ?? "";
  const regionalBoardQuery =
    selectedChapter !== "ALL_CHAPTERS"
      ? selectedChapterLabel
      : selectedArea || undefined;

  // API Integration - Fetch regional board data for full access users
  const { 
    data: fullAccessData, 
    isLoading: isFullAccessLoading, 
    error: fullAccessError,
    refetch: refetchFullAccess,
  } = useGetEdRegionalBoardQuery(
    hasFullAccess ? {
      page,
      q: regionalBoardQuery,
      // Respect backend maximum limit (<= 100). Use 100 when filters are applied to have more data.
      limit: (selectedArea || chapterParam) ? 100 : 20,
    } : undefined,
    { skip: !hasFullAccess }
  );

  // API Integration - Fetch regional board data for limited access users
  const { 
    data: limitedAccessData, 
    isLoading: isLimitedAccessLoading, 
    error: limitedAccessError,
    refetch: refetchLimitedAccess,
  } = useGetEdRegionalBoardQuery(
    hasLimitedAccess ? {} : undefined,
    { skip: !hasLimitedAccess }
  );

  // Parse API responses
  const allChapters = hasFullAccess 
    ? (fullAccessData as any)?.data?.chapters || (fullAccessData as any)?.data?.items || []
    : [];
    
  const limitedAccessChapter = hasLimitedAccess && limitedAccessData?.data 
    ? ((limitedAccessData as any).data.items || (limitedAccessData as any).data.chapters || []) 
    : [];

  const chapters = hasFullAccess ? allChapters : limitedAccessChapter;
  const isPresident = (userRole || "") === "PRESIDENT";
    
  // Combined loading and error states
  const isLoading = hasFullAccess ? isFullAccessLoading : isLimitedAccessLoading;
  const error = hasFullAccess ? fullAccessError : limitedAccessError;
  const refetch = hasFullAccess ? refetchFullAccess : refetchLimitedAccess;

  // Pagination derived values (full access only)
  const totalItems = hasFullAccess ? (fullAccessData as any)?.data?.total ?? 0 : 0;
  const serverPage = hasFullAccess ? (fullAccessData as any)?.data?.page ?? page : page;
  const serverLimit = hasFullAccess ? (fullAccessData as any)?.data?.limit ?? ((selectedArea || chapterParam) ? 100 : 20) : 20;
  const totalPages = hasFullAccess ? Math.max(1, Math.ceil(Number(totalItems) / Number(serverLimit || 1))) : 1;

  const handleSearch = () => {
    // Apply pending filters and reset to page 1; query hook will rerun as needed
    setSelectedArea(pendingArea === "ALL_AREAS" ? "" : pendingArea);
    setSelectedChapter(pendingChapter);
    setPage(1);
  };

  const handleViewMembers = (chapterId: string | number) => {
    const basePath = window.location.pathname.includes('regional-access') 
      ? '/admin/regional-access' 
      : '/admin/regional-board';
    navigate(`${basePath}/chapter/${chapterId}/members?chapterId=${chapterId}`);
  };

  const handleViewChapter = (chapterId: string | number) => {
    const basePath = window.location.pathname.includes('regional-access') 
      ? '/admin/regional-access' 
      : '/admin/regional-board';
    navigate(`${basePath}/chapter/${chapterId}`);
  };

  const handleCreateChapter = () => {
    navigate("/admin/regional-board/chapters/create");
  };

  // For limited access users, ensure we have the chapter data before rendering
  useEffect(() => {
    if (hasLimitedAccess && !isLimitedAccessLoading && !limitedAccessData && !limitedAccessError) {
      // Handle case where chapter data couldn't be loaded
      console.error('Failed to load chapter data for limited access user');
    }
  }, [hasLimitedAccess, isLimitedAccessLoading, limitedAccessData, limitedAccessError]);

  const hasFilters = Boolean(selectedArea) || selectedChapter !== "ALL_CHAPTERS";
  const filtersPending =
    pendingArea !== (selectedArea || "ALL_AREAS") || pendingChapter !== selectedChapter;

  const clearFilters = () => {
    setPendingArea("ALL_AREAS");
    setPendingChapter("ALL_CHAPTERS");
    setSelectedArea("");
    setSelectedChapter("ALL_CHAPTERS");
    setPage(1);
  };

  /** What the filter row is currently narrowing to, in words. */
  const filterSummary = [
    selectedArea || null,
    selectedChapter !== "ALL_CHAPTERS" ? selectedChapterLabel : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const shownCount = hasFullAccess ? Number(totalItems) || chapters.length : chapters.length;

  return (
    <div className={`${ADMIN_THEME} min-h-screen`}
      style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* The title carries the count, so the page says how much there is to
            look at before the grid renders. Creating a chapter is the one
            action that does not belong to the filter row, so it sits up here. */}
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2">
              <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                <Building2 className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Board Governance
                </span>
              </div>
            </div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-deep-ink,var(--ov-ink))] sm:text-[32px]">
              {hasLimitedAccess ? "Chapter Board" : "Regional Board"}
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
              {!isLoading && !error && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">
                    {shownCount}
                  </span>{" "}
                  {shownCount === 1 ? "chapter" : "chapters"}
                  {filterSummary ? ` in ${filterSummary}` : ""}
                  {hasLimitedAccess ? " · assigned to you" : ""}
                </>
              )}
            </p>
          </div>

          {hasFullAccess && (
            <button
              type="button"
              onClick={handleCreateChapter}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create chapter
            </button>
          )}
        </div>

        {/* Filters - Only for full access users */}
        {hasFullAccess && (
          <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl bg-[var(--ov-trough)] p-4 ring-1 ring-[color:var(--ov-line-faint)]">
            <div className="w-full shrink-0 sm:w-auto lg:w-[220px]">
              <FormSelect
                label="Area"
                value={pendingArea}
                onChange={(e) => setPendingArea(e.target.value)}
                className="text-[13px]"
                options={areaOptions}
              />
            </div>

            <div className="w-full shrink-0 sm:w-auto lg:w-[220px]">
              <FormSelect
                label="Chapter"
                value={pendingChapter}
                onChange={(e) => setPendingChapter(e.target.value)}
                options={chapterOptions}
                className="text-[13px]"
                searchable
                searchPlaceholder="Search chapters"
              />
            </div>

            {/* h-11 matches the select control; the old h-[46px] left the
                button sitting two pixels proud of the row. */}
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] bg-[var(--ov-ember-fill)] px-5 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-trough)] disabled:opacity-50"
            >
              <SearchIcon className="h-4 w-4" aria-hidden="true" />
              {isLoading ? "Searching…" : "Search"}
            </button>

            {(hasFilters || filtersPending) && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center gap-1.5 rounded-[var(--field-radius)] px-3 text-[13px] font-medium text-[var(--ov-ink-3)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </button>
            )}
          </div>
        )}

        {/* Loading state, in the grid's own shape, so nothing re-flows when the
            chapters land. */}
        {isLoading && <ChapterCardGridSkeleton count={6} />}

        {/* Error State */}
        {!isLoading && error && (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-8 text-center ring-1 ring-[color:var(--ov-line)]">
            <span
              aria-hidden="true"
              className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-[var(--ov-danger-wash)] text-[var(--ov-danger)]"
            >
              <AlertTriangle className="h-5 w-5" />
            </span>
            <p className="mt-3.5 text-[15px] font-semibold text-[var(--ov-ink)]">
              Could not load chapters
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              The regional board did not respond. Nothing has changed — try again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        )}

        {/* Chapters Grid */}
        {!isLoading && !error && chapters.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(chapters as any[]).map((chapter: unknown, index: number) => (
              <ChapterCard
                key={(chapter as any).id || (chapter as any)._id || index}
                chapterName={(chapter as any).chapterName || (chapter as any).name || "Unknown Chapter"}
                location={(chapter as any).location || (chapter as any).area || (chapter as any).city || ""}
                memberCount={(chapter as any).memberCount || (chapter as any).members || 0}
                onViewMembers={() => handleViewMembers((chapter as any).id || (chapter as any)._id)}
                onViewChapter={() => handleViewChapter((chapter as any).id || (chapter as any)._id)}
                onViewManyToOne={isPresident ? () => navigate("/business/many-to-one") : undefined}
                delay={Math.min(index, 8) * 0.04}
              />
            ))}
          </div>
        )}

        {/* Empty state. Which of the two it is matters: a filter that matched
            nothing is the reader's own doing and is undone from here, while an
            empty region needs its first chapter. The old copy asked the reader
            to check their backend connection. */}
        {!isLoading && !error && chapters.length === 0 && (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-10 text-center ring-1 ring-[color:var(--ov-line)]">
            <span
              aria-hidden="true"
              className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-4)]"
            >
              <Building2 className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-[var(--ov-ink)]">
              {hasFilters ? "No chapters match these filters" : "No chapters yet"}
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {hasFilters
                ? "Try a wider area, or clear the filters to see every chapter in your region."
                : hasFullAccess
                  ? "Chapters you create in this region will appear here."
                  : "You have not been assigned to a chapter yet."}
            </p>
            {hasFullAccess && (
              <button
                type="button"
                onClick={hasFilters ? clearFilters : handleCreateChapter}
                className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]"
              >
                {hasFilters ? (
                  <>
                    <X className="h-4 w-4" aria-hidden="true" />
                    Clear filters
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Create chapter
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Pagination. One page of results needs no pager — the count in the
            header already says how many there are. */}
        {hasFullAccess && !isLoading && !error && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl bg-[var(--ov-panel)] px-4 py-3 ring-1 ring-[color:var(--ov-line)]">
            <p className="text-[12.5px] text-[var(--ov-ink-4)]">
              Page{" "}
              <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{serverPage}</span>{" "}
              of <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{totalPages}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={serverPage <= 1}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={serverPage >= totalPages}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] disabled:pointer-events-none disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
