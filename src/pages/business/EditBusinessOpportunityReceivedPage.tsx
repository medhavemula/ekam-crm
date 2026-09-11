import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import {
  useUpdateReceivedOpportunityMutation,
  useGetOpportunityQuery,
} from "../../services/opportunityApi";
import { useConnectionsListQuery } from "../../services/connectionsApi";
import type { ConnectionCardApi } from "../../services/connectionsApi";
import { useMeQuery } from "../../services/authApi";
import FormInput from "../../components/forms/FormInput";
import FormSelect from "../../components/forms/FormSelect";
import { useToast } from "../../components/toast/ToastProvider";

interface EditData {
  id: string;
  date: string;
  name: string;
  phone: string;
  email: string;
  status: "NOT_CONTACTED" | "CONTACTED" | "NO_RESPONSE" | "WON" | "LOST" | "NOT_A_GOOD_FIT";
  comments: string;
  amount?: string;
  creditedGiverId?: string;
  creditedGiverName?: string;
}

const STATUS_OPTIONS = [
  { value: "NOT_CONTACTED", label: "Not Contacted Yet" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "NO_RESPONSE", label: "No Response" },
  { value: "WON", label: "Got The Business" },
  { value: "LOST", label: "Did Not Get The Business" },
  { value: "NOT_A_GOOD_FIT", label: "Not a Good Fit" },
];

const isValidObjectId = (value?: string) => !!value && /^[a-f\d]{24}$/i.test(value);

export default function EditBusinessOpportunityReceivedPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation() as { state?: Partial<EditData> };
  const { showToast } = useToast();

  // Fetch current user
  const { data: meRes, error: meError } = useMeQuery();
  const [userName, setUserName] = useState("Mike");

  // Update mutation
  const [updateOpportunity, { isLoading: isUpdating, error: updateError }] =
    useUpdateReceivedOpportunityMutation();

  // Map display status to backend enum if needed
  const mapStatusToEnum = (status?: string): EditData["status"] => {
    if (!status) return "NOT_CONTACTED";
    // If already in correct format, return as is
    if (["NOT_CONTACTED", "CONTACTED", "NO_RESPONSE", "WON", "LOST", "NOT_A_GOOD_FIT"].includes(status)) {
      return status as EditData["status"];
    }
    // Map display values to enum
    const mapping: Record<string, EditData["status"]> = {
      "Not Contacted Yet": "NOT_CONTACTED",
      "Contacted": "CONTACTED",
      "No Response": "NO_RESPONSE",
      "Got The Business": "WON",
      "Did Not Get The Business": "LOST",
      "Not a Good Fit": "NOT_A_GOOD_FIT",
    };
    return mapping[status] || "NOT_CONTACTED";
  };

  // Router state is only a first paint: it is absent on a refresh or a shared
  // link. The stale placeholders that used to fill the gap ("David",
  // "david66@gmail.com") showed a stranger's details on a real referral, and left
  // the credited giver blank so a WON save was rejected. The record is the truth.
  const fallback: EditData = {
    id: id || "",
    date: location.state?.date || "",
    name: location.state?.name || "",
    phone: location.state?.phone || "",
    email: location.state?.email || "",
    status: mapStatusToEnum(location.state?.status),
    comments: location.state?.comments || "",
    amount: location.state?.amount || "",
    creditedGiverId: (location.state as any)?.giverId || location.state?.creditedGiverId || "",
    creditedGiverName: (location.state as any)?.giverName || "",
  };

  const [form, setForm] = useState<EditData>(fallback);
  const [amountError, setAmountError] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  const {
    data: oppRes,
    isLoading: recordLoading,
    isError: recordError,
  } = useGetOpportunityQuery(id as string, { skip: !isValidObjectId(id) });
  const record = oppRes?.data;

  // Hydrate once, so a refetch cannot overwrite what the member is typing.
  useEffect(() => {
    if (!record || hydrated) return;
    setForm((prev) => ({
      ...prev,
      id: String(record.id || record._id || prev.id),
      date: record.createdAt
        ? new Date(record.createdAt).toLocaleDateString("en-GB")
        : prev.date,
      name: record.contact?.name || prev.name,
      phone: record.contact?.phone || prev.phone,
      email: record.contact?.email || prev.email,
      status: mapStatusToEnum(record.status) || prev.status,
      comments: record.comments || prev.comments,
      amount:
        record.amount !== undefined && record.amount !== null
          ? String(record.amount)
          : prev.amount,
      // Default the credit to whoever actually gave the referral.
      creditedGiverId:
        record.creditedGiver?.id || record.giver?.id || prev.creditedGiverId || "",
      creditedGiverName:
        record.creditedGiver?.name || record.giver?.name || prev.creditedGiverName || "",
    }));
    setHydrated(true);
  }, [record, hydrated]);

  // Options for re-crediting. The referrer is always first and always present,
  // even when they are not among the member's connections.
  const [giverSearch, setGiverSearch] = useState("");
  const { data: connectionsRes } = useConnectionsListQuery({
    type: "my",
    limit: 20,
    q: giverSearch,
  });
  const creditOptions = useMemo(() => {
    const opts = (connectionsRes?.data || []).map((c: ConnectionCardApi) => ({
      value: c.user.id,
      label: c.user.name,
    }));
    const referrerId = record?.giver?.id ? String(record.giver.id) : form.creditedGiverId;
    const referrerName = record?.giver?.name || form.creditedGiverName || "Referrer";
    if (referrerId) {
      const rest = opts.filter((o: { value: string }) => o.value !== referrerId);
      return [{ value: referrerId, label: referrerName }, ...rest];
    }
    return opts;
  }, [connectionsRes, record, form.creditedGiverId, form.creditedGiverName]);
  
  // Check if opportunity was already won (closed) - make it read-only
  const isAlreadyWon = (record ? mapStatusToEnum(record.status) : fallback.status) === "WON";

  // Check authentication
  useEffect(() => {
    const err = meError as any;
    if (err && typeof err === "object" && "status" in err && err.status === 401) {
      navigate("/login");
    }
  }, [meError, navigate]);

  // Redirect if already won
  useEffect(() => {
    if (isAlreadyWon) {
      showToast({ 
        title: "Cannot Edit", 
        description: "This opportunity has already been marked as 'Got The Business' and cannot be edited.", 
        kind: "error" 
      });
      navigate("/business/opportunity-received");
    }
  }, [isAlreadyWon, navigate, showToast]);

  // Update navbar name when available
  useEffect(() => {
    const name = meRes?.data?.name;
    if (name) setUserName(name);
  }, [meRes]);

  const breadcrumbs = useMemo(
    () => [
      { label: "Business", onClick: () => navigate("/dashboard") },
      { label: "Business Opportunity Received", onClick: () => navigate("/business/opportunity-received") },
      { label: "Edit" },
    ],
    [navigate]
  );

  // Clear amount error when user types in amount field
  const handleAmountChange = (value: string) => {
    setForm({ ...form, amount: value });
    if (amountError) setAmountError("");
  };

  const handleUpdate = async () => {
    try {
      setAmountError(""); // Clear previous errors
      const opportunityId = String(form.id || "").trim();
      if (!isValidObjectId(opportunityId)) {
        showToast({ title: "Invalid opportunity", description: "Please reopen the opportunity and try again.", kind: "error" });
        return;
      }
      
      const payload: any = {
        status: form.status,
        comments: form.comments || undefined,
      };

      // If status is WON, amount and creditedGiverId are required
      if (form.status === "WON") {
        const amountNum = parseFloat(form.amount || "0");
        if (isNaN(amountNum) || amountNum <= 0) {
          const errorMsg = "Amount is required and must be > 0 when status is 'Got The Business'";
          showToast({ title: "Validation Error", description: errorMsg, kind: "error" });
          setAmountError(errorMsg);
          return;
        }
        payload.amount = amountNum;
        // Whatever is selected - defaulted to the referrer, changed only on purpose.
        const creditTo =
          form.creditedGiverId || record?.giver?.id || (location.state as any)?.giverId || "";
        if (!isValidObjectId(String(creditTo))) {
          showToast({
            title: "Credited giver missing",
            description: "Choose who should be credited for this business.",
            kind: "error",
          });
          return;
        }
        payload.creditedGiverId = String(creditTo);
      }

      
      await updateOpportunity({ id: opportunityId, body: payload }).unwrap();
      navigate("/business/opportunity-received", {
        replace: true,
        state: {
          toast: {
            title: "Opportunity updated",
            description: "The received opportunity has been updated.",
            kind: "success",
          },
        },
      });
    } catch (err) {
      console.error("Failed to update opportunity:", err);
      showToast({ title: "Failed to update", description: "Please try again.", kind: "error" });
    }
  };
  const handleCancel = () => navigate("/business/opportunity-received");

  const inputCls =
    "w-full px-4 py-3 rounded-lg bg-[#1a222c] border border-white/10 text-white placeholder-white/40 " +
    "focus:outline-none focus:border-orange-500";

  const showWonFields = form.status === "WON";

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />
      <main className="container mx-auto px-2 py-6">
        <PageHeader breadcrumbs={breadcrumbs} />

        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-b from-[#0f1419] to-[#141a22] px-28 py-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset]">
          {/* Info Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-4 gap-x-6">
            {/* Date */}
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Date</label>
            </div>
            <div className="md:col-span-9 text-white/90">{form.date}</div>

            {/* Name */}
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Name</label>
            </div>
            <div className="md:col-span-9 text-white/90">{form.name}</div>

            {/* Phone */}
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Phone</label>
            </div>
            <div className="md:col-span-9 text-white/90">{form.phone}</div>

            {/* Email */}
            <div className="md:col-span-3">
              <label className="text-sm text-white/70">Email</label>
            </div>
            <div className="md:col-span-9 text-white/90 break-all">{form.email}</div>
          </div>

          {/* Record load state. Without this the member silently edits whatever the
              list page passed in navigation state, which can be incomplete. */}
          {recordLoading && (
            <div className="mt-6 text-sm text-blue-300">Loading the latest details...</div>
          )}
          {recordError && (
            <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500 text-red-400">
              Could not load the latest details for this opportunity. The values shown may be out of
              date - reopen it from the list before saving.
            </div>
          )}

          {/* Error Display */}
          {updateError && (
            <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500 text-red-400">
              Failed to update opportunity. Please try again.
            </div>
          )}

          {/* Status Field */}
          <div className="mt-8">
            <FormSelect
              label="Status"
              isRequired
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
            />
          </div>

          {/* Conditional fields for WON status */}
          {showWonFields && (
            <>
              <div className="mt-6">
                <FormInput
                  label="Amount"
                  type="text"
                  isRequired
                  placeholder="Enter amount"
                  value={form.amount || ""}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  error={amountError}
                />
              </div>

              <div className="mt-6">
                {/* Defaults to the referrer. Kept selectable so credit can be
                    redirected deliberately, rather than being an open list that
                    happened to land on the wrong person. */}
                <FormSelect
                  label="Credited Giver (Thanks To)"
                  isRequired
                  options={creditOptions}
                  value={form.creditedGiverId || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const picked = creditOptions.find(
                      (o: { value: string }) => o.value === value,
                    );
                    setForm((prev) => ({
                      ...prev,
                      creditedGiverId: value,
                      creditedGiverName: picked ? picked.label : prev.creditedGiverName,
                    }));
                  }}
                  searchable
                  searchPlaceholder="Search member"
                  onSearchChange={setGiverSearch}
                  disableClientSideFilter
                />
              </div>
            </>
          )}

          {/* Comments Field */}
          <div className="mt-6">
            <label className="block text-sm text-white/70 mb-2">Comments</label>
            <textarea
              rows={3}
              placeholder="Enter comments"
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row gap-4 pt-10 max-w-xl mx-auto">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex-1 px-6 py-3 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Update"}
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdating}
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