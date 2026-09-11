import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { ConnectionCard } from "../../components/connections";
import searchDirectory from "../../assets/search-directory.svg";
import { useLazyConnectionsSearchDirectoryQuery, useConnectionRequestMutation, type DirectoryCard } from "../../services/connectionsApi";
import { useListChaptersQuery, useListProfessionalCategoriesQuery, useListCountriesQuery } from "../../services/publicApi";
import { useToast } from "../../components/toast/ToastProvider";
import { getCategoryLabel, transformApiCategories } from "../../utils/businessCategories";
import FormInput from '../../components/forms/FormInput';
import FormSelect from '../../components/forms/FormSelect';

export default function AddConnectionPage() {
  const navigate = useNavigate();
  const [userName] = useState("Mike");
  // Search form state - keeping the same form fields but will map to API params
  const [searchParams, setSearchParams] = useState({
    firstName: "",
    lastName: "",
    country: "", // This will store country ID from dropdown
    location: "",
    keywords: ""
  });
  const [triggerSearch, { data: searchRes, isFetching }] = useLazyConnectionsSearchDirectoryQuery();
  const [requestConnect] = useConnectionRequestMutation();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<DirectoryCard[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [indiaCountryId, setIndiaCountryId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [pageSize] = useState(12);
  const { showToast } = useToast();
  
  // Fetch countries using existing API
  const { data: countriesResponse } = useListCountriesQuery({ limit: 200 });
  
  // Find India country ID when countries data is available
  React.useEffect(() => {
    if (countriesResponse?.data) {
      const india = countriesResponse.data.find((c: any) => c.name === "India" || c.code === "IN");
      if (india) {
        setIndiaCountryId(india.id);
        // Auto-select India if no country is selected yet
        if (!searchParams.country) {
          handleInputChange('country', india.id);
        }
      }
    }
  }, [countriesResponse, searchParams.country]);
  
  // Fetch chapters for normalization
  const { data: chaptersResponse } = useListChaptersQuery({ limit: 200 });
  const chapterOptions = React.useMemo(() => 
    transformApiCategories(chaptersResponse?.data || []), 
    [chaptersResponse]
  );
  
  // Fetch professional categories for headline normalization
  const { data: professionalCategoriesResponse } = useListProfessionalCategoriesQuery({ limit: 200 });
  const professionalCategoryOptions = React.useMemo(() => 
    transformApiCategories(professionalCategoriesResponse?.data || []), 
    [professionalCategoriesResponse]
  );

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // Keep local results in sync when a new search completes
  React.useEffect(() => {
    if (Array.isArray(searchRes?.data)) {
      setResults(searchRes?.data as DirectoryCard[]);
      setTotalResults(searchRes?.total || 0);
      setCurrentPage(searchRes?.page || 1);
    }
  }, [searchRes]);

  const mapToUserId = (anyConn: any, fallbackIdx?: number) => anyConn?.user?.id || anyConn?.user?._id || anyConn?.id || String(fallbackIdx ?? "");

  const toStatus = (conn?: DirectoryCard["connection"]) => {
    if (!conn) return undefined;
    if (conn.status === "ACCEPTED") return "connected" as const;
    if (conn.status === "PENDING_SENT") return "sent" as const;
    if (conn.status === "PENDING_RECEIVED") return "received" as const;
    return undefined;
  };

  const handleConnect = async (id: string | number, source?: any) => {
    try {
      const key = String(id);
      if (pending.has(key)) return; // guard double click
      setPending((prev) => new Set(prev).add(key));
      if (source?.connection?.status === 'SELF') {
        showToast({ title: 'Action not allowed', description: 'You cannot connect with yourself.', kind: 'error' });
        return;
      }
      if (source?.connection && source.connection.actionAllowed === false) {
        showToast({ title: 'Action not allowed', description: source?.connection?.reason || 'Action not allowed for this user.', kind: 'error' });
        return;
      }
      // Backend likely expects no body for request. Do a single call only.
      await requestConnect({ userId: String(id), message: "Hi, I'd like to connect to collaborate." }).unwrap();
      // Immediately refresh the search results to get updated list
      await handleSearch();
      showToast({ title: 'Request sent', description: 'Your connection request has been sent.', kind: 'success' });
    } catch (e) {
      const err = e as any;
      // eslint-disable-next-line no-console
      console.error('Connection request failed', err);
      const backendMsg = err?.data?.message;
      const msg = backendMsg || 'Failed to send request';
      showToast({ title: 'Failed to send request', description: String(msg), kind: 'error' });
    } finally {
      const key = String(id);
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleSearch = React.useCallback(async (page: number = 1) => {
    // Check if at least one field has a value
    const hasSearchTerm = Object.values(searchParams).some(val => val.trim() !== '');
    
    // If no search terms, default to India country (only show toast on first search)
    if (!hasSearchTerm && page === 1) {
      showToast({ title: 'Showing India users', description: 'No filters applied - showing users from India', kind: 'info' });
    }

    setHasSearched(true);
    
    // Map form fields to API parameters - only send required ones
    const params: any = {
      excludeConnected: true,
      page,
      limit: pageSize,
      sort: 'relevance'
    };

    // Map search parameters to API parameters
    const { firstName, lastName, country, location, keywords } = searchParams;
    
    // If no search terms, default to India
    if (!hasSearchTerm && indiaCountryId) {
      params.countryId = indiaCountryId;
    }
    
    // Combine first and last name for name search
    if (firstName || lastName) {
      params.q = `${firstName} ${lastName}`.trim();
    }
    
    // Add keywords to the search query
    if (keywords) {
      params.q = params.q ? `${params.q} ${keywords}`.trim() : keywords;
    }
    
    // Add countryId as separate parameter (now from dropdown)
    if (country) {
      params.countryId = country;
    }
    
    // Add location as separate parameter
    if (location) {
      params.location = location;
    }
    
    await triggerSearch(params);
  }, [searchParams, triggerSearch, showToast, indiaCountryId, pageSize]);

  // Handle page change
  const handlePageChange = React.useCallback((newPage: number) => {
    handleSearch(newPage);
  }, [handleSearch]);

  // Calculate total pages
  const totalPages = Math.ceil(totalResults / pageSize);

  const handleViewProfile = (id: string | number) => {
    navigate(`/viewprofile/${String(id)}`, { state: { from: 'add-connection' } });
  };

  // Check if any search field has a value
  const hasSearchTerm = React.useMemo(() => {
    return Object.values(searchParams).some(val => 
      val !== undefined && val !== null && String(val).trim() !== ''
    );
  }, [searchParams]);

  // Check if search is allowed - always allow search, but prefer India country ID for empty searches
  const canSearch = React.useMemo(() => {
    // Always allow search - if no terms, we'll use India country ID when available
    return true;
  }, []);

  // Handle input change for all search fields
  const handleInputChange = React.useCallback((field: keyof typeof searchParams, value: string | React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>) => {
    const finalValue = typeof value === 'string' ? value : value.target.value;
    setSearchParams(prev => ({
      ...prev,
      [field]: finalValue
    }));
  }, []);

  // Handle form submission
  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(1); // Reset to page 1 on new search
  }, [handleSearch]);

  // Auto-run initial search once when India country ID is known,
  // reusing the same handleSearch logic used by the Search button.
  // This keeps behaviour identical to "click Search with empty fields"
  // but happens automatically on first load.
  React.useEffect(() => {
    if (!hasSearched && indiaCountryId) {
      void handleSearch(1);
    }
  }, [hasSearched, indiaCountryId, handleSearch]);

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Business", onClick: () => navigate("/dashboard") },
            { label: "Connections", onClick: () => navigate("/business/connections") },
            { label: "Add Connection" },
          ]}
        />

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-6 w-full relative z-30">
          <div className="flex flex-wrap gap-2 pb-2 pl-4">
            {/* First Name */}
            <div className="flex-shrink-0 w-40">
              <FormInput
                label="First Name"
                type="text"
                placeholder="Enter first name"
                value={searchParams.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full h-10 pl-4 pr-3 text-sm bg-[#0D1117] border border-gray-700 rounded-base text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            
            {/* Last Name */}
            <div className="flex-shrink-0 w-40">
              <FormInput
                label="Last Name"
                type="text"
                placeholder="Enter last name"
                value={searchParams.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full h-10 pl-4 pr-3 text-sm bg-[#0D1117] border border-gray-700 rounded-base text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            
            {/* Country Dropdown */}
            <div className="flex-shrink-0 w-48">
              <FormSelect
                label="Country"
                value={searchParams.country}
                onChange={(value) => handleInputChange('country', value || '')}
                placeholder="Select Country"
                options={countriesResponse?.data?.map((country: any) => ({
                  value: country.id,
                  label: country.name
                })) || []}
                className="w-full"
                zIndex="z-[99999]"
                openDirection="down"
                searchable={true}
                searchPlaceholder="Search countries..."
              />
            </div>
            
            {/* Location */}
            <div className="flex-shrink-0 w-40">
              <FormInput
                label="Location"
                type="text"
                placeholder="Enter Location"
                value={searchParams.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full h-10 pl-4 pr-3 text-sm bg-[#0D1117] border border-gray-700 rounded-base text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            
                        
            {/* Keywords */}
            <div className="flex-shrink-0 w-40">
              <FormInput
                label="Keywords"
                type="text"
                placeholder="Enter Keywords"
                value={searchParams.keywords}
                onChange={(e) => handleInputChange('keywords', e.target.value)}
                className="w-full h-10 pl-4 pr-3 text-sm bg-[#0D1117] border border-gray-700 rounded-base text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            
            {/* Search Button */}
            <div className="flex-shrink-0 flex items-center h-[72px] pt-[12px]">
              <button
                type="submit"
                title={!hasSearchTerm && !indiaCountryId ? "Loading countries..." : !hasSearchTerm && indiaCountryId ? "Click to show all users from India" : hasSearchTerm ? "Search with your filters" : "Select a country or enter search terms"}
                className="h-10 px-6 bg-[#D85D27] hover:bg-[#C24F20] text-white text-sm font-medium rounded-sm transition-colors flex items-center justify-center space-x-2 min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isFetching || !canSearch}
              >
                {isFetching ? (
                  <div className="flex items-center">
                    <svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </div>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 14L10.5355 10.5355M12.5 7C12.5 10.0376 10.0376 12.5 7 12.5C3.96243 12.5 1.5 10.0376 1.5 7C1.5 3.96243 3.96243 1.5 7 1.5C10.0376 1.5 12.5 3.96243 12.5 7Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Initial Illustration */}
        {!hasSearched && (
          <div className="py-12 relative z-0">
            <h3 className="text-center text-white text-lg mb-6">Search Our Directory</h3>
            <img
              src={searchDirectory}
              alt="Search our directory"
              className="mx-auto max-w-md w-full opacity-90"
            />
          </div>
        )}

        {/* Connections Grid */}
        {hasSearched && results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((connection, idx) => {
              const anyConn = connection as any;
              const userId = mapToUserId(anyConn, idx);
              const name = anyConn?.name || anyConn?.user?.name || `User ${idx+1}`;
              // Normalize headline using professional categories
              const rawHeadline = anyConn?.headline || anyConn?.user?.headline || anyConn?.role || '';
              const title = getCategoryLabel(professionalCategoryOptions, rawHeadline);
              // Use company from API, fallback to chapter name
              const rawCompany = anyConn?.company || anyConn?.user?.company || '';
              const rawChapter = anyConn?.chapter || anyConn?.user?.chapter || '';
              const company = rawCompany || getCategoryLabel(chapterOptions, rawChapter);
              const avatarUrl = anyConn?.avatarUrl || anyConn?.user?.avatarUrl;
              const status = toStatus(anyConn?.connection);
              const note = anyConn?.connection?.reason as string | undefined;
              const connectDisabled = anyConn?.connection?.actionAllowed === false;
              return (
                <ConnectionCard
                  key={userId || idx}
                  id={userId}
                  name={name}
                  title={title}
                  company={company}
                  avatarUrl={avatarUrl}
                  status={status}
                  note={note}
                  connectDisabled={connectDisabled}
                  onConnect={() => handleConnect(userId, anyConn)}
                  onViewProfile={handleViewProfile}
                />
              );
            })}
          </div>
        )}

        {/* Empty State after search */}
        {hasSearched && !isFetching && results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No users found</p>
          </div>
        )}

        {/* Pagination */}
        {hasSearched && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 mb-4">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isFetching}
              className="px-4 py-2 bg-[#1C2128] border border-gray-700 rounded-lg text-white text-sm font-medium hover:bg-[#2D333B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isFetching}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#D85D27] text-white'
                        : 'bg-[#1C2128] border border-gray-700 text-white hover:bg-[#2D333B]'
                    } disabled:opacity-50`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isFetching}
              className="px-4 py-2 bg-[#1C2128] border border-gray-700 rounded-lg text-white text-sm font-medium hover:bg-[#2D333B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>

            {/* Results Info */}
            <span className="ml-4 text-gray-400 text-sm">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalResults)} of {totalResults}
            </span>
          </div>
        )}
      </main>
    </div>
  );
}