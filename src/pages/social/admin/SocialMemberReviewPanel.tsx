import { useState } from "react";
import { useGetScUserActionsQuery } from "../../../services/social/socialAdminDashboardApi";
import { useApproveSocialMemberMutation, useRejectSocialMemberMutation } from "../../../services/social/socialAdminDashboardApi";
import { useToast } from "../../../components/toast/ToastProvider";
import { getSocialCategoryLabel } from "../../../utils/businessCategories";

interface Props {
  userId: string;
  approvalId: string;
  onClose: () => void;
  onDecision: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  ACCOUNT_CREATED: "Account created",
  EMAIL_VERIFIED: "Email verified",
  APPROVAL_REQUESTED: "Approval requested",
  APPROVAL: "Approval decision",
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "text-green-400",
  REJECTED: "text-red-400",
  PENDING: "text-yellow-400",
};

export default function SocialMemberReviewPanel({ userId, approvalId, onClose, onDecision }: Props) {
  const { showToast } = useToast();
  const [rejectRemark, setRejectRemark] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const { data, isLoading } = useGetScUserActionsQuery({ userId, page: 1, limit: 20 });
  const [approveMember, { isLoading: isApproving }] = useApproveSocialMemberMutation();
  const [rejectMember, { isLoading: isRejecting }] = useRejectSocialMemberMutation();

  const user = data?.user;
  const timeline: any[] = data?.data || [];
  const resolvedApprovalId = data?.approvalId || approvalId;

  const socialChapter = user?.social?.socialChapterId;
  const socialChapterName =
    typeof socialChapter === "object" ? socialChapter?.name : null;

  const handleApprove = async () => {
    try {
      await approveMember({ approvalId: resolvedApprovalId, data: { grantModules: ["social"] } }).unwrap();
      showToast({ title: "Member approved", description: "Social module access granted.", kind: "success" });
      onDecision();
      onClose();
    } catch (e: any) {
      showToast({ title: "Approval failed", description: e?.data?.message || "Please try again.", kind: "error" });
    }
  };

  const handleReject = async () => {
    if (!rejectRemark.trim()) return;
    try {
      await rejectMember({ approvalId: resolvedApprovalId, data: { remark: rejectRemark } }).unwrap();
      showToast({ title: "Member rejected", description: "Rejection sent.", kind: "success" });
      onDecision();
      onClose();
    } catch (e: any) {
      showToast({ title: "Rejection failed", description: e?.data?.message || "Please try again.", kind: "error" });
    }
  };

  return (
    /* Overlay */
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:w-[480px] h-full sm:h-screen overflow-y-auto bg-[#0f1419] border-l border-gray-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-white text-lg font-semibold">Review Member</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !user ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Failed to load member details.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Profile section */}
            <div className="px-6 py-5 border-b border-gray-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0">
                  {(user.name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-white text-xl font-semibold">{user.name}</div>
                  <div className="text-gray-300 text-sm">{user.email}</div>
                  {user.phone && <div className="text-gray-400 text-sm">{user.phone}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Status" value={user.isApproved ? "Approved" : "Pending"} />
                <InfoRow label="Email Verified" value={user.isEmailVerified ? "Yes" : "No"} />
                {socialChapterName && (
                  <InfoRow label="Social Chapter" value={socialChapterName} />
                )}
                {user.social?.socialCategory?.length > 0 && (
                  <InfoRow
                    label="Categories"
                    value={(user.social.socialCategory as string[]).map(getSocialCategoryLabel).join(", ")}
                  />
                )}
                {user.social?.motivation && (
                  <div className="col-span-2">
                    <InfoRow label="Motivation" value={user.social.motivation} />
                  </div>
                )}
                {user.social?.hobbies && (
                  <div className="col-span-2">
                    <InfoRow label="Hobbies" value={user.social.hobbies} />
                  </div>
                )}
                {user.social?.travelForEvents && (
                  <InfoRow label="Travel for Events" value={user.social.travelForEvents} />
                )}
              </div>
            </div>

            {/* Timeline section */}
            {timeline.length > 0 && (
              <div className="px-6 py-5 border-b border-gray-700">
                <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wider mb-4">
                  Activity Timeline
                </h3>
                <ol className="relative border-l border-gray-700 space-y-4 ml-2">
                  {timeline.map((event, i) => (
                    <li key={i} className="ml-4">
                      <div className="absolute w-2.5 h-2.5 bg-[#D85D27] rounded-full -left-1.5 mt-1" />
                      <div className="text-gray-400 text-xs mb-0.5">
                        {new Date(event.at).toLocaleString()}
                      </div>
                      <div className="text-white text-sm font-medium">
                        {EVENT_LABELS[event.kind] || event.kind}
                      </div>
                      {event.kind === "APPROVAL" && (
                        <div className={`text-xs mt-0.5 ${STATUS_COLORS[event.data?.status] || "text-gray-300"}`}>
                          {event.data?.status}
                          {event.data?.remark ? ` — ${event.data.remark}` : ""}
                        </div>
                      )}
                      {event.actor?.name && (
                        <div className="text-gray-500 text-xs mt-0.5">by {event.actor.name}</div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Reject form */}
            {showRejectForm && (
              <div className="px-6 py-4 border-b border-gray-700">
                <label className="block text-sm text-gray-300 mb-2">
                  Reason for rejection <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={rejectRemark}
                  onChange={(e) => setRejectRemark(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Enter rejection reason..."
                  className="w-full bg-[#1a2332] border border-gray-600 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#D85D27] resize-none"
                />
                <div className="text-gray-500 text-xs text-right mt-1">{rejectRemark.length}/500</div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!isLoading && user && (
          <div className="px-6 py-4 border-t border-gray-700 bg-[#0f1419] flex gap-3">
            {showRejectForm ? (
              <>
                <button
                  onClick={() => { setShowRejectForm(false); setRejectRemark(""); }}
                  className="flex-1 h-10 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isRejecting || !rejectRemark.trim()}
                  className="flex-1 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRejecting ? "Rejecting..." : "Confirm Reject"}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 h-10 rounded-lg border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 transition-colors text-sm"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="flex-1 h-10 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApproving ? "Approving..." : "Approve"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-gray-500 text-xs">{label}</div>
      <div className="text-gray-200 text-sm mt-0.5">{String(value)}</div>
    </div>
  );
}
