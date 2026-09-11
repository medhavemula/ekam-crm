import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../../../app/store";
import Navbar from "../../../components/navigation/Navbar";
import GradientContainer from "../../../components/common/GradientContainer";
import DatePicker from "../../../components/common/DatePicker";
import CalendarIcon from "../../../assets/icons/calendar.svg";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import FormTextarea from "../../../components/forms/FormTextarea";
import URLInput from "../../../components/forms/URLInput";
import { validateUrl } from "../../../utils/urlValidation";
import { skipToken } from "@reduxjs/toolkit/query";
import {
  useCreateEdEventMutation,
  useGetEdEventQuery,
  useUpdateEdEventMutation,
} from "../../../services/ed/edEventsApi";
import {
  useCreateSaEventMutation,
  useGetSaEventQuery,
  useUpdateSaEventMutation,
} from "../../../services/admin/saEventsApi";
import { useRole } from "../../../hooks/useRole";

interface VenueData {
  address1: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

interface EventFormData {
  title: string;
  description: string;
  category: string;
  customCategory: string;
  type: string;
  mode: string;
  uploadPhoto: File | null;
  contactPerson: string;
  contactEmail: string;
  costForMembers: string;
  maxAttendees: string;
  startsAt: string;
  endsAt: string;
  location: string;
  link: string;
  visibility: string;
  venue: VenueData;
  date: string;
  time: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export default function CreateEventPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const authUser = useAppSelector((s) => s.auth.user);
  const { role, roles } = useRole() as any;
  const isSuperAdmin =
    role === "SUPER_ADMIN" ||
    role === "SUPER_ADMIN_TEAM" ||
    (Array.isArray(roles) && (roles.includes("SUPER_ADMIN") || roles.includes("SUPER_ADMIN_TEAM"))) ||
    Array.isArray((authUser as any)?.assignments) && (authUser as any).assignments.some((a: any) => a?.role === "SUPER_ADMIN" || a?.role === "SUPER_ADMIN_TEAM");

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    category: "",
    customCategory: "",
    type: "IN_PERSON",
    mode: "IN_PERSON",
    uploadPhoto: null,
    contactPerson: "",
    contactEmail: (authUser as any)?.email || "",
    costForMembers: "0",
    maxAttendees: "",
    startsAt: "",
    endsAt: "",
    location: "",
    link: "",
    visibility: "PUBLIC",
    venue: {
      address1: "",
      city: "",
      state: "",
      country: "",
      postcode: ""
    },
    date: "",
    time: "10:00",
    address: "",
    city: "",
    state: "",
    country: "",
    pincode: ""
  });
  const editEventId =
    (params?.id as string | undefined) ||
    ((location.state as any)?.editEventId as string | undefined);
  const isEditMode = Boolean(editEventId);

  const [createEdEvent, { isLoading: isCreatingEd }] = useCreateEdEventMutation();
  const [createSaEvent, { isLoading: isCreatingSa }] = useCreateSaEventMutation();
  const [updateEdEvent, { isLoading: isUpdatingEd }] = useUpdateEdEventMutation();
  const [updateSaEvent, { isLoading: isUpdatingSa }] = useUpdateSaEventMutation();

  const isSubmitting = isCreatingEd || isCreatingSa || isUpdatingEd || isUpdatingSa;

  const queryArg = isEditMode && editEventId ? editEventId : skipToken;
  const edQ = useGetEdEventQuery(queryArg as any, {
    skip: !(!isSuperAdmin && isEditMode && editEventId),
  });
  const saQ = useGetSaEventQuery(queryArg as any, {
    skip: !isSuperAdmin || !isEditMode || !editEventId,
  });
  const eventData = isSuperAdmin ? saQ.data : edQ.data;
  const eventRaw: any = eventData?.data;

  // Category options based on user role
  const edCategoryOptions = [
    { value: "", label: "Select category" },
    { value: "EXPO", label: "EXPO" },
    { value: "ANNIVERSARY", label: "Anniversary" },
    { value: "SUCCESS_MEET", label: "Success Meet" },
    { value: "TRAINING", label: "Training" },
    { value: "BUSINESS", label: "Business" },
    { value: "other", label: "Other" },
  ];

  const saCategoryOptions = [
    { value: "", label: "Select category" },
    { value: "WEEKLY_MEETING", label: "Weekly Meeting" },
    { value: "VISITORS_DAY", label: "Visitors Day" },
    { value: "ORIENTATION", label: "Orientation" },
    { value: "MSP", label: "MSP" },
    { value: "ADVANCED_MSP", label: "Advanced MSP" },
    { value: "LTT", label: "LTT" },
    { value: "WORKSHOP", label: "Workshop" },
    { value: "MIXER", label: "Mixer" },
    { value: "RECOGNITION", label: "Recognition" },
    { value: "CHARITY", label: "Charity" },
    { value: "CONFERENCE", label: "Conference" },
    { value: "EXPO", label: "EXPO" },
    { value: "SOCIAL", label: "Social" },
    { value: "OTHER", label: "Other" },
  ];

  const categoryOptions = isSuperAdmin ? saCategoryOptions : edCategoryOptions;

  // Type options based on user role
  const edTypeOptions = [
    { value: "", label: "Select Type" },
    { value: "ONLINE", label: "Online" },
    { value: "WEBINAR", label: "Webinar" },
    { value: "IN_PERSON", label: "In Person" },
    { value: "HYBRID", label: "Hybrid" },
  ];

  const saTypeOptions = [
    { value: "", label: "Select Type" },
    { value: "ONLINE", label: "Online" },
    { value: "IN_PERSON", label: "In Person" },
    { value: "HYBRID", label: "Hybrid" },
  ];

  const typeOptions = isSuperAdmin ? saTypeOptions : edTypeOptions;

  const timeOptions = (() => {
    const opts: { value: string; label: string }[] = [{ value: "", label: "Select time" }];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const v = `${hh}:${mm}`;
        opts.push({ value: v, label: v });
      }
    }
    return opts;
  })();

  const handleChange = (field: keyof EventFormData, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Prefill form in edit mode when event data is loaded
  useEffect(() => {
    if (!isEditMode || !eventRaw) return;

    const startsAtIso = eventRaw.startsAt || eventRaw.startDate || eventRaw.date;
    let date = "";
    let time = "10:00";
    if (startsAtIso) {
      const d = new Date(startsAtIso);
      // Use UTC to match the backend timestamps (e.g. 10:00:00.000Z should prefill as 10:00)
      date = d.toISOString().slice(0, 10);
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const min = String(d.getUTCMinutes()).padStart(2, "0");
      time = `${hh}:${min}`;
    }

    const v = typeof eventRaw.venue === "object" && eventRaw.venue ? eventRaw.venue : {};

    // Determine if the category is a custom one (not in predefined options)
    const isCustomCategory = eventRaw.category && 
      !categoryOptions.some(opt => opt.value === eventRaw.category);

    setFormData((prev) => ({
      ...prev,
      title: eventRaw.title || "",
      description: eventRaw.description || "",
      category: isCustomCategory ? "other" : (eventRaw.category || ""),
      customCategory: isCustomCategory ? (eventRaw.category || "") : "",
      type: (eventRaw.mode || eventRaw.type || "IN_PERSON") as string,
      mode: (eventRaw.mode || eventRaw.type || "IN_PERSON") as string,
      contactPerson: eventRaw.contactPerson || "",
      contactEmail: eventRaw.contactEmail || (authUser as any)?.email || "",
      costForMembers:
        eventRaw.pricing && typeof eventRaw.pricing.member === "number"
          ? String(eventRaw.pricing.member)
          : prev.costForMembers,
      maxAttendees:
        typeof eventRaw.maxAttendees === "number" ? String(eventRaw.maxAttendees) : prev.maxAttendees,
      date,
      time,
      link: eventRaw.link || "",
      venue: {
        address1: v.address1 || "",
        city: v.city || "",
        state: v.state || "",
        country: v.country || "",
        postcode: v.postcode || "",
      },
      address: v.address1 || "",
      city: v.city || "",
      state: v.state || "",
      country: v.country || "",
      pincode: v.postcode || "",
    }));
  }, [isEditMode, eventRaw]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      // User cancelled the dialog: do not clear existing selection
      return;
    }
    
    const file = files[0];
    
    // Validate file size (1MB = 1024 * 1024 bytes)
    const maxSizeInBytes = 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      alert("Image size must be less than 1MB");
      e.target.value = ""; // Clear the input
      return;
    }
    
    // Validate file type (JPEG or PNG only)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      alert("Only JPEG and PNG image formats are allowed");
      e.target.value = ""; // Clear the input
      return;
    }
    
    handleChange("uploadPhoto", file);
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleChange("uploadPhoto", null);
    const fileInput = document.getElementById('event-photo') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const normalizeLink = (u?: string) => {
    const v = (u ?? "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v}`;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    // For SA, we don't need region validation
    if (!isSuperAdmin) {
      // Compute region candidate for ED flow
      const userAny = authUser as any;
      const assignments: any[] = Array.isArray(userAny?.assignments) ? userAny.assignments : [];
      const primaryAssignment = assignments.find((a) => a?.isPrimary) || assignments[0];
      const regionIdRaw =
        primaryAssignment?.scope?.region ||
        primaryAssignment?.regionId ||
        userAny?.basicInfo?.region ||
        userAny?.basicInfo?.regionId ||
        undefined;

      if (!regionIdRaw) {
        alert("Region is missing in your profile. Please contact admin or re-login.");
        return;
      }
    }

    // Basic validation
    if (!formData.title) {
      alert("Please enter event title");
      return;
    }
    if (!formData.date) {
      alert("Please select event date");
      return;
    }
    if (!formData.time) {
      alert("Please select event time");
      return;
    }
    if (!formData.category) {
      alert("Please select event category");
      return;
    }
    if (formData.category === "other" || formData.category === "OTHER") {
      if (!formData.customCategory.trim()) {
        alert("Please enter custom category name");
        return;
      }
    }
    if (!formData.type) {
      alert("Please select event type");
      return;
    }
    if (!formData.contactPerson) {
      alert("Please enter contact person name");
      return;
    }
    if (!formData.contactEmail) {
      alert("Please enter contact email");
      return;
    }
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactEmail)) {
      alert("Please enter a valid email address");
      return;
    }
    if (formData.costForMembers === "" || formData.costForMembers === null || formData.costForMembers === undefined) {
      alert("Please enter cost for members");
      return;
    }
    if (isNaN(Number(formData.costForMembers)) || Number(formData.costForMembers) < 0) {
      alert("Please enter a valid cost for members (must be 0 or greater)");
      return;
    }

    // URL validation for link field
    if (formData.link && formData.link.trim()) {
      const urlValidation = validateUrl(formData.link.trim());
      if (!urlValidation.isValid) {
        alert(`Invalid URL: ${urlValidation.error}`);
        return;
      }
    }

    // Normalize dates
    const day = new Date(formData.date).toISOString().slice(0, 10); // YYYY-MM-DD
    const time = formData.time || "10:00"; // default 10 AM if not provided
    const startsAt = new Date(`${day}T${time}:00.000Z`).toISOString();
    
    // Calculate end time (1 hour after start by default)
    const [hh, mm] = time.split(":").map(Number);
    const endH = ((hh + 1) % 24).toString().padStart(2, "0");
    const endsAt = new Date(`${day}T${endH}:${mm.toString().padStart(2, "0")}:00.000Z`).toISOString();

    // Map category to server enum based on user role
    const toCategory = (cat: string): string => {
      // If "Other" is selected, use the custom category
      if (cat === "other" || cat === "OTHER") {
        return formData.customCategory.trim() || "OTHER";
      }
      
      if (isSuperAdmin) {
        // SA categories - use as-is since they match the backend enum
        return cat || "OTHER";
      } else {
        // ED categories - map to SA backend enum values
        const map: Record<string, string> = {
          expo: "EXPO",
          conference: "CONFERENCE",
          social: "SOCIAL",
          workshop: "WORKSHOP",
          mixer: "MIXER",
          recognition: "RECOGNITION",
          charity: "CHARITY",
          training: "WORKSHOP", // legacy map
          webinar: "SOCIAL",    // legacy fallback if used as category by mistake
          other: "OTHER",
          anniversary: "SOCIAL", // Map anniversary to social
          success_meet: "CONFERENCE", // Map success meet to conference
          business: "CONFERENCE", // Map business to conference
        };
        return (map[cat] ?? cat?.toUpperCase?.()) || "OTHER";
      }
    };

    // Map type/mode to server enum based on user role
    const toType = (t: string): string => {
      if (isSuperAdmin) {
        // SA types - use as-is since they match the backend enum
        return t || "ONLINE";
      } else {
        // ED types - map to SA backend enum values
        const map: Record<string, string> = {
          in_person: "IN_PERSON",
          online: "ONLINE",
          webinar: "ONLINE", // map webinar to ONLINE for SA backend
          hybrid: "HYBRID",
        };
        return (map[t] ?? t?.toUpperCase?.()) || "ONLINE";
      }
    };

    const payload: any = {
      title: formData.title,
      description: formData.description || "",
      category: toCategory(formData.category),
      type: toType(formData.type),
      mode: toType(formData.type),
      banner: formData.uploadPhoto,
      contactPerson: formData.contactPerson,
      costForMembers: formData.costForMembers !== "" ? Number(formData.costForMembers) : 0,
      costForNonMembers: formData.costForMembers !== "" ? Number(formData.costForMembers) : 0, // Same as members for now
      maxAttendees: formData.maxAttendees ? Number(formData.maxAttendees) : undefined,
      startsAt,
      endsAt,
      locationLabel: formData.address || formData.city || formData.state || formData.country || "",
      link: normalizeLink(formData.link),
      visibility: "PUBLIC",
      venue: {
        address1: formData.address || "",
        city: formData.city || "",
        state: formData.state || "",
        country: formData.country || "",
        postcode: formData.pincode || "",
      },
      contactEmail: formData.contactEmail || (authUser as any)?.email || "" // Use form email or fallback to user email
    };

    // Add regionId and chapterId for non-SA users
    let regionIdForFallback: string | undefined;
    if (!isSuperAdmin) {
      const userAny = authUser as any;
      const assignments: any[] = Array.isArray(userAny?.assignments) ? userAny.assignments : [];
      const primaryAssignment = assignments.find((a) => a?.isPrimary) || assignments[0];
      const regionIdRaw =
        primaryAssignment?.scope?.region ||
        primaryAssignment?.regionId ||
        userAny?.basicInfo?.region ||
        userAny?.basicInfo?.regionId;
      
      const chapterIdRaw =
        primaryAssignment?.scope?.chapter ||
        primaryAssignment?.chapterId ||
        userAny?.basicInfo?.chapter ||
        userAny?.basicInfo?.chapterId;
      
      if (regionIdRaw) {
        payload.regionId = String(regionIdRaw);
        regionIdForFallback = String(regionIdRaw);
      }
      
      // Add chapterId only if it exists (for chapter-specific events)
      if (chapterIdRaw) {
        payload.chapterId = String(chapterIdRaw);
      }
    }

    try {
      if (isEditMode && editEventId) {
        // Edit flow: allow updating image as well (banner may be a File)
        const updatePayload = { ...payload } as any;

        if (isSuperAdmin) {
          await updateSaEvent({ eventId: editEventId, data: updatePayload }).unwrap();
        } else {
          await updateEdEvent({ eventId: editEventId, data: updatePayload }).unwrap();
        }
      } else {
        // Create flow (existing logic)
        if (isSuperAdmin) {
          try {
            await createSaEvent(payload).unwrap();
          } catch (err: any) {
            const status = err?.status ?? err?.data?.statusCode;
            // Fallback: if SA endpoint not found, try ED endpoint if region available
            if ((status === 404 || status === 0) && regionIdForFallback) {
              await createEdEvent({ ...payload, regionId: regionIdForFallback }).unwrap();
            } else {
              throw err;
            }
          }
        } else {
          await createEdEvent(payload).unwrap();
        }
      }

      navigate(isEditMode && editEventId ? `/admin/events/${editEventId}` : "/admin/events", {
        state: {
          toast: {
            title: isEditMode ? "Event Updated!" : "Event Created!",
            description: isEditMode
              ? "The event has been updated successfully."
              : "The event has been created successfully.",
            kind: "success",
            durationMs: 4500,
          },
        },
        replace: true,
      });
    } catch (err: any) {
      console.error(isEditMode ? "Update event failed" : "Create event failed", err);
      alert(
        err?.data?.message ||
          err?.error ||
          (isEditMode ? "Failed to update event. Please check inputs." : "Failed to create event. Please check inputs."),
      );
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <h1 className="text-2xl font-bold text-white mb-6">{isEditMode ? "Edit Event" : "Create Event"}</h1>

        {/* Form Container */}
        <GradientContainer className="max-w-8xl">
          <div className="p-6 md:p-8 rounded-2xl">
            <form onSubmit={handleSubmit}>
              {/* Row 1: Title, Date, Time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-4">
                {/* Title */}
                <FormInput
                  label="Title"
                  placeholder="Enter title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  isRequired
                />

                {/* Date */}
                <div className="w-full">
                  <label className="block text-xs text-gray-400 mb-2">Date <span className="text-red-500">*</span></label>
                  <div className="w-full">
                    <DatePicker
                      id="event-date"
                      value={formData.date}
                      onChange={(value) => handleChange("date", value)}
                      iconSrc={CalendarIcon}
                      placeholder="dd/mm/yyyy"
                      className="w-full h-11"
                    />
                  </div>
                </div>

              

                {/* Time */}
                <FormSelect
                  label="Time"
                  value={formData.time}
                  onChange={(e) => handleChange("time", e.target.value)}
                  options={timeOptions}
                  isRequired
                />
              </div>

              {/* Removed Chapter selection as per new requirements */}

              {/* Row 2: Category, Custom Category (when Other), Upload Photo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-4">
                {/* Category */}
                <FormSelect
                  label="Category"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  options={categoryOptions}
                  isRequired
                />

                {/* Custom Category Input - Show when "Other" is selected */}
                {(formData.category === "other" || formData.category === "OTHER") && (
                  <FormInput
                    label="Custom Category Name"
                    placeholder="Enter custom category"
                    value={formData.customCategory}
                    onChange={(e) => handleChange("customCategory", e.target.value)}
                    isRequired
                  />
                )}

                {/* Upload Event Photo */}
                <div>
                  <label className="block text-xs text-gray-400 mb-2">
                    Upload Event Photo (Max: 1MB, JPEG/PNG only)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleFileChange}
                      className="hidden"
                      id="event-photo"
                    />
                    <div className="flex items-stretch h-11">
                      <label
                        htmlFor="event-photo"
                        className="flex-1 flex items-center justify-between bg-[#21272D] border border-gray-700 rounded px-3 text-gray-300 cursor-pointer hover:border-orange-500 transition-colors"
                      >
                        <span className="truncate max-w-[180px] text-sm">
                          {formData.uploadPhoto ? formData.uploadPhoto.name : "Choose File"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-300 bg-gray-700/50 px-2 py-1 rounded whitespace-nowrap">
                            {formData.uploadPhoto ? "Change" : "No File Chosen"}
                          </span>
                          {formData.uploadPhoto && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-[#D85D27] hover:bg-orange-700 text-white text-sm font-medium transition-colors"
                              title="Remove photo"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </label>
                    </div>
                  </div>

                  {isEditMode && !formData.uploadPhoto && (eventRaw?.bannerUrl || eventRaw?.imageUrl) && (
                    <div className="mt-3">
                      <label className="block text-xs text-gray-400 mb-2">
                        Current Event Image
                      </label>
                      <div className="w-full h-[140px] rounded-lg overflow-hidden bg-black/20 border border-gray-700">
                        <img
                          src={eventRaw?.bannerUrl || eventRaw?.imageUrl || ""}
                          alt="Current event banner"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "";
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Contact Person, Contact Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
                {/* Contact Person */}
                <FormInput
                  label="Contact Person"
                  placeholder="Enter name"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                  isRequired
                />

                {/* Contact Email */}
                <FormInput
                  label="Contact Email"
                  type="email"
                  placeholder="Enter contact email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                  isRequired
                />
              </div>

              {/* Row 3: Country, Type, Link */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-4">
                {/* Country */}
                <FormInput
                  label="Country"
                  placeholder="Enter country"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                />

                {/* Type */}
                <FormSelect
                  label="Type"
                  value={formData.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                  options={typeOptions}
                  isRequired
                />

                {/* Link */}
                <URLInput
                  label="Link"
                  value={formData.link}
                  onChange={(value) => handleChange("link", value)}
                  placeholder="Enter link (e.g., https://example.com)"
                />
              </div>

              {/* Row 3.1: State, City, Pincode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-4">
                {/* State */}
                <FormInput
                  label="State"
                  placeholder="Enter state"
                  value={formData.state}
                  onChange={(e) => handleChange("state", e.target.value)}
                />

                {/* City */}
                <FormInput
                  label="City"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                />

                {/* Pincode */}
                <FormInput
                  label="Pincode"
                  placeholder="Enter pincode"
                  value={formData.pincode}
                  onChange={(e) => handleChange("pincode", e.target.value)}
                />
              </div>

              {/* Row 4: Cost for Members, Max no. of Attendees */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
                {/* Cost for Members */}
                <FormInput
                  label="Cost for Members"
                  placeholder="Enter cost"
                  value={formData.costForMembers}
                  onChange={(e) => handleChange("costForMembers", e.target.value)}
                  isRequired
                />

                {/* Max no. of Attendees */}
                <FormInput
                  label="Max. no. of Attendees"
                  type="number"
                  placeholder="Enter number of attendees"
                  value={formData.maxAttendees}
                  onChange={(e) => handleChange("maxAttendees", e.target.value)}
                />
              </div>

              <div className="mb-4">
                <FormTextarea
                  label="Address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="Enter event address"
                  rows={3}
                />
              </div>

              {/* Row 5: Description */}
              <div className="mb-6">
                <FormTextarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Enter Description"
                  rows={4}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 justify-start">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full md:w-64 h-11 px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? isEditMode
                      ? "Updating..."
                      : "Creating..."
                    : isEditMode
                      ? "Update"
                      : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditMode && editEventId) {
                      navigate(`/admin/events/${editEventId}`);
                    } else {
                      navigate("/admin/events");
                    }
                  }}
                  className="h-11 px-6 rounded-md bg-gray-600 hover:bg-gray-500 text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
