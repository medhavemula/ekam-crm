import { useNavigate } from "react-router-dom";
import AuthCard, { AUTH_SUBMIT, AuthSuccessMark } from "./AuthCard";

export default function PasswordChanged() {
  const navigate = useNavigate();
  return (
    <AuthCard
      icon={<AuthSuccessMark />}
      title="Password changed"
      caption="You can sign in with your new password now."
    >
      <button type="button" onClick={() => navigate("/login")} className={`mt-7 ${AUTH_SUBMIT}`}>
        Go to sign in
      </button>
    </AuthCard>
  );
}
