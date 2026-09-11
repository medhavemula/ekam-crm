import { useNavigate, useSearchParams } from "react-router-dom";
import AuthCard, { AUTH_LINK, AUTH_SUBMIT, AuthSuccessMark } from "./AuthCard";

export default function VerificationSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const purpose = searchParams.get("purpose") || "";

  const getTitle = () => {
    switch (purpose) {
      case "email_verification":
        return "Email Verified Successfully";
      case "password_reset":
        return "Password Reset Initiated";
      default:
        return "Verification Successful";
    }
  };

  const getMessage = () => {
    switch (purpose) {
      case "email_verification":
        return "Your email address has been successfully verified. You can now proceed with your forgot password request.";
      case "password_reset":
        return "Your verification code has been confirmed. You can now set your new password.";
      default:
        return "Your verification has been completed successfully.";
    }
  };

  const getButtonText = () => {
    switch (purpose) {
      case "email_verification":
        return "Continue to Login";
      case "password_reset":
        return "Set New Password";
      default:
        return "Continue";
    }
  };

  const handleContinue = () => {
    switch (purpose) {
      case "email_verification":
        navigate("/login");
        break;
      case "password_reset":
        // This will be handled by the redirect logic in VerifyOtp
        navigate("/login");
        break;
      default:
        navigate("/login");
    }
  };

  return (
    <AuthCard
      icon={<AuthSuccessMark />}
      title={getTitle()}
      caption={getMessage()}
      footer={
        <button type="button" onClick={() => navigate("/login")} className={AUTH_LINK}>
          Back to sign in
        </button>
      }
    >
      <button type="button" onClick={handleContinue} className={`mt-7 ${AUTH_SUBMIT}`}>
        {getButtonText()}
      </button>
    </AuthCard>
  );
}
