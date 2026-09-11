import React from "react";
import { LogIn, ShieldAlert, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import GradientContainer from "../../components/common/GradientContainer";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { useAppDispatch } from "../../app/store";
import { clearAuth } from "../../features/auth/authSlice";
import { useHardDeleteMeMutation, useMeQuery } from "../../services/authApi";
import { usePushNotifications } from "../../components/push/PushNotificationsProvider";
import { socketService } from "../../services/socketService";

function purgeLocalSession() {
  const keys = [
    "accessToken",
    "refreshToken",
    "isLoggedIn",
    "userEmail",
    "userName",
    "mustChangePassword",
    "tempPassword",
    "userRole",
    "userRoles",
    "moduleAccess",
    "rememberMe",
  ];

  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

/**
 * One popup, one confirmation.
 *
 * This used to be a full page — a hero, two side cards, a "what happens
 * next" list, and a three-modal cascade (review, then a second review, then
 * a cancel-confirm) before the account was actually deleted. All of that
 * collapsed to the one thing this screen needs to do: ask, and act on the
 * answer. The real safeguard is that this is destructive and admits it in
 * plain words in the dialog itself, not a typed phrase to slow the reader
 * down.
 */
export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isAuthed =
    typeof window !== "undefined" && Boolean(window.localStorage.getItem("accessToken"));
  const { data: meRes } = useMeQuery(undefined, { skip: !isAuthed });
  const [hardDeleteMe, { isLoading }] = useHardDeleteMeMutation();
  const { cleanupPushSession } = usePushNotifications();

  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = React.useState(false);

  const me = (meRes?.data as any) || {};
  const email = me?.email || "your account";

  const handleLoginToContinue = () => {
    try {
      sessionStorage.setItem("postLoginRedirect", "/delete-account?step=confirm");
    } catch {}
    navigate("/delete-account/login");
  };

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (!isAuthed || searchParams.get("step") !== "confirm") return;
    setErrorMessage(null);
    setIsConfirmOpen(true);
    navigate("/delete-account", { replace: true });
  }, [isAuthed, location.search, navigate]);

  const handleDeleteAccount = async () => {
    setErrorMessage(null);
    try {
      await hardDeleteMe().unwrap();
      try {
        await cleanupPushSession();
      } catch {
        // ignore push cleanup failures — the account is already gone
      }
      socketService.forceDisconnectAll();
      purgeLocalSession();
      dispatch(clearAuth());
      setDeleteSuccess(true);
      setIsConfirmOpen(false);
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err?.data?.message || err?.message || "Failed to permanently delete account.");
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1a2433_0%,#101722_45%,#0B1118_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-md">
        <GradientContainer className="overflow-hidden rounded-[24px]">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,28,40,0.96)_0%,rgba(14,20,30,0.98)_100%)] p-8 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
              <Trash2 className="h-5 w-5" />
            </span>

            <h1 className="mt-5 text-xl font-bold text-white">Delete your account</h1>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              {isAuthed
                ? "This permanently deletes your EKAM account. This cannot be undone."
                : "Log in to the account you want to delete — you'll come straight back here."}
            </p>

            {errorMessage && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            {deleteSuccess && (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Your account has been deleted. Redirecting you now…
              </div>
            )}

            {!deleteSuccess && (
              <button
                type="button"
                onClick={() => (isAuthed ? setIsConfirmOpen(true) : handleLoginToContinue())}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                {isAuthed ? (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete my account
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Log in to continue
                  </>
                )}
              </button>
            )}

            {isAuthed && !deleteSuccess && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <ShieldAlert className="h-3.5 w-3.5" />
                Signed in as {email}
              </p>
            )}
          </div>
        </GradientContainer>
      </div>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDeleteAccount}
        isSubmitting={isLoading}
        actionType="delete"
        title="Delete your EKAM account?"
        description={`This permanently deletes ${email} and everything tied to it. This cannot be undone.`}
        confirmText={isLoading ? "Deleting…" : "Delete permanently"}
      />
    </div>
  );
}
