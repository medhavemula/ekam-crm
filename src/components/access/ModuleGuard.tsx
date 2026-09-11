import React, { useMemo, useState } from "react";
import { useAppSelector } from "../../app/store";
import ModuleLocked from "./ModuleLocked";
import UpgradeRequestModal from "../modals/UpgradeRequestModal";
import { useToast } from "../toast/ToastProvider";
import { useRole } from "../../hooks/useRole";

type Props = {
  moduleKey: "business" | "professional" | "social";
  children: React.ReactElement;
  /**
   * Roles refused this page whatever their account says. For a section that is
   * not meant for them at all, rather than one they could be granted: no
   * upgrade path is offered, because there is nothing to upgrade.
   */
  lockedFor?: readonly string[];
  lockedTitle?: string;
  lockedDescription?: string;
};

export default function ModuleGuard({
  moduleKey,
  children,
  lockedFor,
  lockedTitle,
  lockedDescription,
}: Props) {
  const access = useAppSelector((s) => s.auth.user?.moduleAccess);
  const { role } = useRole();
  // Roles that reach the business module regardless of what their own account's
  // moduleAccess says. The regional roles were listed; the platform
  // administrators were not, and an admin account carries
  // moduleAccess.business = false because it is not a chapter member — so a
  // super admin following "Send message" from a member's profile was told they
  // don't have access to Business, on their own platform.
  const privilegedBusinessRoles = useMemo(
    () =>
      new Set([
        "SUPER_ADMIN",
        "SUPER_ADMIN_TEAM",
        "EXECUTIVE_DIRECTOR",
        "REGIONAL_DIRECTOR",
        "ASSISTANT_REGIONAL_DIRECTOR",
        "ED_TEAM",
      ]),
    [],
  );
  const isPrivilegedBusinessRole = moduleKey === "business" && privilegedBusinessRoles.has(role);
  const allowed = isPrivilegedBusinessRole || access?.[moduleKey] !== false; // default allow if missing
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { showToast } = useToast();

  const handleUpgradeRequest = async (module: string, reason: string) => {
    // TODO: Replace with actual API call
    console.log(`Upgrade request for ${module}:`, reason);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Show success notification
    showToast({
      title: "Upgrade Request Submitted",
      description: `Your request for ${module.charAt(0).toUpperCase() + module.slice(1)} module access has been sent for approval.`,
      kind: "success"
    });
  };

  if (lockedFor?.includes(role)) {
    return (
      <ModuleLocked
        title={lockedTitle || "This section isn't available for your account"}
        description={lockedDescription}
      />
    );
  }

  if (!allowed) {
    const titleMap: Record<string, string> = {
      business: "You don't have access to Business",
      professional: "You don't have access to Professional",
      social: "You don't have access to Social",
    };
    return (
      <>
        <ModuleLocked
          title={titleMap[moduleKey] || "Access Restricted"}
          description={
            "This section is not enabled for your account. Contact your administrator if you believe you should have access."
          }
          moduleKey={moduleKey}
          onUpgradeRequest={() => setShowUpgradeModal(true)}
        />
        <UpgradeRequestModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          moduleKey={moduleKey}
          onSubmit={handleUpgradeRequest}
        />
      </>
    );
  }

  return children;
}
