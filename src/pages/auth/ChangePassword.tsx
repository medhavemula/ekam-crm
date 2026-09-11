import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthCard, { AUTH_LINK, AUTH_SUBMIT } from "./AuthCard";
import FormInput from "../../components/forms/FormInput";
import { useChangePasswordMutation } from "../../services/authApi";
import { useToast } from "../../components/toast/ToastProvider";

const passwordRules = [
  "Minimum 8 characters",
  "At least one uppercase letter (A-Z)",
  "At least one lowercase letter (a-z)",
  "At least one number (0-9)",
  "At least one special character (!@#$%^&*)",
];

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export default function ChangePassword() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const { showToast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oldPasswordError, setOldPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  // Inline submit error removed; using toasts only

  // Allow guests when coming from forgot-password flow (mode=reset). Otherwise require auth.
  useEffect(() => {
    const mode = sp.get("mode");
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
    if (!hasToken && mode !== "reset") {
      navigate("/login", { replace: true });
    }
  }, [sp, navigate]);

  useEffect(() => {
    const tempPwd = localStorage.getItem("tempPassword");
    if (tempPwd) setOldPassword(tempPwd);
  }, []);


  const validate = () => {
    let ok = true;
    setOldPasswordError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
    // Using toasts only

    if (!oldPassword) {
      setOldPasswordError("Current password is required");
      ok = false;
    }

    if (!newPassword) {
      setNewPasswordError("New password is required");
      ok = false;
    } else if (!passwordRegex.test(newPassword)) {
      setNewPasswordError(
        "Password must contain at least 8 chars, 1 uppercase, 1 lowercase, 1 number & 1 special character"
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

    return ok;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) {
        // Surface a clear message if token is missing so Authorization won't be attached
        console.warn("ChangePassword: missing accessToken; Authorization header will not be sent");
        showToast({ title: "Not authenticated", description: "Please login again to change your password.", kind: "error" });
        navigate("/login", { replace: true });
        return;
      }
      const result: any = await changePassword({ oldPassword, newPassword }).unwrap();
      // The server retires the old sessions and hands back a fresh pair, so keep the
      // person signed in and carry on. Clearing the tokens here is what used to dump
      // them back at the login screen straight after setting their password.
      try {
        if (result?.accessToken) localStorage.setItem("accessToken", result.accessToken);
        if (result?.refreshToken) localStorage.setItem("refreshToken", result.refreshToken);
        localStorage.removeItem("mustChangePassword");
        localStorage.removeItem("tempPassword");
      } catch {}
      showToast({ title: "Password changed", description: "You're all set.", kind: "success" });
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to change password. Please try again.";
      showToast({ title: "Change failed", description: String(msg), kind: "error" });
    }
  };

  return (
    <AuthCard
      title={sp.get("mode") === "reset" ? "Reset your password" : "Change your password"}
      caption="Choose a password you have not used here before."
      footer={
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem("accessToken");
              localStorage.removeItem("refreshToken");
              localStorage.removeItem("isLoggedIn");
              localStorage.removeItem("mustChangePassword");
            } catch {}
            navigate("/login", { replace: true });
          }}
          className={AUTH_LINK}
        >
          Back to sign in
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <FormInput
          label="Current password"
          type="password"
          placeholder="Enter current password"
          value={oldPassword}
          onChange={(e) => {
            setOldPassword(e.target.value);
            if (oldPasswordError) setOldPasswordError("");
          }}
          error={oldPasswordError}
          isRequired
          showPasswordToggle
        />

        <FormInput
          label="New password"
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (newPasswordError) setNewPasswordError("");
          }}
          error={newPasswordError}
          isRequired
          showPasswordToggle
        />

        <FormInput
          label="Confirm password"
          type="password"
          placeholder="Enter confirm password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (confirmPasswordError) setConfirmPasswordError("");
          }}
          error={confirmPasswordError}
          isRequired
          showPasswordToggle
        />

        {/* What the password has to satisfy, stated where it is being chosen
            rather than after it is rejected. */}
        <ul className="space-y-1 text-[12px] leading-5 text-[var(--ov-ink-4)]">
          {passwordRules.map((rule, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true" className="text-[var(--ov-ink-5)]">
                •
              </span>
              {rule}
            </li>
          ))}
        </ul>

        <button type="submit" disabled={isLoading} className={AUTH_SUBMIT}>
          {isLoading ? "Submitting…" : "Submit"}
        </button>
      </form>
    </AuthCard>
  );
}
