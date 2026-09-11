
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  useGetSocialEventQuery, 
  useUpdateSocialEventMutation, 
  usePresignEventImageMutation,
  useGetSocialRegionalBoardQuery 
} from "../../../services/social";
import { SocialLayout } from "../../../components/social";
import { PageHeader } from "../../../components/common";
import DatePicker from "../../../components/common/DatePicker";
import { FormSelect, FormInput } from "../../../components/forms";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import GradientContainer from "../../../components/common/GradientContainer";
import { useListCountriesQuery, useListRegionsQuery } from "../../../services/publicApi";
import { useToast } from "../../../components/toast/ToastProvider";

const categoryOptions = [
  { value: "", label: "Select category" },
  { value: "charity-goals", label: "Charity Goals" },
  { value: "awareness-campaigns", label: "Awareness campaigns" },
  { value: "conferences", label: "Conferences" },
  { value: "trade-shows", label: "Trade shows" },
  { value: "seminars", label: "Seminars" },
  { value: "award-ceremonies", label: "Award ceremonies" },
  { value: "corporate-retreats", label: "Corporate retreats" },
  { value: "networking-events", label: "Networking events" },
  { value: "anniversaries", label: "Anniversaries" },
  { value: "reunions", label: "Reunions" },
];

const categoryEnumMap: Record<string, string> = {
  "charity-goals": "CHARITY",
  "awareness-campaigns": "AWARENESS",
  conferences: "CONFERENCE",
  "trade-shows": "TRADE_SHOW",
  seminars: "SEMINAR",
  "award-ceremonies": "AWARD",
  "corporate-retreats": "CORPORATE",
  "networking-events": "NETWORKING",
  anniversaries: "ANNIVERSARY",
  reunions: "REUNION",
};

const categoryValueByEnum: Record<string, string> = {
  CHARITY: "charity-goals",
  AWARENESS: "awareness-campaigns",
  CONFERENCE: "conferences",
  TRADE_SHOW: "trade-shows",
  SEMINAR: "seminars",
  AWARD: "award-ceremonies",
  CORPORATE: "corporate-retreats",
  NETWORKING: "networking-events",
  ANNIVERSARY: "anniversaries",
  REUNION: "reunions",
};

function normalizeCategoryValue(rawCategory?: string | null, rawCategoryLabel?: string | null) {
  if (rawCategoryLabel) {
    const match = categoryOptions.find(
      (option) => option.label.toLowerCase() === rawCategoryLabel.toLowerCase(),
    );
    if (match) return match.value;
    if (rawCategoryLabel.toLowerCase() === "charity galas" || rawCategoryLabel.toLowerCase() === "charity golas") {
      return "charity-goals";
    }
  }
  if (rawCategory) {
    if (rawCategory === "charity-galas" || rawCategory === "charity-golas") return "charity-goals";
    return categoryValueByEnum[rawCategory] || "";
  }
  return "";
}

export default function SocialAdminEditEvent() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  
  // API call to get event data
  const { data: eventApiResponse, isLoading: apiLoading } = useGetSocialEventQuery(id || "");
  
  // API mutations for updating event
  const [updateSocialEvent, { isLoading: isUpdating }] = useUpdateSocialEventMutation();
  const [presignEventImage] = usePresignEventImageMutation();

  // Fetch data
  const { data: countriesRes } = useListCountriesQuery();
  const { data: regionsRes } = useListRegionsQuery();
  const { data: chaptersRes } = useGetSocialRegionalBoardQuery({ limit: 100 });
  // Get data from APIs
  const countries = countriesRes?.data || [];
  const regions = regionsRes?.data || [];
  const chapters = chaptersRes?.data?.items || [];

  const filteredCountries = useMemo(() => countries, [countries]);
  const filteredRegions = useMemo(() => regions, [regions]);
  const filteredChapters = useMemo(() => chapters, [chapters]);

  // Form state
  const [title, setTitle] = useState("");
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("");
  const [eventType, setEventType] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [category, setCategory] = useState("");
  const [costForMember, setCostForMember] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState("");
  const [eventPhoto, setEventPhoto] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const countryOptionsForSelect = useMemo(
    () => filteredCountries.map((c) => ({ label: c.name, value: c.id })),
    [filteredCountries]
  );

  const regionOptions = useMemo(() => {
    if (!selectedCountry) {
      return filteredRegions.map((r) => ({ label: r.name, value: r.id }));
    }
    return filteredRegions
      .filter((r) => r.countryId === selectedCountry)
      .map((r) => ({ label: r.name, value: r.id }));
  }, [filteredRegions, selectedCountry]);

  const chapterOptions = useMemo(() => {
    if (!selectedRegion) {
      return filteredChapters.map((c) => ({ label: c.name, value: c.id }));
    }
    return filteredChapters
      .filter((c) => c.regionId === selectedRegion)
      .map((c) => ({ label: c.name, value: c.id }));
  }, [filteredChapters, selectedRegion]);

  const timeOptions = [
    { value: "", label: "Select time" },
    { value: "09:00", label: "09:00" },
    { value: "09:30", label: "09:30" },
    { value: "10:00", label: "10:00" },
    { value: "10:30", label: "10:30" },
    { value: "11:00", label: "11:00" },
    { value: "11:30", label: "11:30" },
    { value: "12:00", label: "12:00" },
    { value: "12:30", label: "12:30" },
    { value: "13:00", label: "13:00" },
    { value: "13:30", label: "13:30" },
    { value: "14:00", label: "14:00" },
    { value: "14:30", label: "14:30" },
    { value: "15:00", label: "15:00" },
    { value: "15:30", label: "15:30" },
    { value: "16:00", label: "16:00" },
    { value: "16:30", label: "16:30" },
    { value: "17:00", label: "17:00" },
    { value: "17:30", label: "17:30" },
    { value: "18:00", label: "18:00" },
    { value: "18:30", label: "18:30" },
    { value: "19:00", label: "19:00" },
    { value: "19:30", label: "19:30" },
    { value: "20:00", label: "20:00" },
    { value: "20:30", label: "20:30" },
    { value: "21:00", label: "21:00" },
    { value: "21:30", label: "21:30" },
    { value: "22:00", label: "22:00" },
  ];

  const eventTypeOptions = [
    { value: "", label: "Select event type" },
    { value: "DONATION", label: "Donation" },
    { value: "FUNDRAISER", label: "Fundraiser" },
    { value: "MEETING", label: "Meeting" },
    { value: "OTHER", label: "Other" },
  ];

  // Load event data from API
  useEffect(() => {
    const loadEventData = () => {
      try {
        // Get event data from API response
        const eventData = eventApiResponse?.data;
        console.log("API response event data:", eventData);
        
        if (eventData) {
          setTitle(eventData.title || "");
          setDescription(eventData.description || "");
          setCategory(normalizeCategoryValue(eventData.category, eventData.categoryLabel));
          setLink(eventData.link || "");
          setContactPerson(eventData.contactPerson || "");
          setCostForMember(String(eventData.costForMembers || 0));
          setMaxAttendees(String(eventData.maxAttendees || ""));
          
          // Parse dates from API format
          if (eventData.startsAt) {
            const startDateTime = new Date(eventData.startsAt);
            const startDate = startDateTime.toISOString().split('T')[0];
            console.log("Parsed start date:", startDate);
            setStartDate(startDate);
          }
          if (eventData.endsAt) {
            const endDateTime = new Date(eventData.endsAt);
            const endDate = endDateTime.toISOString().split('T')[0];
            console.log("Parsed end date:", endDate);
            setEndDate(endDate);
          }
          
          // Parse times from API format (handle UTC to local time)
          if (eventData.startsAt) {
            const startTime = new Date(eventData.startsAt);
            const hours = startTime.getUTCHours().toString().padStart(2, '0');
            const minutes = startTime.getUTCMinutes().toString().padStart(2, '0');
            const formattedStartTime = `${hours}:${minutes}`;
            console.log("Parsed start time:", formattedStartTime);
            setStartTime(formattedStartTime);
          }
          if (eventData.endsAt) {
            const endTime = new Date(eventData.endsAt);
            const hours = endTime.getUTCHours().toString().padStart(2, '0');
            const minutes = endTime.getUTCMinutes().toString().padStart(2, '0');
            const formattedEndTime = `${hours}:${minutes}`;
            console.log("Parsed end time:", formattedEndTime);
            setEndTime(formattedEndTime);
          }
          
          // Set event type based on eventType
          setEventType(eventData.eventType || "");
          
          // Set chapter name from socialChapter
          setChapterName(eventData.socialChapter?.id|| "");
          setSelectedCountry(eventData.country?.id || "");
          setSelectedRegion(eventData.region?.id || "");
          // Set existing image URL if available
          setImageUrl(eventData.imageUrl || null);
          
        }
        
        // setIsLoading(false); // Using API loading state instead
      } catch (error) {
        console.error("Error loading event:", error);
        // setIsLoading(false); // Using API loading state instead
      }
    };

    if (id && !apiLoading) {
      loadEventData();
    }
  }, [id, eventApiResponse, apiLoading]);

  const handleCountryChange = (countryId: string) => {
    setSelectedCountry(countryId);
    if (selectedRegion) {
      const regionBelongsToCountry = filteredRegions.some(
        (r) => r.id === selectedRegion && r.countryId === countryId
      );
      if (!regionBelongsToCountry) {
        setSelectedRegion("");
        setChapterName("");
      }
    }
  };
  
  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    if (chapterName) {
      const chapterBelongsToRegion = filteredChapters.some(
        (ch) => ch.id === chapterName && ch.regionId === regionId
      );
      if (!chapterBelongsToRegion) {
        setChapterName("");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    
    // Check file type
    if (!validTypes.includes(file.type)) {
      showToast({
        kind: "error",
        title: "Invalid image format",
        description: "Only JPG, JPEG, and PNG files are allowed.",
      });
      e.target.value = '';
      return;
    }
    
    // Check file size
    if (file.size > maxSize) {
      showToast({
        kind: "error",
        title: "Image too large",
        description: "File size must be less than 5MB.",
      });
      e.target.value = '';
      return;
    }
    
    // Just store the file, don't upload immediately
    setEventPhoto(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Get pre-signed URL from backend
      const presignResult = await presignEventImage({
        fileName: file.name,
        contentType: file.type,
      }).unwrap();
      
      if (presignResult.success) {
        // Upload file directly to S3 using pre-signed URL
        const response = await fetch(presignResult.data.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });
        
        if (response.ok) {
          return presignResult.data.url;
        } else {
          throw new Error('Failed to upload image');
        }
      }
      return null;
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast({
        kind: "error",
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
      });
      return null;
    }
  };

  const handleSubmit = async () => {
    try {
      // Upload image first if selected
      let uploadedImageUrl: string | null = null;
      if (eventPhoto) {
        setIsUploading(true);
        uploadedImageUrl = await uploadImage(eventPhoto);
        if (!uploadedImageUrl) {
          setIsUploading(false);
          return; // Stop if upload failed
        }
      }

      const selectedCategoryOption = categoryOptions.find((option) => option.value === category);

      const eventData = {
        title,
        description,
        startDate,
        startTime: startTime || '00:00',
        endDate,
        endTime: endTime || '23:59',
        tz: 'UTC',
        socialChapterId: chapterName,
        regionId: selectedRegion,
        eventType: (eventType || '').toUpperCase(),
        category: category ? categoryEnumMap[category] : undefined,
        categoryLabel: selectedCategoryOption?.label || undefined,
        contactPerson,
        costForMembers: Number(costForMember) || 0,
        maxAttendees: Number(maxAttendees) || 0,
        link,
        mode: 'IN_PERSON' as const,
        imageUrl: uploadedImageUrl || imageUrl || undefined,
      };
      
      const result = await updateSocialEvent({ id: id!, ...eventData }).unwrap();
      
      if (result.success) {
        showToast({
          kind: "success",
          title: "Event updated",
          description: "The social event was updated successfully.",
        });
        navigate("/social/admin/my-events");
      } else {
        console.error("Failed to update event");
      }
    } catch (error: any) {
      console.error("Error updating event:", error);
      const apiError =
        error?.data?.errors?.[0]?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to update event. Please try again.";
      showToast({
        kind: "error",
        title: "Update failed",
        description: String(apiError),
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    navigate("/social/admin/my-events");
  };

  const breadcrumbs = [
    { label: "My Events", onClick: () => navigate("/social/admin/my-events") },
    { label: "Edit Event" }
  ];

  if (apiLoading) {
    return (
      <SocialLayout>
        <main className="container mx-auto px-4 py-6 md:py-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </SocialLayout>
    );
  }

  return (
    <SocialLayout>
    <main className="container mx-auto px-4 py-6 md:py-8">
      <PageHeader breadcrumbs={breadcrumbs} />

      {/* Form Container */}
      <GradientContainer className="p-6">
        <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Row 1: Title, Start Date, Start Time */}
          <div>
            <FormInput
              label="Title"
              placeholder="Enter title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Start Date</label>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              iconSrc={CalendarIcon}
              placeholder="12/09/2025"
            />
          </div>
          <div>
            <FormSelect
              label="Start Time"
              options={timeOptions}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          {/* Row 2: End Date, End Time, Event Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">End Date</label>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              iconSrc={CalendarIcon}
              placeholder="12/09/2025"
            />
          </div>
          <div>
            <FormSelect
              label="End Time"
              options={timeOptions}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
          <div>
            <FormSelect
              label="Event Type"
              options={eventTypeOptions}
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            />
          </div>

          {/* Row 3: Country, Region, Chapter Name */}
          <div>
            <FormSelect
              label="Country"
              options={[{ value: "", label: "Select Country" }, ...countryOptionsForSelect]}
              placeholder="Select Country"
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
            />
          </div>
          <div>
            <FormSelect
              label="Region"
              options={[{ value: "", label: "Select Region" }, ...regionOptions]}
              placeholder="Select Region"
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value)}
            />
          </div>
          <div>
            <FormSelect
              label="Chapter Name"
              options={[{ value: "", label: "Select chapter name" }, ...chapterOptions]}
              placeholder="Select chapter name"
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
            />
          </div>

          {/* Row 4: Category, Upload Event Photo, Cost for Member */}
          <div>
            <FormSelect
              label="Category"
              options={categoryOptions}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Upload Event Photo <span className="text-gray-500">(Max 5MB, JPG/JPEG/PNG only)</span>
            </label>
            
            <div className="relative">
              <input 
                type="file" 
                accept="image/jpeg,image/jpg,image/png" 
                onChange={handleFileChange} 
                className="hidden" 
                id="eventPhoto" 
                disabled={isUploading}
              />
              <div className="flex items-stretch h-11">
                <div
                  className={`flex-1 flex items-center justify-between bg-[#21272D] border ${
                    isUploading ? "border-orange-500" : "border-gray-700"
                  } rounded px-3 text-gray-300 cursor-pointer hover:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={() => {
                    if (!isUploading) {
                      document.getElementById('eventPhoto')?.click();
                    }
                  }}
                >
                  <span className="truncate max-w-[180px] text-sm">
                    {eventPhoto ? eventPhoto.name : imageUrl ? 'Image uploaded' : "Choose File"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isUploading) {
                          document.getElementById('eventPhoto')?.click();
                        }
                      }}
                      className={`text-xs px-2 py-1 rounded whitespace-nowrap transition-colors ${
                        (eventPhoto || imageUrl) && !isUploading
                          ? 'text-gray-300 bg-gray-700/50 hover:bg-gray-600/50 cursor-pointer' 
                          : 'text-gray-300 bg-gray-700/50 cursor-default'
                      }`}
                      title={(eventPhoto || imageUrl) && !isUploading ? "Change file" : ""}
                      disabled={isUploading}
                    >
                      {(eventPhoto || imageUrl) ? "Change" : "No File Chosen"}
                    </button>
                    {(eventPhoto || imageUrl) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEventPhoto(null);
                          setImageUrl(null);
                          const fileInput = document.getElementById('eventPhoto') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                        className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium transition-colors"
                        title="Remove photo"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {isUploading && (
                <p className="text-xs text-orange-400 mt-1">Uploading image and updating event...</p>
              )}
            </div>
          </div>
          <div>
            <FormInput
              label="Cost for Member"
              placeholder="Enter cost"
              value={costForMember}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => setCostForMember(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>

          {/* Row 5: Max no. of Attendees, Contact Person, Link */}
          <div>
            <FormInput
              label="Max. no. of Attendees"
              placeholder="Enter number of attendees"
              value={maxAttendees}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(e) => setMaxAttendees(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>
          <div>
            <FormInput
              label="Contact Person"
              placeholder="Enter person name"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>
          <div>
            <FormInput
              label="Link"
              placeholder="Enter link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

        
        </div>

        {/* Description (full width) */}
        <div className="mt-4">
          <label className="block text-xs text-gray-400 mb-1.5">Description</label>
          <textarea
            placeholder="Enter Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 bg-[#1a2332] border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D85D27] resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isUpdating || isUploading}
            className="px-8 py-2.5 bg-[#D85D27] hover:bg-[#C24F20] disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isUpdating || isUploading ? (isUpdating ? "Updating..." : "Uploading Image...") : "Update"}
          </button>
          <button
            onClick={handleCancel}
            className="px-8 py-2.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
        </div>
      </GradientContainer>
      </main>
    </SocialLayout>
  );
}
