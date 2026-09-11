import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SocialLayout } from "../../components/social";
import { FormInput, FormSelect, FormTextarea } from "../../components/forms";
import DatePicker from "../../components/common/DatePicker";
import CalendarIcon from "../../assets/icons/calendar.svg";
import { useCreateUserSocialEventMutation, usePresignUserEventImageMutation } from "../../services/social";
import { useAppSelector } from "../../app/store";
import { useUsersMeQuery } from "../../services/authApi";
import { useToast } from "../../components/toast/ToastProvider";

interface EventFormData {
    title: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    eventType: string;
    socialChapterId: string;
    country: string;
    region: string;
    category: string;
    contactPerson: string;
    costForMember: string;
    maxAttendees: string;
    link: string;
    description: string;
    eventPhoto: File | null;
}

const eventTypeOptions = [
    { value: "", label: "Select event type" },
    { value: "donation", label: "Donation" },
    { value: "fundraiser", label: "Fundraiser" },
    { value: "meeting", label: "Meeting" },
    { value: "other", label: "Other" },
];

const categoryOptions = [
    { value: "", label: "Select category" },
    { value: "community", label: "Community Service" },
    { value: "education", label: "Education" },
    { value: "health", label: "Health & Wellness" },
    { value: "environment", label: "Environment" },
    { value: "technology", label: "Technology" },
    { value: "business", label: "Business Development" },
];

const timeOptions = [
    { value: "", label: "Select time" },
    { value: "06:00", label: "06:00" },
    { value: "06:30", label: "06:30" },
    { value: "07:00", label: "07:00" },
    { value: "07:30", label: "07:30" },
    { value: "08:00", label: "08:00" },
    { value: "08:30", label: "08:30" },
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

export default function AddEventPage() {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const authUser = useAppSelector((s) => s.auth.user);
    const { data: meRes } = useUsersMeQuery();
    const meData = meRes?.data || (authUser as any) || {};
    const mySocialChapterId: string = meData?.social?.socialChapterId || "";
    const myCountryId: string = meData?.basicInfo?.country || "";
    const myRegionId: string = meData?.basicInfo?.region || "";

    const [formData, setFormData] = useState<EventFormData>({
        title: "",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        eventType: "",
        socialChapterId: "",
        country: "",
        region: "",
        category: "",
        contactPerson: "",
        costForMember: "",
        maxAttendees: "",
        link: "",
        description: "",
        eventPhoto: null,
    });

    // Sync chapter/country/region from me API once data is available
    useEffect(() => {
        if (mySocialChapterId) {
            setFormData((prev) => ({
                ...prev,
                socialChapterId: mySocialChapterId,
                country: myCountryId,
                region: myRegionId,
            }));
        }
    }, [mySocialChapterId, myCountryId, myRegionId]);

    const handleInputChange = (field: keyof EventFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast({
                    title: "Invalid file type",
                    description: "Please select an image file.",
                    kind: "error",
                });
                return;
            }

            // Validate file size (e.g., max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                showToast({
                    title: "File too large",
                    description: "Please select an image smaller than 5MB.",
                    kind: "error",
                });
                return;
            }

            setFormData((prev) => ({ ...prev, eventPhoto: file }));
        }
    };

    const [createEvent] = useCreateUserSocialEventMutation();
    const [presignImage] = usePresignUserEventImageMutation();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.title || !formData.startDate || !formData.startTime) {
            showToast({
                title: "Missing required fields",
                description: "Please fill Title, Start Date and Start Time.",
                kind: "error",
            });
            return;
        }

        if (!formData.socialChapterId) {
            showToast({ title: "Error", description: "Could not determine your social chapter. Please try again.", kind: "error" });
            return;
        }

        setIsSubmitting(true);
        try {
            let imageKey: string | undefined = undefined;

            // Upload image to S3 via presigned URL
            if (formData.eventPhoto) {
                const file = formData.eventPhoto;
                const presignRes = await presignImage({ mime: file.type, size: file.size }).unwrap();
                const { uploadUrl, key } = presignRes.data;
                const uploadResp = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": file.type },
                    body: file,
                });
                if (!uploadResp.ok) {
                    showToast({ title: "Image upload failed", description: "Could not upload image to storage.", kind: "error" });
                    setIsSubmitting(false);
                    return;
                }
                imageKey = key;
            }

            await createEvent({
                title: formData.title,
                description: formData.description || undefined,
                startDate: formData.startDate,
                startTime: formData.startTime,
                endDate: formData.endDate || undefined,
                endTime: formData.endTime || undefined,
                socialChapterId: mySocialChapterId || formData.socialChapterId,
                countryId: myCountryId || formData.country,
                regionId: myRegionId || formData.region,
                eventType: formData.eventType ? formData.eventType.toUpperCase() : undefined,
                categoryLabel: formData.category || undefined,
                contactPerson: formData.contactPerson || undefined,
                costForMembers: formData.costForMember ? Number(formData.costForMember) : undefined,
                maxAttendees: formData.maxAttendees ? Number(formData.maxAttendees) : undefined,
                link: formData.link || undefined,
                imageUrl: imageKey,
            }).unwrap();

            showToast({
                title: "Success",
                description: "Event created successfully!",
                kind: "success",
            });

            navigate("/social/my-events");
        } catch (err: any) {
            const msg = err?.data?.message;

            if (msg?.toLowerCase().includes("approval")) {
                showToast({
                    title: "Event submitted",
                    description: "Your event has been sent for approval. You will be notified once approved.",
                    kind: "success",
                });
                navigate("/social/my-events");
                return;
            }

            showToast({
                title: "Failed to submit",
                description: msg || "Something went wrong",
                kind: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate("/social/my-events");
    };

    const today = new Date().toISOString().split("T")[0];

    return (
        <SocialLayout>
            <div className="p-[3px] rounded-xl bg-gradient-to-br from-white/30 via-white/5 via-transparent to-white/1">
                <div className="bg-[#161b22] rounded-[9px] p-8">
                    <h2 className="text-white text-xl font-semibold mb-6">Add Event</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Title */}
                            <FormInput
                                label="Title"
                                placeholder="Enter title"
                                value={formData.title}
                                onChange={(e) => handleInputChange("title", e.target.value)}
                                isRequired
                            />

                            {/* Start Date */}
                            <div className="w-full">
                                <label className="block text-xs text-gray-400 mb-1.5">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                    value={formData.startDate}
                                    onChange={(value) => handleInputChange("startDate", value)}
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
                                value={formData.startTime}
                                onChange={(e) => handleInputChange("startTime", e.target.value)}
                                isRequired
                            />

                            {/* End Date */}
                            <div className="w-full">
                                <label className="block text-xs text-gray-400 mb-1.5">
                                    End Date
                                </label>
                                <DatePicker
                                    value={formData.endDate}
                                    onChange={(value) => handleInputChange("endDate", value)}
                                    iconSrc={CalendarIcon}
                                    placeholder="12/08/2025"
                                    minDate={formData.startDate || today}
                                />
                            </div>

                            {/* End Time */}
                            <FormSelect
                                label="End Time"
                                options={timeOptions}
                                placeholder="09:30"
                                value={formData.endTime}
                                onChange={(e) => handleInputChange("endTime", e.target.value)}
                            />

                            {/* Event Type */}
                            <FormSelect
                                label="Event Type"
                                options={eventTypeOptions}
                                placeholder="Select event type"
                                value={formData.eventType}
                                onChange={(e) => handleInputChange("eventType", e.target.value)}
                                isRequired
                            />

                            {/* Category */}
                            <FormSelect
                                label="Category"
                                options={categoryOptions}
                                placeholder="Select category"
                                value={formData.category}
                                onChange={(e) => handleInputChange("category", e.target.value)}
                            />

                            {/* Contact Person */}
                            <FormInput
                                label="Contact Person"
                                placeholder="Enter person name"
                                value={formData.contactPerson}
                                onChange={(e) => handleInputChange("contactPerson", e.target.value)}
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
                                            {formData.eventPhoto ? formData.eventPhoto.name : "Choose File"}
                                        </span>

                                        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded shrink-0">
                                            {formData.eventPhoto ? "Change" : "No file chosen"}
                                        </span>
                                    </label>

                                    {formData.eventPhoto && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData((prev) => ({ ...prev, eventPhoto: null }));
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

                                {/* Image Preview */}
                                {formData.eventPhoto && (
                                    <div className="mt-3">
                                        <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-700 bg-[#21272D]">
                                            <img
                                                src={URL.createObjectURL(formData.eventPhoto)}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cost for Member */}
                            <FormInput
                                label="Cost for Member"
                                placeholder="Enter cost"
                                value={formData.costForMember}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                onChange={(e) =>
                                    handleInputChange(
                                        "costForMember",
                                        e.target.value.replace(/[^0-9]/g, "")
                                    )
                                }
                            />

                            {/* Max no. of Attendees */}
                            <FormInput
                                label="Max. no. of Attendees"
                                placeholder="Enter number of attendees"
                                value={formData.maxAttendees}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                onChange={(e) =>
                                    handleInputChange(
                                        "maxAttendees",
                                        e.target.value.replace(/[^0-9]/g, "")
                                    )
                                }
                            />

                            {/* Link */}
                            <FormInput
                                label="Link"
                                placeholder="Enter link"
                                type="url"
                                value={formData.link}
                                onChange={(e) => handleInputChange("link", e.target.value)}
                            />
                        </div>

                        {/* Description - Full width */}
                        <div className="w-full">
                            <FormTextarea
                                label="Description"
                                placeholder="Enter Description"
                                rows={4}
                                value={formData.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                className="bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-8 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={isSubmitting}
                            >
                                {isSubmitting && (
                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                                )}
                                {isSubmitting ? "Submitting..." : "Submit"}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="bg-gray-600 hover:bg-gray-700 text-white rounded-lg px-8 py-2.5 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </SocialLayout>
    );
}
