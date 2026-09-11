import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import GradientContainer from "../../components/common/GradientContainer";
import { 
  useVerifyPTeamMutation,
  useVerifyAdminTeamMutation
} from "../../services/authApi";
import { useToast } from "../../components/toast/ToastProvider";

type TeamType = 'pteam' | 'admin_team';

export default function PTeamInviteTest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";
  const [teamType, setTeamType] = useState<TeamType>('pteam');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [verificationData, setVerificationData] = useState<any>(null);
  const hasCalledApiRef = useRef(false);

  const [verifyPTeam] = useVerifyPTeamMutation();
  const [verifyAdminTeam] = useVerifyAdminTeamMutation();

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

  const getPasswordRoute = () => {
    return teamType === 'pteam' ? '/pteam/set-password' : '/auth/admin/team/set-password';
  };

  const isPTeam = teamType === 'pteam';

  // Call verification API on page load
  useEffect(() => {
    if (email && token && !verificationData && !isLoading && !hasCalledApiRef.current) {
      hasCalledApiRef.current = true;
      handleVerification();
    }
  }, [email, token, teamType]);

  async function handleVerification() {
    setIsLoading(true);
    setVerificationStatus('loading');
    try {
      const result = isPTeam
        ? await verifyPTeam({ token, email }).unwrap()
        : await verifyAdminTeam({ token, email }).unwrap();
      
      if (result.success) {
        setVerificationData(result.data);
        setVerificationStatus('success');
      }
    } catch (e: any) {
      setVerificationStatus('error');
      setVerificationData(null);
      showToast({ 
        title: "Verification Failed", 
        description: "We couldn't verify your invitation. The link may have expired or is invalid.", 
        kind: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleNavigateToVerify = () => {
    if (email && verificationData) {
      const passwordRoute = getPasswordRoute();
      navigate(`${passwordRoute}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-6"
      style={{
        // The scrim's own colour, so the page is not a washed grey while the
        // photograph below loads. Covered once it does.
        backgroundColor: "#0B1220",
        backgroundImage: "linear-gradient(rgba(11,18,32,0.85), rgba(11,18,32,0.85)), url('/auth-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-6xl shadow-2xl overflow-hidden backdrop-blur">
        <GradientContainer>
          {/* Header with Logo */}
          <div className="w-full bg-[#E9EEF1] flex flex-col items-center justify-center rounded-t-2xl">
            <img
              src="/ekam-logo2.png"
              alt="Ekam Logo"
              className="block h-24 md:h-28 object-contain m-0 p-0 leading-none"
              style={{ display: "block" }}
            />
          </div>

          {/* Main Content */}
          <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-8 md:p-12 rounded-2xl">
            <div className="text-center space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{getTeamName()} Invitation</h1>
              <p className="text-xl text-gray-300 mb-6 leading-relaxed max-w-3xl mx-auto">
                You've been handpicked to join an elite {getTeamName()}! We're verifying your invitation to unlock powerful collaboration tools and exclusive team features that will transform how you work.
              </p>

              {/* Status Display - Centered */}
              <div className="flex justify-center items-center py-6">
                {verificationStatus === 'loading' && (
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#D85D27] mx-auto"></div>
                    <p className="text-lg text-blue-400 font-medium">
                      Preparing your personalized workspace...
                    </p>
                    <p className="text-sm text-gray-400">
                      Setting up your exclusive team access and collaboration tools
                    </p>
                  </div>
                )}
                
                {verificationStatus === 'success' && (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl text-green-400 font-semibold mb-3">
                        Welcome to {getTeamName()}!
                      </p>
                      <p className="text-base text-gray-300 mb-4">
                        We're thrilled to have you join our elite team! Get ready to access cutting-edge tools and collaborate with industry leaders.
                      </p>
                      <div className="space-y-2 text-gray-300 text-base">
                        <p>
                          <span className="text-gray-400">Email:</span>
                          <span className="ml-3 text-white font-medium">{email}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {verificationStatus === 'error' && (
                  <div className="text-center space-y-6">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-2xl text-red-400 font-semibold mb-3">
                        Invitation Link Issue
                      </p>
                      <p className="text-gray-300 text-base mb-3">
                        We couldn't verify your invitation. This usually happens when:
                      </p>
                      <div className="text-left max-w-md mx-auto space-y-1 text-gray-400 mb-4 text-sm">
                        <p>• The invitation link has expired (24-hour limit)</p>
                        <p>• The invitation was already used</p>
                        <p>• The link was copied incorrectly</p>
                      </div>
                      <p className="text-gray-300 text-base">
                        Need help? Contact your team admin or support@ekam.com for immediate assistance.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-6">
                {verificationStatus === 'success' && (
                  <button
                    onClick={handleNavigateToVerify}
                    disabled={isLoading}
                    className="w-full max-w-md mx-auto px-8 py-4 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Activate My Account
                  </button>
                )}
                
                {verificationStatus === 'error' && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <button
                      onClick={handleVerification}
                      disabled={isLoading}
                      className="w-full px-8 py-4 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-semibold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full px-8 py-4 rounded-lg border border-gray-600 hover:bg-gray-800/50 text-white font-semibold text-lg transition-colors"
                    >
                      Return to Login
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </GradientContainer>
      </div>
    </div>
  );
}
