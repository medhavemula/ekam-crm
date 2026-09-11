import RegistrationSuccess from "../../components/registration/RegistrationSuccess";

export default function RegistrationSuccessPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-6"
      style={{
        // The scrim's own colour, so the page is not a washed grey while the
        // photograph below loads. Covered once it does.
        backgroundColor: "#0B1220",
        backgroundImage:
          `linear-gradient(rgba(11,18,32,0.9), rgba(11,18,32,0.9)), url('${import.meta.env.BASE_URL}auth-bg.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="w-full max-w-7xl">
        <RegistrationSuccess illustrationSrc={`${import.meta.env.BASE_URL}success-illustration.png`} />
      </div>
    </div>
  );
}
