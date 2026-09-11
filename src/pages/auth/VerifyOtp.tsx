import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVerifyOtpMutation, useVerifyOtpPasswordResetMutation, useResendOtpMutation, useForgotPasswordMutation } from "../../services/authApi";
import OtpInput from "../../components/forms/OtpInput";
import AuthCard, { AUTH_LINK, AUTH_SUBMIT } from "./AuthCard";
import { useToast } from "../../components/toast/ToastProvider";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const emailFromUrl = searchParams.get("email") || "";
  const purposeFromUrl = searchParams.get("purpose") || undefined;
  const typeFromUrl = searchParams.get("type") || undefined;

  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [verifyOtp, { isLoading: isVerifyingDefault }] = useVerifyOtpMutation();
  const [verifyOtpPasswordReset, { isLoading: isVerifyingPasswordReset }] = useVerifyOtpPasswordResetMutation();
  const [resendOtp, { isLoading: isResendingRegister }] = useResendOtpMutation();
  const [resendForgot, { isLoading: isResendingForgot }] = useForgotPasswordMutation();

  const handleOtpChange = (values: string[]) => {
    setOtpValues(values);
    if (otpError) setOtpError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const code = otpValues.join("");

    // Validate OTP
    if (code.length !== 6) {
      setOtpError("Please enter all 6 digits");
      return;
    }

    if (!emailFromUrl) {
      setOtpError("Email is missing. Please try again.");
      return;
    }

    try {
      if (purposeFromUrl === "password_reset") {
        await verifyOtpPasswordReset({ email: emailFromUrl, code }).unwrap();
      } else {
        await verifyOtp({ email: emailFromUrl, code }).unwrap();
      }
      // Navigate based on purpose (immediate)
      if (purposeFromUrl === "password_reset") {
        showToast({ title: "Verified", description: "Code verified. Set your new password.", kind: "success" });
        navigate(`/reset-password?email=${encodeURIComponent(emailFromUrl)}&code=${encodeURIComponent(code)}`);
      } else if (purposeFromUrl === "email_verification") {
        showToast({ title: "Verified", description: "Your email has been verified successfully.", kind: "success" });
        navigate(`/verification-success?purpose=${encodeURIComponent(purposeFromUrl)}`);
      } else {
        showToast({ title: "Verified", description: "Your email is verified.", kind: "success" });
        const typeParam = typeFromUrl ? `?type=${typeFromUrl}` : "";
        navigate(`/registration-success${typeParam}`);
      }
    } catch (err: any) {
      console.error("OTP verification failed:", err);
      const rawMsg = err?.data?.message || err?.error || "";
      const msg = typeof rawMsg === "string" ? rawMsg : String(rawMsg);
      if (/user\s*not\s*found/i.test(msg)) {
        setOtpError(msg);
        showToast({ title: "Verification failed", description: msg, kind: "error" });
      } else {
        setOtpError("Invalid verification code. Please try again.");
        showToast({ title: "Verification failed", description: "Invalid or expired code.", kind: "error" });
      }
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !emailFromUrl) return;

    try {
      if (purposeFromUrl === "password_reset") {
        // For forgot password, use forgot-password endpoint to send email
        await resendForgot({ email: emailFromUrl }).unwrap();
      } else {
        // For registration email verification, use resend-otp
        await resendOtp({ email: emailFromUrl }).unwrap();
      }
      // Set cooldown for 60 seconds
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      showToast({ title: "Code sent", description: "Check your email for the new code.", kind: "success" });
    } catch (err) {
      console.error("Resend OTP failed:", err);
      showToast({ title: "Failed to resend", description: "Please try again.", kind: "error" });
    }
  };

  // Inline message cards removed; using toasts only

  return (
    <AuthCard
      title="Verification"
      caption={
        emailFromUrl
          ? `We sent a six-digit code to ${emailFromUrl}.`
          : "Enter the six-digit code we sent you."
      }
      footer={
        purposeFromUrl === "password_reset" ? (
          <button type="button" onClick={() => navigate("/login")} className={AUTH_LINK}>
            Back to sign in
          </button>
        ) : undefined
      }
    >
      {emailFromUrl && (
        // Was a blue panel — the only blue in the product — and it listed four
        // ticks as though each were a step you had to take. Three of them are
        // one thing: the mail may take a moment, and may not be in the inbox.
        <div className="mt-6 rounded-xl bg-[var(--ov-fill-subtle)] px-4 py-3.5 text-[13px] leading-5 text-[var(--ov-ink-3)] ring-1 ring-[color:var(--ov-line)]">
          Delivery can take two or three minutes. If it has not arrived, check your spam
          folder before asking for another one.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-7 space-y-6">
        <OtpInput length={6} value={otpValues} onChange={handleOtpChange} error={otpError} />

        <button
          type="submit"
          disabled={isVerifyingDefault || isVerifyingPasswordReset}
          className={AUTH_SUBMIT}
        >
          {isVerifyingDefault || isVerifyingPasswordReset ? "Verifying…" : "Submit"}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={resendCooldown > 0 || isResendingRegister || isResendingForgot}
            className={`${AUTH_LINK} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isResendingRegister || isResendingForgot
              ? "Sending…"
              : resendCooldown > 0
                ? `Resend code (${resendCooldown}s)`
                : "Resend code"}
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
