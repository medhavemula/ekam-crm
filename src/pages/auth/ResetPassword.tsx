import { useState } from "react";
import type { FormEvent } from "react";
import { useResetPasswordMutation } from "../../services/authApi";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthCard, { AUTH_SUBMIT } from "./AuthCard";
import FormInput from "../../components/forms/FormInput";
import { useToast } from "../../components/toast/ToastProvider";

// Same rule the server enforces (see passwordPolicy in auth validators).
const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { showToast } = useToast();
  const emailParam = sp.get("email") || "";
  const codeParam = sp.get("code") || "";

  const [email] = useState(emailParam);
  const [code] = useState(codeParam);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [reset, { isLoading }] = useResetPasswordMutation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    // basic validation
    setNewPasswordError("");
    setConfirmPasswordError("");
    let ok = true;
    if (!newPassword) {
      setNewPasswordError("New password is required");
      ok = false;
    } else if (!passwordPolicy.test(newPassword)) {
      // Same rule the server enforces, so the requirements are visible before
      // submitting rather than arriving as a validation error afterwards.
      setNewPasswordError(
        "Password must contain at least 8 characters, 1 uppercase, 1 lowercase, 1 number & 1 symbol (!@#$%^&*)",
      );
      ok = false;
    }
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      ok = false;
    } else if (confirmPassword !== newPassword) {
      setConfirmPasswordError("Passwords do not match");
      ok = false;
    }
    if (!ok) return;

    try {
      await reset({ email, code, password: newPassword }).unwrap();
      showToast({ title: "Password updated", description: "You can now log in with your new password.", kind: "success" });
      navigate("/password-changed");
    } catch (e: any) {
      const msg = e?.data?.message || "Failed to reset password.";
      showToast({ title: "Reset failed", description: String(msg), kind: "error" });
      throw e;
    }
  }

  // Inline message cards removed; we use toasts only

  return (
    <AuthCard
      title="Reset your password"
      caption="Choose a new password. You will use it to sign in from now on."
    >
      <form onSubmit={onSubmit} className="mt-7 space-y-5">
        <FormInput
          label="New password"
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          error={newPasswordError}
          isRequired
          showPasswordToggle={true}
        />
        <FormInput
          label="Confirm password"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={confirmPasswordError}
          isRequired
          showPasswordToggle={true}
        />

        <button type="submit" disabled={isLoading} className={AUTH_SUBMIT}>
          {isLoading ? "Submitting…" : "Reset password"}
        </button>
      </form>
    </AuthCard>
  );
}
