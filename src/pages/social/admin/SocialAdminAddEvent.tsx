import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  useCreateSocialEventMutation, 
  usePresignEventImageMutation,
  useGetSocialRegionalBoardQuery 
} from "../../../services/social";
import { SocialLayout } from "../../../components/social";
import { PageHeader } from "../../../components/common";
import DatePicker from "../../../components/common/DatePicker";
import { FormSelect, FormInput, FormTextarea } from "../../../components/forms";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import GradientContainer from "../../../components/common/GradientContainer";
import { useAppSelector } from "../../../app/store";
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

export default function SocialAdminAddEvent() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const authUser = useAppSelector((s) => s.auth.user);
  const { showToast } = useToast();

  // API mutations for creating event
  const [createSocialEvent, { isLoading: isCreating }] = useCreateSocialEventMutation();
  const [presignEventImage] = usePresignEventImageMutation();

  const { data: chaptersRes } = useGetSocialRegionalBoardQuery({ limit: 100 });
  const chapters = chaptersRes?.data?.items || [];

  const assignedScope = useMemo(() => {
    const assignments = ((authUser as any)?.assignments || []) as Array<any>;
    const socialAssignment =
      assignments.find(
        (a) => a.role === "SOCIAL_CHAIRPERSON" && (a.scope?.country || a.scope?.region),
      ) ||
      assignments.find((a) => a.scope?.country || a.scope?.region) ||
      null;

    return {
      countryId: socialAssignment?.scope?.country || "",
      regionId: socialAssignment?.scope?.region || "",
    };
  }, [authUser]);

  // Form state
  const [title, setTitle] = useState("");
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("");
  const [eventType, setEventType] = useState("");
  const [chapterName, setChapterName] = useState("");
  const [category, setCategory] = useState("");
  const [costForMember, setCostForMember] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [link, setLink] = useState("");
  const [description, setDescription] = useState<string>("");
  const [eventPhoto, setEventPhoto] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const chapterOptions = useMemo(() => {
    return chapters
      .filter((ch) =>
        assignedScope.regionId ? String(ch.regionId || "") === String(assignedScope.regionId) : true,
      )
      .map((ch) => ({ label: ch.name, value: ch.id }));
  }, [assignedScope.regionId, chapters]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }
    
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    
    if (!validTypes.includes(file.type)) {
      showToast({
        kind: "error",
        title: "Invalid image format",
        description: "Only JPG, JPEG, and PNG files are allowed.",
      });
      e.target.value = '';
      return;
    }
    
    if (file.size > maxSize) {
      showToast({
        kind: "error",
        title: "Image too large",
        description: "File size must be less than 5MB.",
      });
      e.target.value = '';
      return;
    }
    
    setEventPhoto(file);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const presignResult = await presignEventImage({
        fileName: file.name,
        contentType: file.type,
      }).unwrap();
      
      if (presignResult.success) {
        const response = await fetch(presignResult.data.uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });
        
        if (response.ok) {
          const uploadedUrl = presignResult.data.url;
          setImageUrl(uploadedUrl); // Store the uploaded URL
          return uploadedUrl;
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
    // Validation
    if (!title || !startDate || !startTime || !chapterName) {
      showToast({
        kind: "error",
        title: "Required fields missing",
        description: "Please fill in Title, Start Date, Start Time, and Chapter Name.",
      });
      return;
    }

    if (!eventType) {
      showToast({
        kind: "error",
        title: "Event type required",
        description: "Please select the event type before submitting.",
      });
      return;
    }

    if (!category) {
      showToast({
        kind: "error",
        title: "Category required",
        description: "Please select the event category before submitting.",
      });
      return;
    }

    try {
      let uploadedImageUrl: string | null = null;
      if (eventPhoto) {
        setIsUploading(true);
        uploadedImageUrl = await uploadImage(eventPhoto);
        if (!uploadedImageUrl) {
          setIsUploading(false);
          return;
        }
      }
      const selectedCategoryOption = categoryOptions.find((option) => option.value === category);

      const eventData = {
        title,
        description: description || undefined,
        startDate,
        startTime: startTime || '00:00',
        endDate: endDate || undefined,
        endTime: endTime || undefined,
        tz: 'UTC',
        socialChapterId: chapterName,
        countryId: assignedScope.countryId || undefined,
        regionId: assignedScope.regionId || undefined,
        eventType: eventType || undefined,
        category: category ? categoryEnumMap[category] : undefined,
        categoryLabel: selectedCategoryOption?.label || undefined,
        contactPerson: contactPerson || undefined,
        costForMembers: costForMember ? Number(costForMember) : undefined,
        maxAttendees: maxAttendees ? Number(maxAttendees) : undefined,
        link: link || undefined,
        mode: 'IN_PERSON' as const,
        imageUrl: uploadedImageUrl || imageUrl || undefined,
      };
      
      const result = await createSocialEvent(eventData).unwrap();
      
      if (result.success) {
        showToast({
          kind: "success",
          title: "Event created",
          description: "The social event was created successfully.",
        });
        navigate("/social/admin/my-events");
      }
    } catch (error: any) {
      console.error("Error creating event:", error);
      const apiError =
        error?.data?.errors?.[0]?.message ||
        error?.data?.message ||
        error?.message ||
        "Failed to create event. Please try again.";
      showToast({
        kind: "error",
        title: "Create event failed",
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
    { label: "Add Events" }
  ];

  return (
    <SocialLayout>
      <main className="container mx-auto px-4 py-6 md:py-8">
        <PageHeader breadcrumbs={breadcrumbs} />

        <GradientContainer className="p-6">
          <div className="p-6">
            <h2 className="text-white text-xl font-semibold mb-6">Add Event</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Title */}
              <FormInput
                label="Title"
                placeholder="Enter title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                isRequired
              />

              {/* Start Date */}
              <div className="w-full">
                <label className="block text-xs text-gray-400 mb-1.5">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  iconSrc={CalendarIcon}
                  placeholder="12/08/2025"
                  minDate={today}
                />
              </div>

              {/* Start Time */}
              <FormSelect
                label="Start Time"
                options={timeOptions}
                placeholder="06:30"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                isRequired
              />

              {/* End Date */}
              <div className="w-full">
                <label className="block text-xs text-gray-400 mb-1.5">
                  End Date
                </label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  iconSrc={CalendarIcon}
                  placeholder="12/08/2025"
                  minDate={startDate || today}
                />
              </div>

              {/* End Time */}
              <FormSelect
                label="End Time"
                options={timeOptions}
                placeholder="09:30"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />

              {/* Event Type */}
              <FormSelect
                label="Event Type"
                options={eventTypeOptions}
                placeholder="Select event type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                isRequired
              />

              {/* Chapter Name */}
              <FormSelect
                label="Chapter Name"
                options={[{ value: "", label: "Select chapter name" }, ...chapterOptions]}
                placeholder="Select chapter name"
                value={chapterName}
                onChange={(e) => setChapterName(e.target.value)}
                isRequired
              />

              {/* Category */}
              <FormSelect
                label="Category"
                options={categoryOptions}
                placeholder="Select category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                isRequired
              />

              {/* Contact Person */}
              <FormInput
                label="Contact Person"
                placeholder="Enter person name"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                isRequired
              />

              {/* Upload Event Photo */}
              <div className="w-full">
                <label className="block text-xs text-gray-400 mb-1.5">
                  Upload Event Photo
                </label>

                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="eventPhoto"
                  />

                  <label
                    htmlFor="eventPhoto"
                    className="flex items-center justify-between w-full rounded bg-[#21272D] border border-gray-700 px-3 py-2.5 pr-10 text-gray-500 cursor-pointer hover:border-orange-500 transition-colors"
                  >
                    <span className="truncate max-w-[calc(100%-3rem)]">
                      {eventPhoto ? eventPhoto.name : "Choose File"}
                    </span>

                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded shrink-0">
                      {eventPhoto ? "Change" : "No file chosen"}
                    </span>
                  </label>

                  {eventPhoto && (
                    <button
                      type="button"
                      onClick={() => {
                        setEventPhoto(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                      className="absolute top-1/2 right-2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Cost for Member */}
              <FormInput
                label="Cost for Member"
                placeholder="Enter cost"
                value={costForMember}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => setCostForMember(e.target.value.replace(/[^0-9]/g, ""))}
              />

              {/* Max no. of Attendees */}
              <FormInput
                label="Max. no. of Attendees"
                placeholder="Enter number of attendees"
                value={maxAttendees}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(e) => setMaxAttendees(e.target.value.replace(/[^0-9]/g, ""))}
              />

              {/* Link */}
              <FormInput
                label="Link"
                placeholder="Enter link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>

            {/* Description - Full width */}
            <div className="w-full mt-4">
              <FormTextarea
                label="Description"
                placeholder="Enter Description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleSubmit}
                disabled={isCreating || isUploading}
                className="bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-8 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreating || isUploading ? (isCreating ? "Creating..." : "Uploading Image...") : "Submit"}
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-8 py-2.5 text-sm font-medium transition-colors"
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
