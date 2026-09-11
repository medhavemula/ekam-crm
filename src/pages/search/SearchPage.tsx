import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UsersRound } from "lucide-react";
import { ADMIN_THEME } from "../../theme/themeScope";
import Navbar from "../../components/navigation/Navbar";
import FormInput from '../../components/forms/FormInput';
import FormSelect from '../../components/forms/FormSelect';
import SearchMemberCard from '../../components/search/SearchMemberCard';
import { MemberCardGridSkeleton } from "../../components/common/Skeletons";
import GradientContainer from "../../components/common/GradientContainer";
import { useLazyGlobalSearchMembersQuery, type GlobalSearchResult } from "../../services/searchApi";
import { useConnectionRequestMutation } from "../../services/connectionsApi";
import { useToast } from "../../components/toast/ToastProvider";
import { useLazyListCountriesQuery, useListProfessionalCategoriesQuery, useLazyListRegionsQuery, useLazyListChaptersQuery, useListBusinessCategoriesQuery } from "../../services/publicApi";
import { useAppSelector } from "../../app/store";

export default function SearchPage() {
  const navigate = useNavigate();
  const [userName] = useState("Mike");
  const { showToast } = useToast();
  const currentUserId = useAppSelector((state) => state.auth.user?._id);
  // Search form state
  const [searchParams, setSearchParams] = useState({
    // Basic search (outside)
    keywords: "",
    companyName: "",
    email: "",
    // Name filters
    firstName: "",
    lastName: "",
    memberNumber: "",
    // Location filters
    country: "", // countryId
    region: "", // regionId
    chapter: "", // chapterId
    location: "", // single location field for city, state, street, pincode
    // Professional filters
    professionalCategory: "",
    role: "",
    skills: "",
    yearsOfExperience: "",
    // Business filters
    businessCategory: "",
    subCategory: "",
  });

  // Modal-specific keywords state
  const [modalKeywords, setModalKeywords] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // API hooks
  const [globalSearchMembers, { isFetching }] = useLazyGlobalSearchMembersQuery();
  const [requestConnect] = useConnectionRequestMutation();
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [pageSize] = useState(9);
  const [defaultCountryId, setDefaultCountryId] = useState<string>("");

  // Fetch countries and categories for dropdowns using lazy queries for server-side search
  const [fetchCountries] = useLazyListCountriesQuery();
  const [fetchRegions] = useLazyListRegionsQuery();
  const [fetchChapters] = useLazyListChaptersQuery();

  // Use regular queries for categories like BusinessStep
  const { data: professionalCategoriesResponse, isLoading: professionalCategoriesLoading } = useListProfessionalCategoriesQuery({
    regionId: searchParams.region || undefined,
    limit: 20
  });

  const { data: businessCategoriesResponse, isLoading: businessCategoriesLoading } = useListBusinessCategoriesQuery({
    regionId: searchParams.region || undefined,
    limit: 20
  });

  // State for dropdown options
  const [countriesOptions, setCountriesOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [regionsOptions, setRegionsOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [chaptersOptions, setChaptersOptions] = useState<Array<{ value: string; label: string }>>([]);

  // Transform professional categories data like BusinessStep
  const professionalCategoryOptions = React.useMemo(() => {
    const baseOptions = [];

    if (professionalCategoriesResponse?.data) {
      // Handle new API response structure: data array directly contains categories
      const categories = Array.isArray(professionalCategoriesResponse.data)
        ? professionalCategoriesResponse.data
        : [];

      baseOptions.push(...categories.map((category: any) => ({
        value: category.value,
        label: category.label,
      })));
    }

    return baseOptions;
  }, [professionalCategoriesResponse]);

  // Transform business categories data like BusinessStep
  const businessCategoryOptions = React.useMemo(() => {
    const baseOptions = [];

    if (businessCategoriesResponse?.data) {
      // Handle new API response structure: data array directly contains categories
      const categories = Array.isArray(businessCategoriesResponse.data)
        ? businessCategoriesResponse.data
        : [];

      baseOptions.push(...categories.map((category: any) => ({
        value: category.value,
        label: category.label,
      })));
    }

    return baseOptions;
  }, [businessCategoriesResponse]);

  // Debounce utility
  const debounce = React.useCallback(<T extends (...args: any[]) => any>(func: T, delay: number): T => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }, []);

  // Handle country search with debouncing
  const handleCountrySearch = React.useCallback(async (searchTerm: string) => {
    try {
      const result = await fetchCountries({ q: searchTerm, limit: 20 }).unwrap();
      const options = result.data.map((country: any) => ({
        value: country.id,
        label: country.name
      }));
      setCountriesOptions(options);
    } catch (error) {
      console.error('Failed to fetch countries:', error);
      setCountriesOptions([]);
    }
  }, [fetchCountries]);

  // Debounced country search
  const debouncedCountrySearch = React.useMemo(
    () => debounce(handleCountrySearch, 300),
    [handleCountrySearch, debounce]
  );

  // Handle region search with debouncing
  const handleRegionSearch = React.useCallback(async (searchTerm: string) => {
    try {
      const params: any = { q: searchTerm, limit: 20 };
      if (searchParams.country) {
        params.countryId = searchParams.country;
      }
      const result = await fetchRegions(params).unwrap();
      const options = result.data.map((region: any) => ({
        value: region.id,
        label: region.name
      }));
      setRegionsOptions(options);
    } catch (error) {
      console.error('Failed to fetch regions:', error);
      setRegionsOptions([]);
    }
  }, [fetchRegions, searchParams.country]);

  // Debounced region search
  const debouncedRegionSearch = React.useMemo(
    () => debounce(handleRegionSearch, 300),
    [handleRegionSearch, debounce]
  );

  // Handle chapter search with debouncing
  const handleChapterSearch = React.useCallback(async (searchTerm: string) => {
    try {
      const params: any = { q: searchTerm, limit: 20 };
      if (searchParams.region) {
        params.regionId = searchParams.region;
      } else if (searchParams.country) {
        params.countryId = searchParams.country;
      }
      const result = await fetchChapters(params).unwrap();
      const options = result.data.map((chapter: any) => ({
        value: chapter.id,
        label: chapter.name
      }));
      setChaptersOptions(options);
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
      setChaptersOptions([]);
    }
  }, [fetchChapters, searchParams.region, searchParams.country]);

  // Debounced chapter search
  const debouncedChapterSearch = React.useMemo(
    () => debounce(handleChapterSearch, 300),
    [handleChapterSearch, debounce]
  );

  // Initial load of all dropdowns
  React.useEffect(() => {
    handleCountrySearch('');
    handleRegionSearch('');
    handleChapterSearch('');
  }, [handleCountrySearch, handleRegionSearch, handleChapterSearch]);

  // Fetch India's country ID to use as default when no filters are applied
  React.useEffect(() => {
    fetchCountries({ q: 'India', limit: 5 }).unwrap().then((result) => {
      const india = result.data.find((c: any) =>
        c.name.toLowerCase() === 'india'
      );
      if (india) setDefaultCountryId(india.id);
    }).catch(() => {});
  }, [fetchCountries]);

  // Update regions when country changes
  React.useEffect(() => {
    if (searchParams.country) {
      handleRegionSearch('');
    } else {
      handleRegionSearch(''); // Fetch all regions when no country is selected
    }
    // Reset region and chapter when country changes
    setSearchParams(prev => ({
      ...prev,
      region: '',
      chapter: ''
    }));
  }, [searchParams.country, handleRegionSearch]);

  // Update chapters when region changes
  React.useEffect(() => {
    handleChapterSearch('');
    // Reset chapter when region changes
    setSearchParams(prev => ({
      ...prev,
      chapter: ''
    }));
  }, [searchParams.region, handleChapterSearch]);

  // Update categories when region changes
  React.useEffect(() => {
    // Reset category selections when region changes
    setSearchParams(prev => ({
      ...prev,
      professionalCategory: '',
      businessCategory: ''
    }));
  }, [searchParams.region]);

  // Check authentication.
  //
  // On "accessToken", which is what ProtectedRoute around this route and every
  // other guard in the app read. This used to read "isLoggedIn", a second key
  // written alongside it at sign-in; whenever the two disagreed the page bounced
  // to /login, which then bounced back to /dashboard because a token was in fact
  // present, and the search screen was simply unreachable.
  React.useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      navigate("/login");
    }
  }, [navigate]);

  // Check if any search parameters are filled
  const hasSearchCriteria = React.useCallback(() => {
    const {
      firstName, lastName, memberNumber, country, region, chapter, location,
      companyName, email, professionalCategory, role, skills, yearsOfExperience,
      businessCategory, subCategory
    } = searchParams;

    // Check outside keywords or modal keywords
    const hasKeywords = searchParams.keywords.trim() || modalKeywords.trim();

    return !!(
      hasKeywords ||
      companyName.trim() ||
      email.trim() ||
      firstName.trim() ||
      lastName.trim() ||
      memberNumber.trim() ||
      country ||
      region ||
      chapter ||
      location.trim() ||
      professionalCategory ||
      role.trim() ||
      skills.trim() ||
      yearsOfExperience.trim() ||
      businessCategory ||
      subCategory.trim()
    );
  }, [searchParams, modalKeywords]);

  // Check if any filter data is entered (to block outside search)
  const hasFilterData = React.useCallback(() => {
    const {
      firstName, lastName, memberNumber, country, region, chapter, location,
      companyName, email, professionalCategory, role, skills, yearsOfExperience,
      businessCategory, subCategory
    } = searchParams;

    return !!(
      firstName.trim() ||
      lastName.trim() ||
      memberNumber.trim() ||
      country ||
      region ||
      chapter ||
      location.trim() ||
      companyName.trim() ||
      email.trim() ||
      professionalCategory ||
      role.trim() ||
      skills.trim() ||
      yearsOfExperience.trim() ||
      businessCategory ||
      subCategory.trim() ||
      modalKeywords.trim() // Include modal keywords in filter data check
    );
  }, [searchParams, modalKeywords]);

  // Determine if outside search should be disabled
  const shouldDisableOutsideSearch = showFilters || hasFilterData();

  // Check if outside search has data (to prevent opening filters)
  const hasOutsideSearchData = React.useCallback(() => {
    return searchParams.keywords.trim() !== "";
  }, [searchParams]);

  // Handle search
  const handleSearch = React.useCallback(async (page: number = 1) => {
    setHasSearched(true);
    setCurrentPage(page);

    // Build search parameters
    const params: any = {
      page,
      limit: pageSize,
      sort: "relevance",
    };

    // Add search parameters
    const {
      firstName, lastName, memberNumber, country, region, chapter, location,
      companyName, email, professionalCategory, role, skills, yearsOfExperience,
      businessCategory, subCategory
    } = searchParams;

    // Combine search terms - use outside keywords if available, otherwise use modal keywords
    const searchTerms = searchParams.keywords.trim() || modalKeywords.trim();
    const otherTerms = [email].filter(Boolean).join(" ");
    const finalSearchTerms = [searchTerms, otherTerms].filter(Boolean).join(" ");

    if (finalSearchTerms) {
      params.q = finalSearchTerms;
    }

    // Add name filters
    if (firstName) params.firstName = firstName;
    if (lastName) params.lastName = lastName;
    if (memberNumber) params.memberNumber = memberNumber;

    // Add location filters — default to India when no criteria are provided
    const effectiveCountry = country || (!hasSearchCriteria() && defaultCountryId ? defaultCountryId : "");
    if (effectiveCountry) params.countryId = effectiveCountry;
    if (region) params.regionId = region;
    if (chapter) params.chapterId = chapter;
    if (location) params.location = location;

    // Add professional filters
    if (professionalCategory) params.professionalCategory = professionalCategory;
    if (role) params.role = role;
    if (skills) params.skills = skills;
    if (yearsOfExperience) params.yearsOfExperience = parseInt(yearsOfExperience);

    // Add business filters
    if (companyName) params.businessName = companyName;
    if (businessCategory) params.businessCategory = businessCategory;
    if (subCategory) params.subCategory = subCategory;

    try {
      const result = await globalSearchMembers(params).unwrap();
      if (result.success) {
        setResults(result.data);
        setTotalResults(result.pagination.total);
      }
    } catch (error) {
      console.error('Search failed:', error);
      showToast({
        title: 'Search Failed',
        description: 'Failed to search members. Please try again.',
        kind: 'error',
      });
      setResults([]);
      setTotalResults(0);
    }
  }, [searchParams, globalSearchMembers, showToast, pageSize, hasSearchCriteria, defaultCountryId, modalKeywords]);

  // Handle page change
  const handlePageChange = React.useCallback((newPage: number) => {
    handleSearch(newPage);
  }, [handleSearch]);

  // Handle connection request
  const handleConnect = async (id: string) => {
    try {
      await requestConnect({ userId: id, message: "Hi, I'd like to connect to collaborate." }).unwrap();
      showToast({
        title: 'Request Sent',
        description: 'Your connection request has been sent.',
        kind: 'success',
      });
      // Refresh results
      handleSearch(currentPage);
    } catch (error) {
      console.error('Connection request failed:', error);
      showToast({
        title: 'Request Failed',
        description: 'Failed to send connection request.',
        kind: 'error',
      });
    }
  };

  // Handle view profile — navigate to own profile page if it's the current user
  const handleViewProfile = (id: string) => {
    if (currentUserId && id === currentUserId) {
      navigate("/profile");
    } else {
      navigate(`/viewprofile/${id}`, { state: { from: 'search' } });
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalResults / pageSize);

  // Handle input change for all search fields
  const handleInputChange = React.useCallback((field: keyof typeof searchParams, value: string | React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement> | boolean) => {
    const finalValue = typeof value === 'boolean' ? value :
      typeof value === 'string' ? value :
        value.target.type === 'checkbox' ? value.target.checked :
          value.target.value;
    setSearchParams(prev => ({
      ...prev,
      [field]: finalValue
    }));
  }, []);

  // Handle form submission
  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setShowFilters(false); // Close filters modal
    handleSearch(1); // Reset to page 1 on new search
  }, [handleSearch]);

  // Handle opening filters modal
  const handleOpenFilters = React.useCallback(() => {
    // Check if outside search has data
    if (hasOutsideSearchData()) {
      showToast({
        title: 'Search Active',
        description: 'Please clear the search field before opening filters.',
        kind: 'info',
      });
      return;
    }
    // Clear outside keywords when opening filters
    setSearchParams(prev => ({ ...prev, keywords: "" }));
    setShowFilters(true);
  }, [hasOutsideSearchData, showToast]);

  // Handle closing filters modal
  const handleCloseFilters = React.useCallback(() => {
    // Clear modal keywords when closing filters
    setModalKeywords("");
    setShowFilters(false);
  }, []);

  // Handle blocked search input click
  const handleBlockedSearchClick = React.useCallback(() => {
    if (hasFilterData()) {
      showToast({
        title: 'Filters Active',
        description: 'Please clear all filters to use the search field.',
        kind: 'info',
      });
    } else if (showFilters) {
      showToast({
        title: 'Filters Open',
        description: 'Please close the filters to use the search field.',
        kind: 'info',
      });
    }
  }, [hasFilterData, showFilters, showToast]);

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
            Search
          </h1>
          <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
            {isFetching ? (
              "Searching the directory…"
            ) : hasSearched ? (
              <>
                <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{totalResults}</span>{" "}
                {totalResults === 1 ? "member" : "members"} found
              </>
            ) : (
              "Find members across the EKAM directory"
            )}
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-6 w-full relative z-50">
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="flex-1 flex items-center bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md px-3 h-11">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--ov-ink-4)] mr-2">
                <path d="M21 21L16.65 16.65M10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5C18 14.6421 14.6421 18 10.5 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                type="text"
                value={searchParams.keywords}
                onChange={(e) => handleInputChange('keywords', e.target.value)}
                onClick={shouldDisableOutsideSearch ? handleBlockedSearchClick : undefined}
                placeholder="Search EKAM Directory for"
                className="w-full h-10 bg-transparent text-sm text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none"
                disabled={shouldDisableOutsideSearch}
              />
              {shouldDisableOutsideSearch && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-red-500 ml-2">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <button
              type="button"
              onClick={showFilters ? handleCloseFilters : handleOpenFilters}
              disabled={hasOutsideSearchData()}
              className="h-11 px-5 rounded-md bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-2)] ring-1 ring-[color:var(--ov-line)] hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] text-sm font-semibold transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                <path d="M4 7H20M7 7V4M17 7V10M4 17H20M7 17V20M17 17V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {showFilters ? 'Close Filters' : 'Filter'}
            </button>

            {/* Search Members Button - Hidden on mobile when modal is open, always visible on desktop */}
            {!showFilters && (
              <button
                type="submit"
                className="h-11 px-6 rounded-md bg-[var(--ov-ember-fill)] hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-on-ember)] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed sm:flex items-center justify-center"
                disabled={isFetching || (!showFilters && shouldDisableOutsideSearch)}
              >
                {isFetching ? "Searching..." : "Search Members"}
              </button>
            )}

            {/* Search Members Button - Always visible on desktop when modal is open */}
            {showFilters && (
              <button
                type="submit"
                className="h-11 px-6 rounded-md bg-[var(--ov-ember-fill)] hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-on-ember)] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden sm:flex items-center justify-center"
                disabled={isFetching}
              >
                {isFetching ? "Searching..." : "Search Members"}
              </button>
            )}
          </div>
        </form>

        {/* Filters Card - shown only when Filter is clicked */}
        {showFilters && (
          <GradientContainer>
            <div className="rounded-xl p-4 mb-6 relative z-40">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormInput
                  label="Keywords"
                  type="text"
                  placeholder="Search keywords"
                  value={modalKeywords}
                  onChange={(e) => setModalKeywords(e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormInput
                  label="First Name"
                  type="text"
                  placeholder="First name"
                  value={searchParams.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormInput
                  label="Last Name"
                  type="text"
                  placeholder="Last name"
                  value={searchParams.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormInput
                  label="EK Number"
                  type="text"
                  placeholder="EKAM member number"
                  value={searchParams.memberNumber}
                  onChange={(e) => handleInputChange('memberNumber', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormSelect
                  label="Country"
                  value={searchParams.country}
                  onChange={(value) => handleInputChange('country', value || '')}
                  placeholder="Select country"
                  options={countriesOptions}
                  className="w-full"
                  zIndex="z-[99999]"
                  searchable={true}
                  searchPlaceholder="Search countries..."
                  onSearchChange={debouncedCountrySearch}
                  disableClientSideFilter={true}
                />
                <FormSelect
                  label="Region"
                  value={searchParams.region}
                  onChange={(value) => handleInputChange('region', value || '')}
                  placeholder="Select region"
                  options={regionsOptions}
                  className="w-full"
                  zIndex="z-[99998]"
                  searchable={true}
                  searchPlaceholder="Search regions..."
                  onSearchChange={debouncedRegionSearch}
                  disableClientSideFilter={true}
                />
                <FormSelect
                  label="Chapter"
                  value={searchParams.chapter}
                  onChange={(value) => handleInputChange('chapter', value || '')}
                  placeholder="Select chapter"
                  options={chaptersOptions}
                  className="w-full"
                  zIndex="z-[99997]"
                  searchable={true}
                  searchPlaceholder="Search chapters..."
                  onSearchChange={debouncedChapterSearch}
                  disableClientSideFilter={true}
                />
                <FormInput
                  label="Location"
                  type="text"
                  placeholder="City, state, street, pincode"
                  value={searchParams.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormInput
                  label="Company Name"
                  type="text"
                  placeholder="Company name"
                  value={searchParams.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormInput
                  label="Email"
                  type="email"
                  placeholder="Email address"
                  value={searchParams.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormSelect
                  label="Professional Category"
                  value={searchParams.professionalCategory}
                  onChange={(value) => handleInputChange('professionalCategory', value || '')}
                  placeholder={professionalCategoriesLoading ? "Loading categories..." : "Search or select a category"}
                  options={professionalCategoryOptions}
                  className="w-full"
                  zIndex="z-[99996]"
                  searchable={true}
                  searchPlaceholder="Search categories..."
                  disabled={professionalCategoriesLoading}
                />
                <FormInput
                  label="Role"
                  type="text"
                  placeholder="Professional role"
                  value={searchParams.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormInput
                  label="Skills"
                  type="text"
                  placeholder="Skills/technologies"
                  value={searchParams.skills}
                  onChange={(e) => handleInputChange('skills', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormInput
                  label="Years of Experience"
                  type="number"
                  placeholder="Minimum years"
                  value={searchParams.yearsOfExperience}
                  onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
                <FormSelect
                  label="Business Category"
                  value={searchParams.businessCategory}
                  onChange={(value) => handleInputChange('businessCategory', value || '')}
                  placeholder={businessCategoriesLoading ? "Loading categories..." : "Search or select a category"}
                  options={businessCategoryOptions}
                  className="w-full"
                  zIndex="z-[99995]"
                  searchable={true}
                  searchPlaceholder="Search categories..."
                  disabled={businessCategoriesLoading}
                />
                <FormInput
                  label="Sub Category"
                  type="text"
                  placeholder="Business sub-category"
                  value={searchParams.subCategory}
                  onChange={(e) => handleInputChange('subCategory', e.target.value)}
                  className="w-full h-10 pl-4 pr-3 text-sm bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-md text-[var(--ov-ink)] placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Search Members Button - Mobile only, shown after modal */}
              <div className="mt-6 flex sm:hidden">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full h-11 px-6 rounded-md bg-[var(--ov-ember-fill)] hover:bg-[var(--ov-ember-fill-hover)] text-[var(--ov-on-ember)] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isFetching}
                >
                  {isFetching ? "Searching..." : "Search Members"}
                </button>
              </div>
            </div>
          </GradientContainer>
        )}

        {/* Initial loading spinner — only on first search before any results exist */}
        {isFetching && results.length === 0 && (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-2 border-[color:var(--ov-ember)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* A first search has nothing to keep on screen, so it stands in for
            what it is about to show. Paging through results already has cards
            up and keeps them, dimmed, rather than emptying the page. */}
        {isFetching && results.length === 0 && (
          <div className="mb-6">
            <MemberCardGridSkeleton count={6} />
          </div>
        )}

        {/* Search Results — stay visible during pagination fetches */}
        {hasSearched && results.length > 0 && (
          <div className={`mb-6 transition-opacity duration-150 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((member) => (
                <SearchMemberCard
                  key={member.id}
                  id={member.id}
                  name={member.name}
                  headline={member.headline}
                  email={member.email}
                  phone={member.phone}
                  avatarUrl={member.avatarUrl}
                  connectionStatus={member.connection?.status}
                  connectionActionAllowed={member.connection?.actionAllowed}
                  onViewProfile={handleViewProfile}
                  onConnect={handleConnect}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isFetching && hasSearched && results.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-wash)]"
            >
              <UsersRound className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">No members match that search</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              Try a different name or number, or widen the filters.
            </p>
          </div>
        )}

        {/* Pre-search hint */}
        {!hasSearched && !isFetching && (
          <div className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-wash)]"
            >
              <UsersRound className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">Search the directory</p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              Search Members browses everyone in India. Filter narrows it by name, number, country or region.
            </p>
          </div>
        )}

        {/* Pagination — stays visible during page fetches */}
        {results.length > 0 && (
          <div className="flex flex-col items-center gap-3 mt-8 mb-4">
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {/* Previous */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-lg text-[var(--ov-ink)] text-sm font-medium hover:bg-[var(--ov-raised)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {/* Always show page 1 */}
              {totalPages > 0 && (
                <button
                  onClick={() => handlePageChange(1)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPage === 1 ? 'bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)]' : 'bg-[var(--ov-panel)] border border-[color:var(--ov-line)] text-[var(--ov-ink)] hover:bg-[var(--ov-raised)]'}`}
                >
                  1
                </button>
              )}

              {/* Left ellipsis */}
              {currentPage > 4 && totalPages > 6 && (
                <span className="w-10 h-10 flex items-center justify-center text-[var(--ov-ink-4)] text-sm">...</span>
              )}

              {/* Middle pages */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p !== 1 && p !== totalPages && Math.abs(p - currentPage) <= 2)
                .map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPage === pageNum ? 'bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)]' : 'bg-[var(--ov-panel)] border border-[color:var(--ov-line)] text-[var(--ov-ink)] hover:bg-[var(--ov-raised)]'}`}
                  >
                    {pageNum}
                  </button>
                ))
              }

              {/* Right ellipsis */}
              {currentPage < totalPages - 3 && totalPages > 6 && (
                <span className="w-10 h-10 flex items-center justify-center text-[var(--ov-ink-4)] text-sm">...</span>
              )}

              {/* Always show last page */}
              {totalPages > 1 && (
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPages ? 'bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)]' : 'bg-[var(--ov-panel)] border border-[color:var(--ov-line)] text-[var(--ov-ink)] hover:bg-[var(--ov-raised)]'}`}
                >
                  {totalPages}
                </button>
              )}

              {/* Next */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 bg-[var(--ov-panel)] border border-[color:var(--ov-line)] rounded-lg text-[var(--ov-ink)] text-sm font-medium hover:bg-[var(--ov-raised)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>

            <span className="text-[var(--ov-ink-4)] text-sm">
              Page {currentPage} of {totalPages} &nbsp;·&nbsp; Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalResults)} of {totalResults} members
            </span>
          </div>
        )}
      </main>
    </div>
  );
}
