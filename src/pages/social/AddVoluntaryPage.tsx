import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import GradientContainer from "../../components/common/GradientContainer";

import { useToast } from "../../components/toast/ToastProvider";
import { useMeQuery } from "../../services/authApi";

import type { CreateSocialVolunteerParams } from "../../services/social/types";
import { useCreateSocialVolunteerMutation } from "../../services/social";
import VolunteerForm, { type VolunteerFormData } from "../../components/forms/VoluntaryForm";

export default function AddVoluntaryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userName, setUserName] = useState("Mike");
    const { data: meRes } = useMeQuery();

    // Get the mutation hook
    const [createVolunteer] = useCreateSocialVolunteerMutation();

    // Get event details from navigation state if coming from event detail page
    const eventState = location.state as {
        eventId?: string;
        countryId?: string;
        regionId?: string;
        socialChapterId?: string;
    } | null;

    const handleSubmit = async (data: VolunteerFormData) => {
        try {
            setIsSubmitting(true);

            // Validate required fields
            if (!data.countryId || !data.regionId || !data.socialChapterId) {
                showToast({
                    title: "Validation Error",
                    description: "Country, Region, and Chapter are required fields.",
                    kind: "error",
                });
                setIsSubmitting(false);
                return;
            }

            // Prepare the data for API call - ensure all fields have values (not undefined)
            const volunteerData: CreateSocialVolunteerParams = {
                name: data.name || "",
                countryId: data.countryId,
                regionId: data.regionId,
                socialChapterId: data.socialChapterId,
                email: data.email || "",
                phone: data.phone || "",
                // CRITICAL: Send empty string instead of undefined for optional fields
                referredBy: data.referredBy || "",
                area: data.area || "",
                eventId: eventState?.eventId || data.eventId || undefined,
            };

            // Remove undefined/empty eventId if not present
            if (!volunteerData.eventId) {
                delete volunteerData.eventId;
            }

            console.log("Submitting volunteer data:", volunteerData);

            // Make the actual API call
            const response = await createVolunteer(volunteerData).unwrap();

            console.log("Volunteer created successfully:", response);

            // SUCCESS
            showToast({
                title: "Success",
                description: "Volunteer has been added successfully.",
                kind: "success",
            });

            // Always navigate to Manage Volunteers page after successful submission
            navigate("/social/manage-voluntary", {
                replace: true,
                state: { refresh: true },
            });

        } catch (error: any) {
            console.error("Error saving volunteer data:", error);

            const errorMessage = error?.data?.message ||
                error?.message ||
                "Failed to save volunteer record. Please try again.";

            showToast({
                title: "Error",
                description: errorMessage,
                kind: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const name = meRes?.data?.name;
        if (name) setUserName(name);
    }, [meRes]);

    const breadcrumbs = [
        { label: "Social", onClick: () => navigate("/dashboard") },
        { label: "Manage Volunteers", onClick: () => navigate("/social/manage-voluntary") },
        { label: "Add Volunteer" },
    ];

    return (
        <div className="min-h-screen bg-[#0f1419]">
            <Navbar userName={userName} />

            <main className="container mx-auto px-4 py-6">
                {/* Breadcrumb */}
                <PageHeader breadcrumbs={breadcrumbs} />

                {/* Form Container */}
                <GradientContainer>
                    <div className="p-4 md:p-6">
                        <VolunteerForm
                            onSubmit={handleSubmit}
                            submitButtonText={isSubmitting ? "Saving..." : "Save Volunteer Record"}
                            isEditMode={false}
                            onCancel={() => navigate(-1)}
                            initialData={eventState ? {
                                countryId: eventState.countryId || "",
                                regionId: eventState.regionId || "",
                                socialChapterId: eventState.socialChapterId || "",
                                eventId: eventState.eventId,
                            } : undefined}
                        />
                    </div>
                </GradientContainer>
            </main>
        </div>
    );
}