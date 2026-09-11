import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { 
  useSetPTeamPasswordMutation,
  useSetAdminTeamPasswordMutation
} from "../../services/authApi";
import { useNavigate, useSearchParams } from "react-router-dom";
import GradientContainer from "../../components/common/GradientContainer";
import FormInput from "../../components/forms/FormInput";
import { useToast } from "../../components/toast/ToastProvider";

type TeamType = 'pteam' | 'admin_team';

export default function PTeamVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

    const [tempPasswordInput, setTempPasswordInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [tempPasswordError, setTempPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [teamType, setTeamType] = useState<TeamType>('pteam');

  const [setPTeamPassword] = useSetPTeamPasswordMutation();
  const [setAdminTeamPassword] = useSetAdminTeamPasswordMutation();

  useEffect(() => {
    // Determine team type based on URL path
    const path = window.location.pathname;
    if (path.includes('/admin/')) {
      setTeamType('admin_team');
    } else {
      setTeamType('pteam');
    }
  }, []);

  const getTeamName = () => {
    return teamType === 'pteam' ? 'P-Team' : 'Admin Team';
  };

  const isPTeam = teamType === 'pteam';

  
  // Password validation function
  function validatePassword(pwd: string): string {
    if (!pwd) return "Password is required";
    if (pwd.length < 8) return "Password must be at least 8 characters long";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
    if (!/\d/.test(pwd)) return "Password must contain at least one number";
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return "Password must contain at least one special character";
    return "";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    
    // Reset errors
    setPasswordError("");
    setConfirmPasswordError("");
    setTempPasswordError("");
    let ok = true;

    // Validate temporary password
    if (!tempPasswordInput) {
      setTempPasswordError("Temporary password is required");
      ok = false;
    }

    // Validate new password
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      ok = false;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      ok = false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match");
      ok = false;
    }

    if (!ok) return;

    setIsLoading(true);
    try {
      if (isPTeam) {
        await setPTeamPassword({ 
          email, 
          tempPassword: tempPasswordInput, // Use user-entered temp password
          newPassword: password 
        }).unwrap();
      } else {
        await setAdminTeamPassword({ 
          email, 
          tempPassword: tempPasswordInput,
          newPassword: password 
        }).unwrap();
      }
      
      showToast({ 
        title: "Password Set Successfully", 
        description: `Your ${getTeamName()} account has been verified and password set.`, 
        kind: "success" 
      });
      navigate("/password-changed");
    } catch (e: any) {
      const msg = e?.data?.message || "Failed to set password.";
      showToast({ 
        title: "Password Setup Failed", 
        description: String(msg), 
        kind: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  }

  // If token or email is missing, show error
  if (!token || !email) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 md:p-6"
        style={{
          // The scrim's own colour, so the page is not a washed grey while the
          // photograph below loads. Covered once it does.
          backgroundColor: "#0B1220",
          backgroundImage: `linear-gradient(rgba(11,18,32,0.85), rgba(11,18,32,0.85)), url('${import.meta.env.BASE_URL}auth-bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full max-w-md shadow-2xl overflow-hidden backdrop-blur">
          <GradientContainer>
            <div className="w-full bg-[#E9EEF1] flex flex-col items-center justify-center rounded-t-2xl">
              <img
                src={`${import.meta.env.BASE_URL}ekam-logo2.png`}
                alt="Ekam Logo"
                className="block h-24 md:h-28 object-contain m-0 p-0 leading-none"
                style={{ display: "block" }}
              />
            </div>
            <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-8 rounded-2xl">
              <div className="text-center">
                <h1 className="text-2xl md:text-3xl font-semibold mb-4 text-red-400">Invalid Verification Link</h1>
                <p className="text-gray-300 mb-6">
                  The verification link is invalid or missing required parameters. Please check your email and try again.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  className="px-6 py-3 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </GradientContainer>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-6"
      style={{
        // The scrim's own colour, so the page is not a washed grey while the
        // photograph below loads. Covered once it does.
        backgroundColor: "#0B1220",
        backgroundImage: `linear-gradient(rgba(11,18,32,0.85), rgba(11,18,32,0.85)), url('${import.meta.env.BASE_URL}auth-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-lg shadow-2xl overflow-hidden backdrop-blur">
        <GradientContainer>
          {/* Header with Logo */}
          <div className="w-full bg-[#E9EEF1] flex flex-col items-center justify-center rounded-t-2xl">
            <img
              src={`${import.meta.env.BASE_URL}ekam-logo2.png`}
              alt="Ekam Logo"
              className="block h-24 md:h-28 object-contain m-0 p-0 leading-none"
              style={{ display: "block" }}
            />
          </div>

          {/* Main Content */}
          <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-8 rounded-2xl">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-center mb-4">Set Your Password</h1>
              <p className="text-center text-gray-300 mb-8">
                Create a secure password for your {getTeamName()} account.
              </p>

              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-4">
                  <FormInput
                    label="Temporary Password"
                    type="password"
                    placeholder="Enter temporary password"
                    value={tempPasswordInput}
                    onChange={(e) => setTempPasswordInput(e.target.value)}
                    error={tempPasswordError}
                    isRequired
                    showPasswordToggle={true}
                  />
                  <FormInput
                    label="New Password"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={passwordError}
                    isRequired
                    showPasswordToggle={true}
                  />
                  <FormInput
                    label="Confirm Password"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={confirmPasswordError}
                    isRequired
                    showPasswordToggle={true}
                  />
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Password Requirements:</h3>
                  <p className="text-xs text-gray-400">
                    Min 8 chars • 1 uppercase • 1 lowercase • 1 number • 1 special character
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-6 py-3 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Setting Password..." : "Set Password & Complete Registration"}
                </button>
              </form>
            </div>
          </div>
        </GradientContainer>
      </div>
    </div>
  );
}
