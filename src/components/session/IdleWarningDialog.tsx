import { useEffect, useState } from "react";
import {
  startIdleTracking,
  stopIdleTracking,
  recordActivity,
  getLastActivity,
  msUntilExpiry,
  IDLE_TIMEOUT_MS,
} from "../../lib/idleSession";
import { expireIdleSession } from "../../lib/tokenRefresh";

/**
 * Warns before an idle session ends, so unsaved work isn't discarded without notice.
 *
 * Mounted once inside the authenticated area. It owns the idle tracking for the app —
 * mounting it is what starts the clock, and unmounting on sign-out stops it.
 */
export default function IdleWarningDialog() {
  const [visible, setVisible] = useState(false);
  const [msLeft, setMsLeft] = useState(0);

  useEffect(() => {
    const stop = startIdleTracking({
      onWarn: () => setVisible(true),
      onExpire: () => {
        setVisible(false);
        expireIdleSession();
      },
    });
    return () => {
      stop();
      stopIdleTracking();
    };
  }, []);

  // Only tick while the dialog is up; there is nothing to count down otherwise.
  useEffect(() => {
    if (!visible) return;
    const update = () => setMsLeft(msUntilExpiry(getLastActivity(), Date.now(), IDLE_TIMEOUT_MS));
    update();
    const t = window.setInterval(update, 1000);
    return () => window.clearInterval(t);
  }, [visible]);

  if (!visible) return null;

  const total = Math.ceil(msLeft / 1000);
  const mmss = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;

  const staySignedIn = () => {
    recordActivity();
    setVisible(false);
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-title"
      aria-describedby="idle-body"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-sm rounded-xl bg-[#0F1724] p-6 text-white shadow-2xl">
        <h2 id="idle-title" className="text-lg font-semibold">
          Still there?
        </h2>
        <p id="idle-body" className="mt-2 text-sm text-gray-300">
          You'll be signed out in{" "}
          <span className="font-semibold tabular-nums text-orange-400">{mmss}</span> because of
          inactivity. Anything you haven't saved will be lost.
        </p>
        <button
          type="button"
          onClick={staySignedIn}
          autoFocus
          className="mt-5 w-full rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400"
        >
          Stay signed in
        </button>
      </div>
    </div>
  );
}
