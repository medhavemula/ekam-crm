import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { ADMIN_THEME } from "../../theme/themeScope";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { useListReportsQuery, useResolveReportMutation } from "../../services/moderationApi";
import { useToast } from "../../components/toast/ToastProvider";

const CONTENT_LABELS: Record<string, string> = {
  BUSINESS_POST: "Business Post",
  PROFESSIONAL_POST: "Professional Post",
  GROUP_POST: "Group Post",
  BUSINESS_COMMENT: "Business Comment",
  PROFESSIONAL_COMMENT: "Professional Comment",
  GROUP_COMMENT: "Group Comment",
  CHAT_MESSAGE: "Message",
  SOCIAL_EVENT: "Social Event",
  SOCIAL_ACTIVITY: "Social Activity",
  GROUP: "Group",
  PROFESSIONAL_PROFILE: "Professional Profile",
  BUSINESS_PROFILE: "Business Profile",
  SOCIAL_PROFILE: "Social Profile",
};

const STATUS_OPTIONS = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED", "ALL"];

const STATUS_STYLES: Record<string, string> = {
  OPEN: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  REVIEWING: "border-blue-400/40 bg-blue-400/10 text-blue-200",
  RESOLVED: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  DISMISSED: "border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] text-[var(--ov-ink-3)]",
};

type MediaItem = {
  url?: string;
  key?: string;
  type?: string;
  mime?: string;
  name?: string;
};

const formatDate = (value?: string | Date) => {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getMediaKind = (item: MediaItem) => {
  const raw = `${item.type || ""} ${item.mime || ""} ${item.url || ""}`.toLowerCase();
  if (raw.includes("video") || raw.match(/\.(mp4|mov|webm)(\?|$)/)) return "video";
  if (raw.includes("image") || raw.match(/\.(png|jpe?g|webp|gif|avif)(\?|$)/)) return "image";
  return "file";
};

const getMediaUrl = (item: MediaItem) => item.url || item.key || "";

const getInitial = (value?: string) => (value || "?").trim().charAt(0).toUpperCase();

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.OPEN}`}>
      {status}
    </span>
  );
}

function PersonSummary({ label, person }: { label: string; person: any }) {
  const name = person?.name || person?.email || "Unknown";
  return (
    <div className="flex items-center gap-3 rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-trough)] p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#33363B] text-sm font-bold text-[var(--ov-ink)]">
        {getInitial(name)}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ov-ink-5)]">{label}</div>
        <div className="truncate text-sm font-semibold text-[var(--ov-ink)]">{name}</div>
        {person?.email && person?.name ? <div className="truncate text-xs text-[var(--ov-ink-4)]">{person.email}</div> : null}
      </div>
    </div>
  );
}

function MediaPreview({ media }: { media: MediaItem[] }) {
  if (!Array.isArray(media) || media.length === 0) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-[color:var(--ov-line)] bg-[var(--ov-trough)] text-sm text-[var(--ov-ink-5)]">
        No media attached
      </div>
    );
  }

  const visible = media.slice(0, 4);
  return (
    <div className={`grid gap-2 ${visible.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {visible.map((item, index) => {
        const kind = getMediaKind(item);
        const url = getMediaUrl(item);
        return (
          <div
            key={`${url}-${index}`}
            className={`relative overflow-hidden rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-trough)] ${
              visible.length === 1 ? "aspect-[16/9]" : "aspect-[4/3]"
            }`}
          >
            {kind === "image" && url ? (
              <img src={url} alt="Reported content attachment" className="h-full w-full object-cover" />
            ) : kind === "video" && url ? (
              <video src={url} controls className="h-full w-full bg-black object-contain" />
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-[var(--ov-ink-2)] hover:text-[var(--ov-ink)]"
              >
                <span className="rounded-full bg-[#33363B] px-3 py-1 text-xs font-semibold uppercase text-[var(--ov-ink-4)]">File</span>
                <span className="line-clamp-2 break-all">{item.name || item.key || item.url || "Attachment"}</span>
              </a>
            )}
            {index === 3 && media.length > 4 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-lg font-bold text-[var(--ov-ink)]">
                +{media.length - 4}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function ContentReportsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [status, setStatus] = useState("OPEN");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useListReportsQuery({ status, page, limit: 10 });
  const [resolveReport, { isLoading: isResolving }] = useResolveReportMutation();

  const reports = data?.data?.items || [];
  const selectedReport = useMemo(
    () => reports.find((report: any) => String(report._id) === selectedReportId) || reports[0],
    [reports, selectedReportId],
  );

  const totals = useMemo(
    () => ({
      all: data?.data?.total || 0,
      open: reports.filter((report: any) => report.status === "OPEN").length,
      media: reports.filter((report: any) => Array.isArray(report.content?.media) && report.content.media.length > 0).length,
    }),
    [data?.data?.total, reports],
  );

  const handleResolve = async (action: "REMOVE_CONTENT" | "DISMISS" | "EJECT_USER") => {
    if (!selectedReport?._id) return;
    try {
      await resolveReport({
        reportId: String(selectedReport._id),
        action,
        note: adminNote || undefined,
      }).unwrap();
      showToast({
        title: action === "DISMISS" ? "Report dismissed" : "Content action completed",
        description:
          action === "DISMISS"
            ? "Reporter will be notified that the report was reviewed."
            : "Reporter will be notified and the content has been removed.",
        kind: "success",
      });
      setAdminNote("");
      refetch();
    } catch (error: any) {
      showToast({
        title: "Failed to update report",
        description: error?.data?.message || "Please try again.",
        kind: "error",
      });
    }
  };

  const total = data?.data?.total || 0;
  const hasNext = page * 10 < total;
  const media = (selectedReport?.content?.media || []) as MediaItem[];

  return (
    <div className={`${ADMIN_THEME} min-h-screen`}
      style={{ background: "var(--ov-floor)" }}>
      <Navbar userName="Admin" onNotificationClick={() => navigate("/notifications")} />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
        <PageHeader
          breadcrumbs={[
            { label: "Dashboard", onClick: () => navigate("/dashboard") },
            { label: "Content Reports", onClick: () => {} },
          ]}
        />

        <div className="mb-6 flex flex-col gap-4 border-b border-[color:var(--ov-line)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2">
              <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]">
                  Moderation Queue
                </span>
              </div>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-[var(--ov-deep-ink,var(--ov-ink))] md:text-3xl">Content Reports</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--ov-deep-ink-2,var(--ov-ink-4))]">
              Review reported posts and messages, inspect attached media, and resolve user reports from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
                setSelectedReportId(null);
              }}
              className="h-10 rounded border border-[color:var(--ov-line)] bg-[#1a2332] px-3 text-sm font-semibold text-[var(--ov-ink)] outline-none focus:border-[#D85D27]"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => refetch()}
              className="h-10 rounded border border-[#D85D27] px-4 text-sm font-semibold text-[var(--ov-on-ember)] hover:bg-[var(--ov-ember-fill)]/20"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-panel)] p-4">
            <div className="text-xs font-semibold uppercase text-[var(--ov-ink-5)]">Filtered reports</div>
            <div className="mt-2 text-2xl font-bold text-[var(--ov-ink)]">{totals.all}</div>
          </div>
          <div className="rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-panel)] p-4">
            <div className="text-xs font-semibold uppercase text-[var(--ov-ink-5)]">Open on this page</div>
            <div className="mt-2 text-2xl font-bold text-amber-200">{totals.open}</div>
          </div>
          <div className="rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-panel)] p-4">
            <div className="text-xs font-semibold uppercase text-[var(--ov-ink-5)]">With media</div>
            <div className="mt-2 text-2xl font-bold text-[#D85D27]">{totals.media}</div>
          </div>
        </div>

        <div className="grid min-h-[720px] gap-5 lg:grid-cols-[430px_minmax(0,1fr)]">
          <section className="flex min-h-[720px] flex-col overflow-hidden rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-panel)]">
            <div className="shrink-0 flex items-center justify-between border-b border-[color:var(--ov-line)] px-4 py-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--ov-ink)]">Report Queue</h2>
                <p className="text-sm text-[var(--ov-ink-4)]">{total} report{total === 1 ? "" : "s"} found</p>
              </div>
              <StatusChip status={status === "ALL" ? "OPEN" : status} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-5 text-sm text-[var(--ov-ink-2)]">Loading reports...</div>
              ) : reports.length === 0 ? (
                <div className="p-5 text-sm text-[var(--ov-ink-4)]">No reports found for this filter.</div>
              ) : (
                reports.map((report: any) => {
                  const active = String(selectedReport?._id) === String(report._id);
                  const reportMedia = (report.content?.media || []) as MediaItem[];
                  const firstImage = reportMedia.find((item) => getMediaKind(item) === "image");
                  return (
                    <button
                      key={String(report._id)}
                      type="button"
                      onClick={() => setSelectedReportId(String(report._id))}
                      className={`block w-full border-b border-[color:var(--ov-line-faint)] px-4 py-4 text-left transition ${
                        active ? "bg-[var(--ov-ember-fill)]/14 shadow-[inset_3px_0_0_#D85D27]" : "hover:bg-[#232B3B]"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-trough)]">
                          {firstImage ? (
                            <img src={getMediaUrl(firstImage)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--ov-ink-5)]">
                              {CONTENT_LABELS[report.contentType]?.split(" ")[0] || "Post"}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="truncate text-sm font-bold text-[var(--ov-ink)]">
                              {CONTENT_LABELS[report.contentType] || report.contentType}
                            </div>
                            <span className="shrink-0 text-xs text-[var(--ov-ink-5)]">{formatDate(report.createdAt)}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <StatusChip status={report.status} />
                            <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[11px] font-semibold text-red-200">
                              {report.reason}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-[var(--ov-ink-2)]">
                            {report.content?.text || report.details || "No text preview available."}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="shrink-0 flex items-center justify-between gap-3 border-t border-[color:var(--ov-line)] px-4 py-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded bg-[#33363B] px-3 py-1.5 text-sm font-semibold text-[var(--ov-ink)] disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-[var(--ov-ink-4)]">Page {page}</span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((value) => value + 1)}
                className="rounded bg-[#33363B] px-3 py-1.5 text-sm font-semibold text-[var(--ov-ink)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-panel)]">
            {!selectedReport ? (
              <div className="flex h-full items-center justify-center p-8 text-sm text-[var(--ov-ink-4)]">
                Select a report to review.
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="border-b border-[color:var(--ov-line)] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-wide text-[var(--ov-ink-5)]">Reported content</div>
                      <h2 className="mt-1 text-2xl font-bold text-[var(--ov-ink)]">
                        {CONTENT_LABELS[selectedReport.contentType] || selectedReport.contentType}
                      </h2>
                      <p className="mt-2 text-sm text-[var(--ov-ink-4)]">
                        Reported on {formatDate(selectedReport.createdAt)} • Content status:{" "}
                        {selectedReport.content?.status || "Unknown"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusChip status={selectedReport.status} />
                      <span className="rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[11px] font-semibold text-red-200">
                        {selectedReport.reason}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid flex-1 gap-5 p-5 xl:grid-cols-[minmax(0,1.1fr)_360px]">
                  <div className="space-y-5">
                    <MediaPreview media={media} />

                    <div className="rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-trough)] p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ov-ink-5)]">Post content</div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[var(--ov-ink)]">
                        {selectedReport.content?.text || "No text content available."}
                      </p>
                    </div>

                    <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-red-200">Report details</div>
                      <div className="mt-2 text-sm font-semibold text-[var(--ov-ink)]">{selectedReport.reason}</div>
                      <p className="mt-2 text-sm leading-6 text-[var(--ov-ink-2)]">
                        {selectedReport.details || "The member did not add extra details."}
                      </p>
                    </div>
                  </div>

                  <aside className="space-y-4">
                    <PersonSummary label="Reporter" person={selectedReport.reporterId} />
                    <PersonSummary label="Reported member" person={selectedReport.targetUserId} />

                    <div className="rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-trough)] p-4">
                      <label htmlFor="admin-review-note" className="text-xs font-semibold uppercase tracking-wide text-[var(--ov-ink-5)]">
                        Admin review note
                      </label>
                      <textarea
                        id="admin-review-note"
                        value={adminNote}
                        onChange={(event) => setAdminNote(event.target.value)}
                        rows={5}
                        placeholder="Add what was reviewed and why this action is being taken..."
                        className="mt-3 w-full resize-none rounded border border-[color:var(--ov-line)] bg-[var(--ov-trough)] p-3 text-sm text-[var(--ov-ink)] outline-none placeholder:text-[var(--ov-ink-5)] focus:border-[#D85D27]"
                      />
                    </div>

                    <div className="rounded-lg border border-[color:var(--ov-line)] bg-[var(--ov-trough)] p-4">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ov-ink-5)]">Moderation action</div>
                      <div className="grid gap-2">
                        <button
                          type="button"
                          disabled={isResolving || selectedReport.status === "RESOLVED"}
                          onClick={() => handleResolve("REMOVE_CONTENT")}
                          className="h-11 rounded bg-red-600 px-4 text-sm font-bold text-[var(--ov-ink)] hover:bg-red-700 disabled:opacity-50"
                        >
                          Remove Content
                        </button>
                        <button
                          type="button"
                          disabled={isResolving || selectedReport.status === "RESOLVED"}
                          onClick={() => handleResolve("EJECT_USER")}
                          className="h-11 rounded border border-[color:var(--ov-danger)] px-4 text-sm font-bold text-red-100 hover:bg-red-500/15 disabled:opacity-50"
                        >
                          Remove + Eject User
                        </button>
                        <button
                          type="button"
                          disabled={isResolving || selectedReport.status === "DISMISSED"}
                          onClick={() => handleResolve("DISMISS")}
                          className="h-11 rounded border border-[color:var(--ov-line-strong)] px-4 text-sm font-bold text-[var(--ov-ink)] hover:bg-[#33363B] disabled:opacity-50"
                        >
                          Dismiss Report
                        </button>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
