import type { FC } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type Props = {
  illustrationSrc?: string;
};

const RegistrationSuccess: FC<Props> = ({ illustrationSrc = "/success-illustration.png" }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const registrationType = searchParams.get("type");

  const handleDone = () => {
    // Navigate back to the specific registration page based on type
    switch (registrationType) {
      case "business":
        navigate("/business/register");
        break;
      case "professional":
        navigate("/professional/register");
        break;
      case "social":
        navigate("/social/register");
        break;
      default:
        navigate("/register");
        break;
    }
  };

  return (
    <div className="w-full shadow-2xl overflow-hidden rounded-2xl">
      <div className="w-full bg-[#E9EEF1] flex flex-col items-center justify-center rounded-t-2xl">
        <img
          src={`${import.meta.env.BASE_URL}ekam-logo2.png`}
          alt="Ekam Logo"
          className="block h-24 md:h-28 object-contain m-0 p-0 leading-none"
          style={{ display: "block", marginBottom: "-10px" }}
        />
      </div>

      <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-6 md:p-10 rounded-b-2xl flex flex-col items-center">
        <div className="w-full max-w-3xl flex flex-col items-center text-center">
          <img src={illustrationSrc} alt="Registration Illustration" className="w-[220px] h-auto mx-auto mb-6 md:mb-10" />

          <h2 className="text-2xl md:text-4xl font-semibold text-[#D85D27] mb-4">Registration completed successfully</h2>

          <p className="text-base md:text-lg text-gray-200 max-w-xl mb-8">
            Your request has been submitted. You’ll receive your login credentials via email once approved by the admin.
          </p>

          <button
            onClick={handleDone}
            className="px-32 py-3 rounded-full border border-[#D85D27] text-white font-semibold hover:bg-[#D85D27]/10 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSuccess;
