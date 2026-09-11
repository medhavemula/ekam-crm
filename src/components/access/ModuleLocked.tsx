import Navbar from "../navigation/Navbar";
import { ADMIN_THEME } from "../../theme/themeScope";
import { useModuleAccessButton } from "../../hooks/useModuleAccessButton";

type Props = { 
  title: string; 
  description?: string;
  moduleKey?: "business" | "professional" | "social" | "groups";
  onUpgradeRequest?: (moduleKey: string) => void;
  hideNavbar?: boolean; // Add option to hide navbar
};

export default function ModuleLocked({ title, description, moduleKey, onUpgradeRequest, hideNavbar }: Props) {
  
  // Get button state from hook (only for valid module keys)
  const buttonState = moduleKey && moduleKey !== "groups" 
    ? useModuleAccessButton(moduleKey) 
    : { showButton: false, buttonText: "", buttonDisabled: true, openModal: false, status: "no-request" as const };
  
  // Groups module lock logic
  const isGroupsModule = moduleKey === "groups";

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      {!hideNavbar && <Navbar />}
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md px-4">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-wash)]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path fillRule="evenodd" d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm3 8V7a3 3 0 10-6 0v3h6z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="ekam-figure mb-2 text-[19px] font-bold text-[var(--ov-ink)]">{title}</h1>
          {description ? (
            <p className="mb-6 text-[13px] leading-5 text-[var(--ov-ink-4)]">{description}</p>
          ) : null}

          {/* Groups-specific message */}
          {isGroupsModule && (
            <p className="mb-6 text-[13px] leading-5 text-[var(--ov-ink-4)]">
              Access to Groups requires an active Business or Professional account. Please upgrade your account to join and create groups.
            </p>
          )}

          {/* Dynamic status message for non-groups modules */}
          {moduleKey && moduleKey !== "groups" && buttonState.showButton && (
            <p className="mb-6 text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {buttonState.status === "pending" &&
                "Your access request is being reviewed. We'll notify you once it's approved."
              }
              {buttonState.status === "rejected" &&
                "Your request was not approved this time. You can submit a new request using the button below."
              }
              {buttonState.status === "no-request" &&
                "Your account doesn't have permission to view this section. Click below to request access."
              }
            </p>
          )}
          
          {moduleKey && onUpgradeRequest && !isGroupsModule && buttonState.showButton && (
            <button
              onClick={() => buttonState.openModal && onUpgradeRequest(moduleKey)}
              className="inline-flex h-11 items-center rounded-xl bg-[var(--ov-ember-fill)] px-6 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
            >
              {buttonState.buttonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
