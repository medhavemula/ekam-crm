import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useResendCredentialsMutation } from "../../services/authApi";
import FormInput from "../../components/forms/FormInput";
import { validateEmail } from "../../utils/validation";
import AuthCard, { AUTH_LINK, AUTH_SUBMIT } from "./AuthCard";
import { useToast } from "../../components/toast/ToastProvider";

export default function ResendCredentials() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [resendCredentials, { isLoading }] = useResendCredentialsMutation();

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

    // Send credentials
    try {
      await resendCredentials({ email }).unwrap();
      // Worded for the fact that this response is now the same whether or not the
      // address has an account waiting on first sign-in. Anything specific to the
      // account's state is sent to the address itself.
      showToast({
        title: "Check your email",
        description:
          "If an account exists for that address and is waiting on its first sign-in, we've sent its credentials.",
        kind: "success"
      });
      navigate("/login");
    } catch (err: any) {
      console.error("Resend credentials failed:", err);
      // The server no longer distinguishes account states here, so a failure means a
      // genuine problem rather than something about this particular address.
      showToast({
        title: "Failed to send credentials",
        description: "Unable to send credentials. Please check your email and try again.",
        kind: "error"
      });
    }
  };

  return (
    <AuthCard
      title="Resend credentials"
      caption="We will send your login details to the email your membership is registered to."
      footer={
        <button type="button" onClick={() => navigate("/login")} className={AUTH_LINK}>
          Back to sign in
        </button>
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
          {isLoading ? "Sending…" : "Send credentials"}
        </button>
      </form>
    </AuthCard>
  );
}
