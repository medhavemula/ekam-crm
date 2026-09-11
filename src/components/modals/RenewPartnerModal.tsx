import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import DatePicker from "../common/DatePicker";
import CalendarIcon from "../../assets/icons/calendar.svg";

interface PartnerData {
  name: string;
  phone: string;
  email: string;
  country: any;          // was: string
  region: any;
  registrationDate: any;
  renewalDate?: any;
  expiryDate?: any;
}

interface RenewPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (renewalDate: string, expiryDate: string) => void;
  partnerData: PartnerData;
}

const toText = (v: any): string => {
  if (v == null) return "—";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object") {
    const name = v.name ?? v.label ?? v.title;
    const id   = v.id ?? v._id ?? v.value;
    return String(name ?? id ?? "—");
  }
  return "—";
};

/** DD/MM/YYYY for display. */
const formatDate = (date: Date | string): string => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/** DD/MM/YYYY (or ISO) to YYYY-MM-DD for the API; "" when unparseable. */
const parseDateInput = (dateStr: string): string => {
  if (!dateStr) return "";
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/").map(Number);
    if (
      !isNaN(day) && !isNaN(month) && !isNaN(year) &&
      month >= 1 && month <= 12 && day >= 1 && day <= 31
    ) {
      const date = new Date(year, month - 1, day);
      if (
        !isNaN(date.getTime()) &&
        date.getDate() === day &&
        date.getMonth() === month - 1 &&
        date.getFullYear() === year
      ) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
    return "";
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const RenewPartnerModal: React.FC<RenewPartnerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  partnerData,
}) => {
  const reduceMotion = useReducedMotion();

  const [registeredOn, setRegisteredOn] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [error, setError] = useState<{ renewal?: string; expiry?: string }>({});

  useEffect(() => {
    if (!isOpen || !partnerData) return;

    const registration = partnerData.registrationDate
      ? formatDate(partnerData.registrationDate) || formatDate(new Date())
      : formatDate(new Date());
    setRegisteredOn(registration);

    const today = new Date();
    const nextExpiry = new Date(today);
    nextExpiry.setFullYear(nextExpiry.getFullYear() + 1);

    setRenewalDate(formatDate(today));
    setExpiryDate(formatDate(nextExpiry));
    setError({});
  }, [isOpen, partnerData]);

  // Escape closes. The dialog previously dismissed only on a backdrop click.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleExpiryDateChange = (dateStr: string) => {
    setExpiryDate(dateStr);
    setError({});
  };

  const handleRenewalDateChange = (dateStr: string) => {
    setRenewalDate(dateStr);
    setError({});
  };

  /** Length of the term the two dates describe, for a sanity check before committing. */
  const termDays = useMemo(() => {
    const from = parseDateInput(renewalDate);
    const to = parseDateInput(expiryDate);
    if (!from || !to) return null;
    const diff = Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000,
    );
    return Number.isFinite(diff) ? diff : null;
  }, [renewalDate, expiryDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedRenewalDate = parseDateInput(renewalDate || expiryDate);
    const formattedExpiryDate = parseDateInput(expiryDate);

    const next: { renewal?: string; expiry?: string } = {};
    if (!formattedRenewalDate) next.renewal = "Enter a renewal date as DD/MM/YYYY.";
    if (!formattedExpiryDate) next.expiry = "Enter an expiry date as DD/MM/YYYY.";
    if (
      formattedRenewalDate &&
      formattedExpiryDate &&
      new Date(formattedExpiryDate) <= new Date(formattedRenewalDate)
    ) {
      next.expiry = "Expiry must come after the renewal date.";
    }

    if (next.renewal || next.expiry) {
      setError(next);
      return;
    }

    onSubmit(formattedRenewalDate, formattedExpiryDate);
  };

  const facts = [
    { label: "Email", value: toText(partnerData?.email) },
    { label: "Phone", value: toText(partnerData?.phone) },
    { label: "Country", value: toText(partnerData?.country) },
    { label: "Region", value: toText(partnerData?.region) },
    { label: "Registered", value: registeredOn || "—" },
  ];

  const fieldLabel = "mb-1.5 block text-xs text-gray-400";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="renew-title"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-pop)] ring-1 ring-[color:var(--ov-line)]"
          >
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
              <div className="min-w-0">
                <h2
                  id="renew-title"
                  className="ekam-figure text-[20px] font-bold leading-tight text-[var(--ov-ink)]"
                >
                  Renew membership
                </h2>
                <p className="mt-1 truncate text-[13px] text-[var(--ov-ink-3)]">
                  {toText(partnerData?.name)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Who this is, as reference. It was six label-and-value rows filling
                most of the dialog — context for a decision that is only about two
                dates, and on a page that already names the partner. */}
            <dl className="mx-5 grid grid-cols-2 gap-x-4 gap-y-2.5 rounded-xl bg-[var(--ov-fill-subtle)] p-4 sm:mx-6">
              {facts.map((f) => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-[11px] text-[var(--ov-ink-4)]">{f.label}</dt>
                  <dd className="truncate text-[12.5px] text-[var(--ov-ink-2)]" title={f.value}>
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
              {/* Renewal first, then expiry: a term starts before it ends, and the
                  previous order put the end date above the start. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={fieldLabel} htmlFor="renew-renewal-date">
                    Renewal date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="renew-renewal-date"
                    value={renewalDate}
                    onChange={handleRenewalDateChange}
                    iconSrc={CalendarIcon}
                    className="h-11 w-full"
                  />
                  {error.renewal && (
                    <p className="mt-1.5 text-[11px] text-[var(--ov-danger)]">{error.renewal}</p>
                  )}
                </div>

                <div>
                  <label className={fieldLabel} htmlFor="renew-expiry-date">
                    Expiry date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    id="renew-expiry-date"
                    value={expiryDate}
                    onChange={handleExpiryDateChange}
                    iconSrc={CalendarIcon}
                    className="h-11 w-full"
                    minDate={renewalDate || registeredOn}
                  />
                  {error.expiry && (
                    <p className="mt-1.5 text-[11px] text-[var(--ov-danger)]">{error.expiry}</p>
                  )}
                </div>
              </div>

              {/* The figure the operator is really deciding on. */}
              {termDays !== null && termDays > 0 && !error.expiry && (
                <p className="mt-3 text-[12px] text-[var(--ov-ink-4)]">
                  Term of{" "}
                  <span className="ekam-figure font-semibold text-[var(--ov-ink-2)]">
                    {termDays}
                  </span>{" "}
                  {termDays === 1 ? "day" : "days"}
                </p>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 rounded-xl px-4 text-[13px] font-medium text-[var(--ov-ink-3)] transition-colors hover:bg-[var(--ov-fill-subtle)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)]"
                >
                  Renew
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RenewPartnerModal;
