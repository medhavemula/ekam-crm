import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useToast } from "../../../components/toast/ToastProvider";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import DatePicker from "../../../components/common/DatePicker";
import { useGetUserProfileWithActionsQuery, useUpdateUserProfileMutation } from "../../../services/memberApi";
import CalendarIcon from "../../../assets/icons/calendar.svg";

interface MemberRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  profession?: string;
  currentChapterId?: string;
  country?: string;
  region?: string;
  registrationApprovedAt?: string;
  expiryDate?: string;
}

interface LocationState {
  member?: MemberRecord;
  registrationDate?: string;
}

export default function ExtendMemberPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { memberId } = useParams<{ memberId: string }>();
  const { showToast } = useToast();
  const [updateUserProfile, { isLoading: isExtending }] = useUpdateUserProfileMutation();

  const toDisplayString = (v: any): string => {
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
      if ("name" in v && (v as any).name != null) return String((v as any).name);
      if ("label" in v && (v as any).label != null) return String((v as any).label);
      if ("title" in v && (v as any).title != null) return String((v as any).title);
    }
    return "";
  };

  const state = (location.state as LocationState) || {};
  const member = state.member;

  const shouldFetchMember = !!memberId && (!member || !member.name || !member.email || !member.phone);
  const { data: memberProfileRes } = useGetUserProfileWithActionsQuery(
    { userId: memberId || "", page: 1, limit: 50 },
    { skip: !shouldFetchMember },
  );

  const hydratedMember: MemberRecord | undefined = useMemo(() => {
    if (!shouldFetchMember) return member;
    const raw: any = memberProfileRes;
    const u: any = raw?.user;
    const actions: any[] = Array.isArray(raw?.data) ? raw.data : [];

    if (!u) return member;

    const approvalData = actions.find((a: any) => a.kind === "APPROVAL");
    const membershipExpiryData = actions.find((a: any) => a.kind === "MEMBERSHIP_EXPIRES");

    return {
      id: memberId || u._id || "",
      name: u.name || "",
      email: u.email || "",
      phone: u.basicInfo?.phone || "",
      company: u.business?.businessName || "",
      profession: u.professional?.role || "",
      country: u.basicInfo?.countryName || toDisplayString(u.basicInfo?.country),
      region: u.basicInfo?.regionName || toDisplayString(u.basicInfo?.region),
      registrationApprovedAt: approvalData?.data?.decidedAt || u.createdAt || "",
      expiryDate: membershipExpiryData?.data?.expiresAt || "",
    };
  }, [member, memberId, memberProfileRes, shouldFetchMember]);

  const safeCountry = typeof hydratedMember?.country === 'object' && hydratedMember.country !== null ? (hydratedMember.country as any).name || 'N/A' : hydratedMember?.country || 'N/A';
  const safeRegion = typeof hydratedMember?.region === 'object' && hydratedMember.region !== null ? (hydratedMember.region as any).name || 'N/A' : hydratedMember?.region || 'N/A';

  // Debug data validation
  useEffect(() => {
    // Member data validation logic can be added here if needed
  }, [member]);

  // Initialize dates with current expiry date
  const [expiryDate, setExpiryDate] = useState<string>(
    hydratedMember?.expiryDate ? new Date(hydratedMember.expiryDate).toISOString().split('T')[0] : ''
  );

  useEffect(() => {
    if (!hydratedMember?.expiryDate) return;
    setExpiryDate(new Date(hydratedMember.expiryDate).toISOString().split('T')[0]);
  }, [hydratedMember?.expiryDate]);

  const breadcrumbs = useMemo(() => ([
    { label: "Dashboard", onClick: () => navigate("/admin/dashboard") },
    { label: "Regional Board", onClick: () => navigate("/admin/regional-board") },
    { label: hydratedMember?.name || "Member" },
    { label: "Extend Member" },
  ]), [navigate, hydratedMember?.name]);

  const handleSubmit = async () => {
    if (!memberId) return;
    try {
      await updateUserProfile({
        userId: memberId,
        data: {
          membershipExpiryDate: new Date(expiryDate).toISOString()
        }
      }).unwrap();

      showToast({
        title: "Success",
        description: "Member's membership has been extended successfully",
        kind: "success",
      });
      
      // Set refresh flag in sessionStorage to trigger API refetch in ViewMemberProfilePage
      sessionStorage.setItem('refreshMemberData', 'true');
      
      // Navigate back to trigger refresh
      navigate(-1);
    } catch (error) {
      console.error("Error extending member:", error);
      showToast({
        title: "Error",
        description: "Failed to extend membership. Please try again.",
        kind: "error",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />
      <main className="container mx-auto px-2 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1419] to-[#141a22] px-28 py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6">
            <div className="md:col-span-3"><label className="text-sm text-white/70">Name</label></div>
            <div className="md:col-span-9 text-white/90">{hydratedMember?.name || 'N/A'}</div>

            <div className="md:col-span-3"><label className="text-sm text-white/70">Phone</label></div>
            <div className="md:col-span-9 text-white/90">{hydratedMember?.phone || 'N/A'}</div>

            <div className="md:col-span-3"><label className="text-sm text-white/70">Email</label></div>
            <div className="md:col-span-9 text-white/90 break-all">{hydratedMember?.email || 'N/A'}</div>

            <div className="md:col-span-3"><label className="text-sm text-white/70">Country</label></div>
            <div className="md:col-span-9 text-white/90">{safeCountry || 'N/A'}</div>

            <div className="md:col-span-3"><label className="text-sm text-white/70">Region</label></div>
            <div className="md:col-span-9 text-white/90">{safeRegion || 'N/A'}</div>

            <div className="md:col-span-3"><label className="text-sm text-white/70">Registration Date</label></div>
            <div className="md:col-span-9 text-white/90">
              {hydratedMember?.registrationApprovedAt ? new Date(hydratedMember.registrationApprovedAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>

          {/* Membership Dates */}
          <div className="mt-8 max-w-xl mx-auto space-y-6">
            <div>
              <label className="block text-sm text-white/70 mb-2">Expiry Date</label>
              <DatePicker
                value={expiryDate}
                onChange={setExpiryDate}
                minDate={new Date().toISOString().split('T')[0]}
                className="w-full"
                placeholder="Select expiry date"
                iconSrc={CalendarIcon}
                iconPosition="right"
              />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row gap-4 pt-10 max-w-xl mx-auto">
          <button
            onClick={handleSubmit}
            disabled={isExtending || !expiryDate}
            className="flex-1 px-6 py-3 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExtending ? 'Extending...' : 'Extend Membership'}
          </button>
          <button
            onClick={() => navigate(-1)}
            disabled={isExtending}
            className="flex-1 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          </div>
        </div>
      </main>
    </div>
  );
}