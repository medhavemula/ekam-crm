import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface AdminPersonalDetail {
  memberNumber?: string;
  phone?: string;
  email?: string;
  address?: string;
  chapterName?: string;
  chapterRegion?: string;
  expiryDate?: string;
  daysLeft?: number;
}

export interface AdminTimelineItem {
  id: string | number;
  time?: string;
  title: string;
  subtitle?: string;
}

export default function AdminPersonalDetailsCard({
  details,
  timeline = [],
  onExtend,
  hideExpiry = false,
}: {
  details: AdminPersonalDetail;
  timeline?: AdminTimelineItem[];
  onExtend?: () => void;
  hideExpiry?: boolean;
}) {
  const [showAllActions, setShowAllActions] = React.useState(false);
  const visibleTimeline = showAllActions ? timeline : timeline.slice(0, 6);
  const hiddenActionCount = Math.max(0, timeline.length - visibleTimeline.length);

  const Row = ({ icon, children, alignTop = false }: { icon: React.ReactNode; children: React.ReactNode; alignTop?: boolean }) => (
    <div className={`flex ${alignTop ? "items-start" : "items-center"} gap-3 md:gap-4`}>
      <div className="text-[#FF6A21] flex-shrink-0 mt-0.5" aria-hidden>
        {icon}
      </div>
      <div className="text-white/90 text-[16px] leading-relaxed">{children}</div>
    </div>
  );

  return (
    <GradientContainer className="">
      <div className="rounded-[18px] border border-white/10 p-5 md:p-8 flex flex-col">
        <h3 className="text-xl md:text-2xl font-semibold text-white">Personal Details</h3>
        <div className="h-px bg-white/10 my-4 md:my-5 -mx-5 md:-mx-8" />

        <div className="space-y-3 md:space-y-4">
          {details.memberNumber ? (
            <Row
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2H6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h1V7Zm2 0v2h6V7H9Zm6 14v-2H9v2h6Zm5-4v-4H6v4h14Z"/></svg>}
            >
              <span>{details.memberNumber}</span>
            </Row>
          ) : null}

          {details.phone ? (
            <Row
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59 2 2 0 0 0 2.11-.45l1.27-1.27a1 1 0 0 1 1.11-.22c1 .41 2.09.69 3.2.82a1 1 0 0 1 .88 1v3a2 2 0 0 1-2.18 2 19.7 19.7 0 0 1-8.64-3.08 19.5 19.5 0 0 1-6-6A19.7 19.7 0 0 1 2 4.18 2 2 0 0 1 4 2h3a1 1 0 0 1 1 .88c.13 1.11.41 2.2.82 3.2a1 1 0 0 1-.22 1.11L7.33 8.46a2 2 0 0 0-.71 2.33z"/></svg>}
            >
              <a className="hover:underline" href={`tel:${details.phone}`}>{details.phone}</a>
            </Row>
          ) : null}

          {details.email ? (
            <Row
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-1.4 4.25-6.07 4.21a1 1 0 0 1-1.06 0L5.4 8.25a1 1 0 1 1 1.2-1.6L12 10.6l5.4-3.95a1 1 0 1 1 1.2 1.6Z"/></svg>}
            >
              <a className="hover:underline" href={`mailto:${details.email}`}>{details.email}</a>
            </Row>
          ) : null}

          {details.address ? (
            <Row
              alignTop
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a8 8 0 0 0-8 8c0 5 8 12 8 12s8-7 8-12a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"/></svg>}
            >
              <p className="whitespace-pre-line break-words">{details.address}</p>
            </Row>
          ) : null}
        </div>

        {(details.chapterName || (!hideExpiry && details.expiryDate)) ? (
          <>
            <div className="h-px bg-white/10 my-6 -mx-5 md:-mx-8" />
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
              <div className="md:col-span-2 flex flex-col justify-center">
                <h3 className="text-base font-semibold text-white mb-2">Chapter Details</h3>
                <div className="px-1">
                  {details.chapterName ? (
                    <div className="text-[26px] md:text-[28px] font-semibold text-[#FF6A21] leading-tight">{details.chapterName}</div>
                  ) : null}
                  {details.chapterRegion ? (
                    <div className="text-[14px] md:text-[16px] text-white/80 leading-tight mt-1">{details.chapterRegion}</div>
                  ) : null}
                </div>
              </div>
              {!hideExpiry && (
              <div className="md:col-span-3 md:border-l md:border-white/10 md:pl-6 flex flex-col relative">
                <div className="pr-28">
                  <h3 className="text-base font-semibold text-white mb-2">Expiry date</h3>
                  <div>
                    <div className="text-[20px] md:text-[22px] font-semibold text-white leading-tight">{details.expiryDate || "-"}</div>
                    {typeof details.daysLeft === "number" ? (
                      <div className="inline-block mt-2 px-3 py-1 rounded bg-[#FF6A21] text-white text-[11px]">
                        {details.daysLeft} Days Left
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="absolute top-0 right-0">
                  <button
                    type="button"
                    onClick={onExtend}
                    className="h-9 w-[92px] rounded-md border border-[#FF6A21] text-white hover:bg-[#FF6A21]/15"
                  >
                    Extend
                  </button>
                </div>
              </div>
              )}
            </div>
          </>
        ) : null}

        <div className="h-px bg-white/10 my-6 -mx-5 md:-mx-8" />

        <div className="mt-6">
          <div className="relative">
            <div className="absolute left-[170px] top-0 bottom-0 w-px bg-white/20" />
            <div className="space-y-6 md:space-y-8">
              {visibleTimeline.map((t) => (
                <div key={t.id} className="relative grid items-center" style={{ gridTemplateColumns: '170px 1fr' }}>
                  {/* Dot on the timeline line */}
                  <div className="absolute left-[170px] top-5 -translate-x-1/2">
                    <div className="h-2.5 w-2.5 rounded-full border-2 border-[#FF6A21] bg-[#0f1419]" />
                  </div>
                  <div className="self-start pt-1 text-white/70 text-sm md:text-base pr-6 text-right whitespace-nowrap">
                    {t.time || ""}
                  </div>
                  <div className="self-start text-white/90 pl-6 min-w-0">
                    <div className="text-[15px] md:text-[16px] font-medium leading-snug">{t.title}</div>
                    {t.subtitle ? (
                      <div className="mt-1 text-white/60 text-sm md:text-[15px] leading-snug break-words">
                        {t.subtitle}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            {timeline.length > 6 ? (
              <div className="mt-6 pl-[196px]">
                <button
                  type="button"
                  onClick={() => setShowAllActions((prev) => !prev)}
                  className="inline-flex items-center rounded-md border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  {showAllActions
                    ? "Show fewer actions"
                    : `Show ${hiddenActionCount} more action${hiddenActionCount === 1 ? "" : "s"}`}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </GradientContainer>
  );
}
