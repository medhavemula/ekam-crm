import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useForgotPasswordMutation, useResendOtpMutation } from "../../services/authApi";
import FormInput from "../../components/forms/FormInput";
import { validateEmail } from "../../utils/validation";
import AuthCard, { AUTH_LINK, AUTH_SUBMIT } from "./AuthCard";
import { useToast } from "../../components/toast/ToastProvider";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [resendOtp] = useResendOtpMutation();
  const [showTempPwdModal, setShowTempPwdModal] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Send OTP and navigate only on success
    try {
      await forgotPassword({ email }).unwrap();
      // Worded for the fact that this response is now identical whether or not the
      // address is registered — claiming a code was sent would be untrue for the rest.
      showToast({ title: "Check your email", description: "If an account exists for that address, we've sent a reset code.", kind: "success" });
      navigate(`/verify-otp?email=${encodeURIComponent(email)}&purpose=password_reset`);
    } catch (err: any) {
      console.error("Forgot password failed:", err);
      const code = err?.data?.code;
      const rawMsg = err?.data?.message || err?.error || "";
      const msg = typeof rawMsg === "string" ? rawMsg : String(rawMsg);
      if (code === "TEMP_PASSWORD_NOT_CHANGED" || /temporary\s*password/i.test(msg)) {
        showToast({ title: "Action required", description: msg || "Please login with your temporary password and change it first.", kind: "info" });
        setShowTempPwdModal(true);
      } else if (code === "EMAIL_NOT_VERIFIED") {
        try {
          // Send OTP for email verification
          await resendOtp({ email, purpose: "email_verification" }).unwrap();
          showToast({ title: "Email not verified", description: "Please verify your email before resetting password. OTP sent to your email.", kind: "info" });
          navigate(`/verify-otp?email=${encodeURIComponent(email)}&purpose=email_verification`);
        } catch (resendErr: any) {
          console.error("Resend OTP failed:", resendErr);
          showToast({ title: "Failed to send verification code", description: "Unable to send verification code. Please try again.", kind: "error" });
        }
      } else if (/user\s*not\s*found/i.test(msg)) {
        showToast({ title: "User not found", description: "No account exists with that email.", kind: "error" });
      } else {
        showToast({ title: "Failed to send code", description: "Email verification failed. Please check your email and try again.", kind: "error" });
      }
      // Stay on page
    }
  };

  // Inline message cards removed; we use toasts only

  return (
    <AuthCard
      title="Forgot password"
      caption="Enter the email your membership is registered to and we will send you a link to set a new password."
      footer={
        <>
          <button type="button" onClick={() => navigate("/resend-credentials")} className={AUTH_LINK}>
            Resend login credentials
          </button>
          <button type="button" onClick={() => navigate("/login")} className={AUTH_LINK}>
            Back to sign in
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <FormInput
          label="Email"
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={handleEmailChange}
          error={emailError}
          isRequired
        />

        <button type="submit" disabled={isLoading} className={AUTH_SUBMIT}>
          {isLoading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      {/* An account still on its issued temporary password cannot reset by
          email, because the link would land on an account that has never been
          signed into. */}
      {showTempPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[rgba(0,0,0,0.55)] backdrop-blur-sm"
            onClick={() => setShowTempPwdModal(false)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-[var(--ov-panel)] p-8 text-center shadow-2xl ring-1 ring-[color:var(--ov-line)]">
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-wash)]"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 12c2.761 0 5-2.239 5-5S14.761 2 12 2 7 4.239 7 7s2.239 5 5 5Z" />
                <path d="M21 22a9 9 0 1 0-18 0" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className="ekam-figure text-[19px] font-bold text-[var(--ov-ink)]">
              Update your temporary password first
            </h2>
            <p className="mx-auto mt-2.5 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              Sign in with the credentials emailed to you and set a password of your own. You
              can reset it from here after that.
            </p>
            <button
              type="button"
              onClick={() => {
                const q = new URLSearchParams();
                if (email) q.set("email", email);
                q.set("mustChange", "true");
                navigate(`/login${q.toString() ? `?${q.toString()}` : ""}`);
              }}
              className={`mt-6 ${AUTH_SUBMIT}`}
            >
              Go to sign in
            </button>
          </div>
        </div>
      )}
    </AuthCard>
  );
}
