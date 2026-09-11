import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { TestimonialTabButton } from "../../components/testimonials";
import TestimonialItemCard from "../../components/testimonials/TestimonialItemCard";
import RequestTestimonialModal from "../../components/modals/RequestTestimonialModal";
import WriteTestimonialModal from "../../components/modals/WriteTestimonialModal";
import {
  useTestimonialsStatsQuery,
  useTestimonialsReceivedQuery,
  useTestimonialsGivenQuery,
  useTestimonialsListRequestsQuery,
  useTestimonialsRespondRequestMutation,
  useTestimonialsWithdrawRequestMutation,
  useTestimonialsCreateRequestMutation,
  useTestimonialsWriteMutation,
} from "../../services/testimonialsApi";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import { useConnectionsListQuery } from "../../services/connectionsApi";
import type { ConnectionCardApi } from "../../services/connectionsApi";
import receivedIcon from "../../assets/icons/testimonals-receive.svg";
import givenIcon from "../../assets/icons/testimonals-given.svg";
import requestsIcon from "../../assets/icons/testimonals-requests.svg";
import { useToast } from "../../components/toast/ToastProvider";

// Icons (use provided SVG assets)
const ReceivedIcon = () => <img src={receivedIcon} alt="received" className="w-8 h-8" />;
const GivenIcon = () => <img src={givenIcon} alt="given" className="w-8 h-8" />;
const RequestsIcon = () => <img src={requestsIcon} alt="requests" className="w-8 h-8" />;

type TestimonialItem = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  text: string;
};

type ApiTestimonial = {
  id: string;
  text: string;
  author?: { name: string; avatarUrl?: string | null };
  subject?: { name: string; avatarUrl?: string | null };
};

type ApiTestimonialRequest = {
  id: string;
  message: string;
  requester?: { id: string; name: string; avatarUrl?: string | null };
  potentialAuthor?: { name: string; avatarUrl?: string | null };
};

// type ApiMember = {
//   id: string;
//   name: string;
//   avatarUrl?: string | null;
// };

type TabType = "received" | "given" | "requests";

export default function TestimonialsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [userName] = useState("");
  // WEB-BUS-28: notifications link straight to the tab holding the record, e.g.
  // /business/testimonials?tab=requests&sub=received.
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const subFromUrl = searchParams.get("sub");
  const [activeTab, setActiveTab] = useState<TabType>(
    tabFromUrl === "requests" || tabFromUrl === "given" || tabFromUrl === "received"
      ? (tabFromUrl as TabType)
      : "received",
  );
  const [requestSubTab, setRequestSubTab] = useState<"received" | "given">(
    subFromUrl === "given" ? "given" : "received",
  );
  
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{ requestId: string; subjectId: string; recipientName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  // Check authentication
  React.useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      navigate("/login");
    }
  }, [navigate]);

  // API hooks
  const { data: statsResp } = useTestimonialsStatsQuery();
  const { data: receivedResp } = useTestimonialsReceivedQuery(undefined, { skip: activeTab !== "received" });
  const { data: givenResp } = useTestimonialsGivenQuery(undefined, { skip: activeTab !== "given" });
  const { data: reqRecvResp } = useTestimonialsListRequestsQuery({ tab: "received", page: 1, limit: 12 }, { skip: !(activeTab === "requests" && requestSubTab === "received") });
  const { data: reqGivenResp } = useTestimonialsListRequestsQuery({ tab: "given", page: 1, limit: 12 }, { skip: !(activeTab === "requests" && requestSubTab === "given") });
  const [respondRequest] = useTestimonialsRespondRequestMutation();
  const [withdrawRequest] = useTestimonialsWithdrawRequestMutation();
  const [createRequest] = useTestimonialsCreateRequestMutation();
  const [writeTestimonial] = useTestimonialsWriteMutation();
  const { data: connectionsResp } = useConnectionsListQuery({ type: "my", limit: 20, q: searchQuery });

  const handleAccept = async (id: string, subjectId: string, recipientName: string) => {
    // Do not call API here; just open the Write modal.
    setSelectedRequest({ requestId: id, subjectId, recipientName });
    setIsWriteModalOpen(true);
  };

  const handleReject = async (id: string) => {
    try {
      await respondRequest({ requestId: id, action: "REJECT" }).unwrap();
      showToast({ title: "Request rejected", description: "Testimonial request rejected.", kind: "success" });
    } catch (error) {
      console.error("Reject error:", error);
   
      showToast({ 
        title: "Failed to reject", 
         
        kind: "error" 
      });
    }
  };

  // no-op

  // Resolve lists by tab
  const handleConfirmWithdraw = async () => {
    if (!withdrawingId) return;
    try {
      await withdrawRequest({ requestId: withdrawingId }).unwrap();
      showToast({
        title: "Request withdrawn",
        description: "The testimonial request has been withdrawn.",
        kind: "success",
      });
    } catch (e) {
      console.error("Failed to withdraw testimonial request", e);
      showToast({ title: "Failed to withdraw", description: "Please try again.", kind: "error" });
    } finally {
      setWithdrawingId(null);
    }
  };

  const currentTestimonials: TestimonialItem[] = activeTab === "received"
    ? ((receivedResp?.data as ApiTestimonial[]) ?? []).map((t) => ({
        id: t.id,
        // Show author details for Received card
        name: t.author?.name ?? "",
        avatarUrl: t.author?.avatarUrl ?? undefined,
        text: t.text ?? "",
      }))
    : activeTab === "given"
    ? ((givenResp?.data as ApiTestimonial[]) ?? []).map((t) => ({
        id: t.id,
        // Show subject details for Given card
        name: t.subject?.name ?? "",
        avatarUrl: t.subject?.avatarUrl ?? undefined,
        text: t.text ?? "",
      }))
    : [];
  const requestsReceivedRaw: ApiTestimonialRequest[] = (reqRecvResp?.data as ApiTestimonialRequest[]) ?? [];
  const requestsGivenRaw: ApiTestimonialRequest[] = (reqGivenResp?.data as ApiTestimonialRequest[]) ?? [];
  const requestsReceived: Array<TestimonialItem & { subjectId: string }> = requestsReceivedRaw.map((r) => ({
    id: r.id,
    name: r.requester?.name ?? "",
    avatarUrl: r.requester?.avatarUrl ?? undefined,
    text: r.message,
    subjectId: r.requester?.id ?? "",
  }));
  const requestsGiven: TestimonialItem[] = requestsGivenRaw.map((r) => ({
    id: r.id,
    name: r.potentialAuthor?.name ?? "",
    avatarUrl: r.potentialAuthor?.avatarUrl ?? undefined,
    text: r.message,
  }));

  const openRequestModal = () => {
    setIsRequestModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName={userName} />

      <main className="container mx-auto px-4 py-6">
        <PageHeader
          breadcrumbs={[
            { label: "Business", onClick: () => navigate("/dashboard") },
            { label: "Testimonials" },
          ]}
        />

        {/* Tab Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <TestimonialTabButton
            title="Testimonials Received"
            count={statsResp?.data?.receivedPublished ?? 0}
            isActive={activeTab === "received"}
            onClick={() => setActiveTab("received")}
            icon={<ReceivedIcon />}
          />
          <TestimonialTabButton
            title="Testimonials Given"
            count={statsResp?.data?.givenPublished ?? 0}
            isActive={activeTab === "given"}
            onClick={() => setActiveTab("given")}
            icon={<GivenIcon />}
          />
          <TestimonialTabButton
            title="Testimonials Requests"
            count={statsResp?.data?.pendingForMe ?? 0}
            isActive={activeTab === "requests"}
            onClick={() => setActiveTab("requests")}
            icon={<RequestsIcon />}
          />
        </div>

        {activeTab === "requests" && (
          <div className="mb-6">
            <div className="flex items-end justify-between gap-6">
              <div className="flex items-end gap-14">
                <button
                  className={`text-lg font-medium pb-2 ${requestSubTab === "received" ? "text-white border-b-2 border-orange-500" : "text-gray-300 border-b-2 border-transparent"}`}
                  onClick={() => setRequestSubTab("received")}
                >
                  Request Received
                </button>
                <button
                  className={`text-lg font-medium pb-2 ${requestSubTab === "given" ? "text-white border-b-2 border-orange-500" : "text-gray-300 border-b-2 border-transparent"}`}
                  onClick={() => setRequestSubTab("given")}
                >
                  Request Given
                </button>
              </div>
              <button
                className="px-4 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white text-sm font-medium rounded-lg mb-2"
                onClick={openRequestModal}
              >
                Request Testimonial
              </button>
            </div>
            <div className="mt-0 h-px w-full bg-gray-700" />
          </div>
        )}

        {/* Content */}
        {activeTab !== "requests" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentTestimonials.map((t) => (
              <TestimonialItemCard
                key={t.id}
                name={t.name}
                text={t.text}
                avatarUrl={t.avatarUrl ?? undefined}
                size="sm"
              />
            ))}
          </div>
        ) : requestSubTab === "received" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {requestsReceived.map((t) => (
              <TestimonialItemCard
                key={t.id}
                name={t.name}
                text={t.text}
                avatarUrl={t.avatarUrl ?? undefined}
                size="sm"
                showActions
                onAccept={() => handleAccept(t.id, t.subjectId, t.name)}
                onReject={() => handleReject(t.id)}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {requestsGiven.map((t) => (
              <TestimonialItemCard
                key={t.id}
                name={t.name}
                text={t.text}
                avatarUrl={t.avatarUrl ?? undefined}
                size="sm"
                statusText="Request sent"
                onWithdraw={() => setWithdrawingId(String(t.id))}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {activeTab !== "requests" && currentTestimonials.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No testimonials found</p>
          </div>
        )}
        {/* Withdraw confirmation */}
        <ConfirmationDialog
          isOpen={!!withdrawingId}
          onClose={() => setWithdrawingId(null)}
          onConfirm={handleConfirmWithdraw}
          actionType="withdraw"
        />

        {/* Request Testimonial Modal */}
        <RequestTestimonialModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          onSubmit={async (toUserId: string, message: string) => {
            await createRequest({ toUserId, message }).unwrap();
            // A request you send belongs under "Request Given". Submitting left
            // the page on "Request Received", so the request just made was
            // nowhere on screen and looked as though it had not been created.
            setActiveTab("requests");
            setRequestSubTab("given");
            showToast({
              title: "Request sent",
              description: "You'll find it under Request Given.",
              kind: "success",
            });
          }}
          onSearchChange={setSearchQuery}
          members={(connectionsResp?.data as ConnectionCardApi[] || []).map((c) => ({ id: c.user.id, name: `${c.user.name} - ${c.user.chapter || 'No Chapter'}`, avatarUrl: c.user.avatarUrl || undefined }))}
        />

        {/* Write Testimonial Modal (after accept) */}
        <WriteTestimonialModal
          isOpen={isWriteModalOpen}
          onClose={() => setIsWriteModalOpen(false)}
          recipientName={selectedRequest?.recipientName || ""}
          onSubmit={async (_subject, body) => {
            if (!selectedRequest) return;
            try {
              // Ensure backend has the request marked as ACCEPTED before writing
              await respondRequest({ requestId: selectedRequest.requestId, action: "ACCEPT" }).unwrap();
              await writeTestimonial({ subjectId: selectedRequest.subjectId, text: body, rating: 5, requestId: selectedRequest.requestId }).unwrap();
              showToast({ title: "Testimonial submitted", description: "Your testimonial has been posted.", kind: "success" });
            } catch (error) {
              console.error("Write testimonial error:", error);
              
              showToast({ 
                title: "Failed to submit", 
                
                kind: "error" 
              });
            }
            setIsWriteModalOpen(false);
            setSelectedRequest(null);
          }}
        />
      </main>
    </div>
  );
}
