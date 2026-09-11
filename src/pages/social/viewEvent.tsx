import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { SocialLayout } from "../../components/social";
import DataTable from "../../components/common/DataTable";
import { StatCard } from "../../components/dashboard";
import GradientContainer from "../../components/common/GradientContainer";
import { useGetSocialEventMembersQuery, useGetSocialEventQuery, useGetSocialVolunteersQuery } from "../../services/social";
import { useListSocialChaptersQuery } from "../../services/publicApi";

export default function ViewEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: eventId } = useParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<"members" | "volunteers">("members");
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const [volunteerPage, setVolunteerPage] = useState(1);
  const [memberPage, setMemberPage] = useState(1);
  const volunteerLimit = 10;
  const memberLimit = 10;

  /* ---------- AUTH CHECK ---------- */
  useEffect(() => {
    if (!localStorage.getItem("accessToken")) {
      navigate("/login");
    }
  }, [navigate]);

  /* ---------- API: FETCH EVENT DETAILS ---------- */
  const { 
    data: eventResponse, 
    isLoading: eventLoading,
    error: eventError 
  } = useGetSocialEventQuery(eventId || "", {
    skip: !eventId,
  });

  /* ---------- API: FETCH VOLUNTEERS ---------- */
  const { 
    data: volunteersResponse, 
    isLoading: volunteersLoading,
    error: volunteersError,
    refetch: refetchVolunteers
  } = useGetSocialVolunteersQuery(
    {
      countryId: eventResponse?.data?.country?.id || eventResponse?.data?.countryId || "",
      regionId: eventResponse?.data?.region?.id || eventResponse?.data?.regionId,
      socialChapterId: eventResponse?.data?.socialChapter?.id || eventResponse?.data?.socialChapterId || eventResponse?.data?.chapterId,
      eventId: eventId || undefined,
      q: searchValues.name || undefined,
      page: volunteerPage,
      limit: volunteerLimit,
    },
    {
      skip: activeTab !== "volunteers" || !eventId || !(eventResponse?.data?.country?.id || eventResponse?.data?.countryId),
    }
  );

  /* ---------- API: FETCH CHAPTERS FOR LOOKUP ---------- */
  const { data: chaptersResponse } = useListSocialChaptersQuery(
    eventResponse?.data?.region?.id || eventResponse?.data?.regionId 
      ? { 
          regionId: eventResponse.data.region?.id || eventResponse.data.regionId,
          limit: 100 
        } 
      : undefined,
    { 
      skip: !eventResponse?.data?.region?.id && !eventResponse?.data?.regionId 
    }
  );

  // Create a chapter lookup map
  const chapterLookup = useMemo(() => {
    const map: Record<string, { name: string; area?: string }> = {};
    
    if (chaptersResponse?.data) {
      chaptersResponse.data.forEach((chapter: any) => {
        if (chapter.id) {
          map[chapter.id] = {
            name: chapter.name || "",
            area: chapter.area || "",
          };
        }
      });
    }
    
    console.log("Chapter lookup map:", map);
    return map;
  }, [chaptersResponse]);

  /* ---------- API: FETCH MEMBERS ---------- */
  const { 
    data: membersResponse, 
    isLoading: membersLoading,
    error: membersError 
  } = useGetSocialEventMembersQuery(
    {
      eventId: eventId || "",
      name: searchValues.name || undefined,
      area: searchValues.area || undefined,
      chapter: searchValues.chapter || undefined,
      page: memberPage,
      limit: memberLimit,
    },
    {
      skip: activeTab !== "members" || !eventId,
    }
  );

  /* ---------- REFETCH VOLUNTEERS WHEN RETURNING FROM ADD PAGE ---------- */
  useEffect(() => {
    const state = location.state as { from?: string; refresh?: boolean } | null;
    if ((state?.from === "add-volunteer" || state?.refresh) && activeTab === "volunteers") {
      refetchVolunteers();
      // Clear the state to prevent repeated refetches
      window.history.replaceState({}, document.title);
    }
  }, [location.state, activeTab, refetchVolunteers]);

  /* ---------- SEARCH HANDLER ---------- */
  const handleSearchChange = (key: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [key]: value }));
    // Reset to page 1 when searching
    if (activeTab === "volunteers") {
      setVolunteerPage(1);
    } else {
      setMemberPage(1);
    }
  };

  /* ---------- HELPER: EXTRACT STRING FROM VALUE ---------- */
  const extractString = (value: any): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toString();
    if (typeof value === "object") {
      // Handle objects with name property
      if (value.name) return value.name;
      if (value.title) return value.title;
      if (value.label) return value.label;
      return "";
    }
    return String(value);
  };

  /* ---------- HELPER: SAFE EXTRACT WITH FALLBACK ---------- */
  const safeExtract = (value: any, fallback: string = ""): string => {
    // If value is explicitly null or undefined, return fallback
    if (value === null || value === undefined) {
      return fallback;
    }
    // If value is empty string, return it (don't fallback to "N/A")
    if (value === "") {
      return "";
    }
    // Otherwise extract the string
    return extractString(value);
  };

  /* ---------- GET EVENT DETAILS ---------- */
  const eventDetails = useMemo(() => {
    if (!eventResponse?.success || !eventResponse?.data) return null;
    
    const event = eventResponse.data;
    return {
      id: extractString(event.id),
      eventName: extractString(event.title || event.eventName || ""),
      startDateTime: extractString(event.startsAt || event.startDateTime || ""),
      endDateTime: extractString(event.endsAt || event.endDateTime || ""),
      country: extractString(event.country?.name || event.countryName || event.country || ""),
      countryId: extractString(event.country?.id || event.countryId || ""),
      regionId: extractString(event.region?.id || event.regionId || ""),
      socialChapterId: extractString(event.socialChapter?.id || event.socialChapterId || event.chapterId || ""),
      location: extractString(event.location || event.venue || ""),
      contactPerson: extractString(event.contactPerson || ""),
      description: extractString(event.description || ""),
      imageUrl: extractString(event.imageUrl || ""),
      maxAttendees: typeof event.maxAttendees === 'number' ? event.maxAttendees : 0,
      numberOfRegistrations: typeof event.numberOfRegistrations === 'number' 
        ? event.numberOfRegistrations 
        : (typeof event.joinedCount === 'number' ? event.joinedCount : 0),
      costForMembers: event.costForMembers !== undefined ? 
        (typeof event.costForMembers === 'number' ? `₹${event.costForMembers}` : extractString(event.costForMembers)) 
        : undefined,
      costForNonMembers: event.costForNonMembers !== undefined ? 
        (typeof event.costForNonMembers === 'number' ? `₹${event.costForNonMembers}` : extractString(event.costForNonMembers)) 
        : undefined,
      stats: event.stats,
      totalDonations: extractString(event.totalDonations || ""),
    };
  }, [eventResponse]);

  // Get stats from event details or calculate from available data
  const stats = useMemo(() => {
    const defaultStats = {
      totalMembers: 0,
      totalAttendees: 0,
      totalVolunteers: 0,
      fundsDonated: "₹0",
    };

    if (!eventDetails) return defaultStats;

    if (eventDetails.stats) {
      return {
        totalMembers: typeof eventDetails.stats.totalMembers === 'number' ? eventDetails.stats.totalMembers : 0,
        totalAttendees: typeof eventDetails.stats.totalAttendees === 'number' 
          ? eventDetails.stats.totalAttendees 
          : eventDetails.numberOfRegistrations,
        totalVolunteers: typeof eventDetails.stats.totalVolunteers === 'number' 
          ? eventDetails.stats.totalVolunteers 
          : (volunteersResponse?.data?.total || 0),
        fundsDonated: extractString(eventDetails.stats.fundsDonated || "₹0"),
      };
    }
    
    return {
      totalMembers: membersResponse?.data?.total || 0,
      totalAttendees: eventDetails.numberOfRegistrations,
      totalVolunteers: volunteersResponse?.data?.total || 0,
      fundsDonated: extractString(eventDetails.totalDonations || "₹0"),
    };
  }, [eventDetails, membersResponse, volunteersResponse]);

  // Format volunteers data - FIXED VERSION WITH EXTENSIVE DEBUGGING AND CHAPTER LOOKUP
  const volunteersData = useMemo(() => {
    console.log("=== RAW VOLUNTEERS RESPONSE ===");
    console.log(JSON.stringify(volunteersResponse, null, 2));
    
    if (!volunteersResponse?.data?.items) {
      console.log("No volunteers data items found");
      return [];
    }
    
    const volunteers = volunteersResponse.data.items;
    
    if (!Array.isArray(volunteers)) {
      console.warn("Volunteers data is not an array:", volunteers);
      return [];
    }
    
    console.log(`Processing ${volunteers.length} volunteers`);
    console.log("Chapter lookup available:", Object.keys(chapterLookup).length > 0);
    
    return volunteers.map((v: any, index: number) => {
      console.log(`\n=== VOLUNTEER ${index + 1} RAW DATA ===`);
      console.log(JSON.stringify(v, null, 2));
      
      // Extract name
      const name = safeExtract(
        v.name || v.fullName || `${v.firstName || ""} ${v.lastName || ""}`.trim()
      );
      console.log("Extracted name:", name);
      
      // Extract email - show actual value or N/A
      const email = v.email && v.email.trim() !== "" 
        ? extractString(v.email) 
        : "N/A";
      console.log("Extracted email:", email);
      
      // Extract phone - show actual value or N/A
      const phone = v.phone && v.phone.trim() !== ""
        ? extractString(v.phone)
        : (v.phoneNumber && v.phoneNumber.trim() !== ""
          ? extractString(v.phoneNumber)
          : (v.contactNumber && v.contactNumber.trim() !== ""
            ? extractString(v.contactNumber)
            : "N/A"));
      console.log("Extracted phone:", phone);
      
      // Extract referredBy - FIXED: Show actual value or empty string
      let referredBy = "";
      console.log("Checking referredBy field:", v.referredBy);
      console.log("Checking referredByName field:", v.referredByName);
      
      if (v.referredBy && typeof v.referredBy === 'string' && v.referredBy.trim() !== "") {
        referredBy = v.referredBy.trim();
      } else if (v.referredByName && typeof v.referredByName === 'string' && v.referredByName.trim() !== "") {
        referredBy = v.referredByName.trim();
      } else if (v.referred_by && typeof v.referred_by === 'string' && v.referred_by.trim() !== "") {
        referredBy = v.referred_by.trim();
      }
      console.log("Final referredBy:", referredBy || "(empty)");
      
      // Extract chapter name - FIXED: Use chapter lookup if only ID is available
      let chapter = "";
      let chapterIdForLookup = "";
      console.log("Checking socialChapter:", v.socialChapter);
      console.log("Checking chapterName:", v.chapterName);
      console.log("Checking chapter:", v.chapter);
      console.log("Checking socialChapterId:", v.socialChapterId);
      
      // Try socialChapter.name first (most likely location based on API structure)
      if (v.socialChapter && v.socialChapter.name && v.socialChapter.name.trim() !== "") {
        chapter = v.socialChapter.name.trim();
        console.log("Found chapter in socialChapter.name");
      } 
      // Try chapterName
      else if (v.chapterName && typeof v.chapterName === 'string' && v.chapterName.trim() !== "") {
        chapter = v.chapterName.trim();
        console.log("Found chapter in chapterName");
      }
      // Try chapter.name
      else if (v.chapter && typeof v.chapter === 'object' && v.chapter.name && v.chapter.name.trim() !== "") {
        chapter = v.chapter.name.trim();
        console.log("Found chapter in chapter.name");
      }
      // Try chapter as string
      else if (v.chapter && typeof v.chapter === 'string' && v.chapter.trim() !== "") {
        chapter = v.chapter.trim();
        console.log("Found chapter as string");
      }
      // FALLBACK: Use chapter lookup with socialChapterId
      else if (v.socialChapterId || v.chapterId) {
        chapterIdForLookup = v.socialChapterId || v.chapterId;
        console.log("Attempting chapter lookup with ID:", chapterIdForLookup);
        if (chapterLookup[chapterIdForLookup]) {
          chapter = chapterLookup[chapterIdForLookup].name;
          console.log("Found chapter via lookup:", chapter);
        } else {
          console.log("Chapter ID not found in lookup map");
        }
      }
      console.log("Final chapter:", chapter || "(empty)");
      
      // Extract area - FIXED: Use chapter lookup if not directly available
      let area = "";
      console.log("Checking area field:", v.area);
      console.log("Checking socialChapter.area:", v.socialChapter?.area);
      console.log("Checking chapter.area:", v.chapter?.area);
      
      // First check the volunteer's own area field
      if (v.area && typeof v.area === 'string' && v.area.trim() !== "") {
        area = v.area.trim();
        console.log("Found area in volunteer.area");
      }
      // Then try socialChapter.area
      else if (v.socialChapter && v.socialChapter.area && v.socialChapter.area.trim() !== "") {
        area = v.socialChapter.area.trim();
        console.log("Found area in socialChapter.area");
      }
      // Then try chapter.area
      else if (v.chapter && typeof v.chapter === 'object' && v.chapter.area && v.chapter.area.trim() !== "") {
        area = v.chapter.area.trim();
        console.log("Found area in chapter.area");
      }
      // FALLBACK: Use chapter lookup for area
      else if (chapterIdForLookup && chapterLookup[chapterIdForLookup]) {
        area = chapterLookup[chapterIdForLookup].area || "";
        console.log("Found area via chapter lookup:", area);
      }
      console.log("Final area:", area || "(empty)");
      
      const result = {
        id: extractString(v._id || v.id),
        name,
        email,
        phone,
        referredBy: referredBy || "", // Empty string if not provided
        chapter: chapter || "", // Empty string if not found
        area: area || "", // Empty string if not found
      };
      
      console.log("=== FINAL MAPPED DATA ===");
      console.log(JSON.stringify(result, null, 2));
      
      return result;
    });
  }, [volunteersResponse, chapterLookup]);

  // Format members data
  const membersData = useMemo(() => {
    if (!membersResponse?.data?.items) {
      return [];
    }
    
    const members = membersResponse.data.items;
    
    if (!Array.isArray(members)) {
      return [];
    }
    
    return members.map((m: any) => ({
      id: extractString(m.id || m.userId || m.registrationId || Math.random().toString()),
      name: extractString(m.name || m.userName || ""),
      attendance: extractString(m.attendance || m.status || m.checkInStatus || (m.checkInTime ? "Present" : "Registered")),
      phone: extractString(m.phone || m.phoneNumber || ""),
      chapter: extractString(m.chapterName || m.chapter || ""),
      voluntaryCount: typeof m.voluntaryCount === 'number' ? m.voluntaryCount : (typeof m.volunteeredCount === 'number' ? m.volunteeredCount : 0),
      fundsDonated: extractString(m.fundsDonated || m.donationAmount || "₹0"),
      area: extractString(m.area || m.location || ""),
    }));
  }, [membersResponse]);

  // Filter members based on search (client-side filtering for non-API searchable fields)
  const filteredMembers = useMemo(() => {
    if (!Array.isArray(membersData) || membersData.length === 0) {
      return membersData;
    }
    
    // Filter for fields not handled by API
    const clientSearchKeys = Object.keys(searchValues).filter(
      key => !['name', 'area', 'chapter'].includes(key)
    );
    
    if (clientSearchKeys.length === 0) {
      return membersData;
    }
    
    return membersData.filter((member) => {
      return clientSearchKeys.every((key) => {
        const value = searchValues[key];
        if (!value) return true;
        const fieldValue = member[key as keyof typeof member];
        return String(fieldValue).toLowerCase().includes(value.toLowerCase());
      });
    });
  }, [membersData, searchValues]);

  // Filter volunteers based on search (client-side filtering for non-API searchable fields)
  const filteredVolunteers = useMemo(() => {
    if (!Array.isArray(volunteersData) || volunteersData.length === 0) {
      return volunteersData;
    }
    
    // Filter for fields not handled by API (API handles 'q' for name search)
    const clientSearchKeys = Object.keys(searchValues).filter(
      key => key !== 'name'
    );
    
    if (clientSearchKeys.length === 0) {
      return volunteersData;
    }
    
    return volunteersData.filter((volunteer) => {
      return clientSearchKeys.every((key) => {
        const value = searchValues[key];
        if (!value) return true;
        const fieldValue = volunteer[key as keyof typeof volunteer];
        return String(fieldValue).toLowerCase().includes(value.toLowerCase());
      });
    });
  }, [volunteersData, searchValues]);

  // Format date for display
  const formatDateTime = (dateTime: string) => {
    if (!dateTime) return "";
    try {
      const date = new Date(dateTime);
      if (isNaN(date.getTime())) return dateTime;
      
      // Use UTC methods to match the display in SocialAdminAllEvents
      const day = String(date.getUTCDate()).padStart(2, "0");
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const year = date.getUTCFullYear();
      let hours = date.getUTCHours();
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const hh = String(hours).padStart(2, "0");
      
      return `${day}/${month}/${year} ${hh}:${minutes} ${ampm}`;
    } catch {
      return dateTime;
    }
  };

 

  /* ---------- LOADING STATE ---------- */
  if (eventLoading) {
    return (
      <SocialLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-400 text-lg">Loading event details...</div>
        </div>
      </SocialLayout>
    );
  }

  /* ---------- ERROR STATE ---------- */
  if (eventError || !eventDetails) {
    return (
      <SocialLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-red-400 text-lg mb-4">
            {eventError ? "Failed to load event details" : "Event not found"}
          </div>
          <button
            onClick={() => navigate("/social/events")}
            className="px-4 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg transition-colors"
          >
            Back to Events
          </button>
        </div>
      </SocialLayout>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <SocialLayout>
      {/* ================= STATS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <GradientContainer>
          <StatCard 
            title="Total Members" 
            value={stats.totalMembers.toString()} 
            icon="users" 
          />
        </GradientContainer>
        <GradientContainer>
          <StatCard 
            title="Total Attendees" 
            value={stats.totalAttendees.toString()} 
            icon="tick-calender" 
          />
        </GradientContainer>
        <GradientContainer>
          <StatCard 
            title="No. of Volunteers" 
            value={stats.totalVolunteers.toString()} 
            icon="funds-donated" 
          />
        </GradientContainer>
        <GradientContainer>
          <StatCard 
            title="Funds Donated" 
            value={stats.fundsDonated} 
            icon="funds-raised" 
          />
        </GradientContainer>
      </div>

      {/* ================= HERO ================= */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10">
          {/* Image */}
          <div className="w-full md:w-[400px] lg:w-[460px] h-[260px] md:h-[320px] rounded-[18px] overflow-hidden flex-shrink-0 bg-black/20">
            {eventDetails.imageUrl ? (
              <img
                src={eventDetails.imageUrl}
                alt={eventDetails.eventName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#2B2B2B] to-[#111722] flex items-center justify-center">
                <span className="text-white/70 text-sm font-medium uppercase tracking-wider">
                  No image available
                </span>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <h1 className="text-[28px] md:text-[40px] font-extrabold text-white">
                {eventDetails.eventName}
              </h1>
            </div>

            <div className="space-y-2 text-gray-300">
              {eventDetails.startDateTime && (
                <p className="font-medium">
                  {formatDateTime(eventDetails.startDateTime)}
                  {eventDetails.endDateTime && ` – ${formatDateTime(eventDetails.endDateTime)}`}
                </p>
              )}
              {(eventDetails.location || eventDetails.country) && (
                <p className="font-semibold">
                  {eventDetails.location && `${eventDetails.location}`}
                  {eventDetails.location && eventDetails.country && ", "}
                  {eventDetails.country}
                </p>
              )}
              {eventDetails.description && (
                <p className="leading-7">{eventDetails.description}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= TABS ================= */}
      <div className="mt-8 border-b border-gray-700">
        <nav className="flex space-x-8">
          {["members", "volunteers"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab as "members" | "volunteers");
                setSearchValues({});
                if (tab === "volunteers") {
                  setVolunteerPage(1);
                } else {
                  setMemberPage(1);
                }
              }}
              className={`py-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === tab
                  ? "border-[#D85D27] text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              {tab === "members" ? "Members" : "Volunteers"}
            </button>
          ))}
        </nav>
      </div>

      {/* ================= TAB CONTENT ================= */}
      <div className="mt-6">
        {activeTab === "members" && (
          <>
            {membersLoading && (
              <div className="p-8 text-gray-400 text-center">
                Loading members...
              </div>
            )}

            {membersError && (
              <div className="p-4 text-red-400 text-center">
                Error loading members. Please try again.
              </div>
            )}

            {!membersLoading && !membersError && (
              <DataTable
                columns={[
                  { key: "name", label: "Name", searchable: true },
                  { key: "attendance", label: "Attendance", searchable: true },
                  { key: "phone", label: "Phone", searchable: true },
                  { key: "chapter", label: "Chapter Name", searchable: true },
                  { key: "voluntaryCount", label: "No of Voluntary" },
                  { key: "fundsDonated", label: "Funds Donated" },
                  { key: "area", label: "Area", searchable: true },
                ]}
                data={filteredMembers}
                searchValues={searchValues}
                onSearchChange={handleSearchChange}
                total={membersResponse?.data?.total || filteredMembers.length}
                page={memberPage}
                pageSize={memberLimit}
                onPageChange={setMemberPage}
              />
            )}

            {!membersLoading && !membersError && filteredMembers.length === 0 && (
              <div className="p-8 text-gray-400 text-center">
                No members found for this event.
              </div>
            )}
          </>
        )}

        {activeTab === "volunteers" && (
          <>
           

            {volunteersLoading && (
              <div className="p-8 text-gray-400 text-center">
                Loading volunteers...
              </div>
            )}

            {volunteersError && (
              <div className="p-4 text-red-400 text-center">
                Error loading volunteers. Please try again.
              </div>
            )}

            {!volunteersLoading && !volunteersError && (
              <DataTable
                columns={[
                  { key: "name", label: "Name", searchable: true },
                  { key: "email", label: "Email", searchable: true },
                  { key: "phone", label: "Phone", searchable: true },
                  { key: "referredBy", label: "Referred By", searchable: true },
                  { key: "chapter", label: "Chapter Name", searchable: true },
                  { key: "area", label: "Area", searchable: true },
                ]}
                data={filteredVolunteers}
                searchValues={searchValues}
                onSearchChange={handleSearchChange}
                total={volunteersResponse?.data?.total || 0}
                page={volunteerPage}
                pageSize={volunteerLimit}
                onPageChange={setVolunteerPage}
              />
            )}

            {!volunteersLoading && !volunteersError && filteredVolunteers.length === 0 && (
              <div className="p-8 text-gray-400 text-center">
                No volunteers found for this event.
              </div>
            )}
          </>
        )}
      </div>
    </SocialLayout>
  );
}