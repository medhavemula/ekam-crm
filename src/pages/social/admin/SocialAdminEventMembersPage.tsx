import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SocialLayout } from "../../../components/social";
import { FormInput } from "../../../components/forms";
import GradientContainer from "../../../components/common/GradientContainer";
import { useGetSocialEventMembersQuery } from "../../../services/social";

export default function SocialAdminEventMembersPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [chapter, setChapter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 24;

  const queryParams = useMemo(
    () => ({
      eventId: eventId || "",
      name: name || undefined,
      area: area || undefined,
      chapter: chapter || undefined,
      page,
      limit,
    }),
    [eventId, name, area, chapter, page]
  );

  const { data, isLoading, isFetching } = useGetSocialEventMembersQuery(queryParams, {
    skip: !eventId,
  });

  const members = data?.data?.items || [];
  const total = data?.data?.total || 0;

  const handleSearch = () => {
    setPage(1);
  };

  return (
    <SocialLayout>
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <button
          onClick={() => navigate("/social/admin/upcoming-events")}
          className="hover:text-white transition-colors"
        >
          Upcoming Events
        </button>
        <span>›</span>
        <span className="text-white">View Members</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <FormInput
          label=""
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <FormInput
          label=""
          placeholder="Enter Area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <FormInput
          label=""
          placeholder="Enter Chapter"
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <div className="flex items-end">
          <button
            onClick={handleSearch}
            className="w-full bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg px-4 py-3 text-sm font-medium transition-colors"
            disabled={isFetching}
          >
            Search
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D85D27] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {members.length > 0 ? (
            members.map((m: any, idx: number) => {
              const displayName = m?.name || m?.fullName || "Unknown";
              const email = m?.email || "";
              const phone = m?.phone || m?.mobile || "";
              const chapterName = m?.chapter || m?.chapterName || m?.socialChapterName || "";
              const avatarUrl = m?.avatarUrl || "";
              const avatarInitial = (displayName || "U").charAt(0).toUpperCase();

              return (
                <GradientContainer
                  key={`${m?.id || email || displayName}-${idx}`}
                  className="rounded-[12px] max-w-[444px] w-full"
                >
                  <div className="min-h-[126px] rounded-[10px] bg-[linear-gradient(180deg,#111722_0%,#1B2430_100%)] px-5 py-5">
                    <div className="flex items-center gap-5">
                      <div className="h-[96px] w-[96px] shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#D85D27]/20">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-[#D85D27] text-white text-3xl font-semibold">
                            {avatarInitial}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[28px] font-semibold leading-[1.05] tracking-[0.01em] text-white">
                          {displayName}
                        </div>
                        {email && (
                          <div className="mt-2 truncate text-[18px] font-medium leading-[1.2] text-white/90">
                            {email}
                          </div>
                        )}
                        {phone && (
                          <div className="mt-2 truncate text-[18px] font-medium leading-[1.2] text-white/85">
                            {phone}
                          </div>
                        )}
                        {chapterName && (
                          <div className="mt-3 truncate text-[18px] font-medium leading-[1.2] text-[#F47A2A]">
                            {chapterName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </GradientContainer>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12 text-gray-400">
              No members found.
            </div>
          )}
        </div>
      )}

      {total > 0 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Page {page} • Total {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="px-4 py-2 rounded-md bg-[#1a2332] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3342] transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= total || isFetching}
              className="px-4 py-2 rounded-md bg-[#1a2332] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#2a3342] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </SocialLayout>
  );
}
