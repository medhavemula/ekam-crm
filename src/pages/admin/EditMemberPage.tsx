import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import RegistrationStepper from "../../components/registration/RegistrationStepper";
import GradientContainer from "../../components/common/GradientContainer";
import BasicInfoStep from "../../components/registration/BasicInfoStep";
import BusinessStep from "../../components/registration/BusinessStep";
import ProfessionalStep from "../../components/registration/ProfessionalStep";
import LocationSelectionFields from "../../components/registration/LocationSelectionFields";
import Navbar from "../../components/navigation/Navbar";
import PageHeader from "../../components/common/PageHeader";
import { useEditMemberForm } from "../../hooks/useEditMemberForm";

interface EditMemberPageProps {
  memberId: string;
}

export default function EditMemberPage({ memberId }: EditMemberPageProps) {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement | null>(null);
  
  const {
    currentStep,
    setCurrentStep,
    errors,
    basicInfo,
    businessData,
    professionalData,
    isUpdating,
    isLoading,
    error,
    selectedModules,
    isLastStep,
    shouldAskNormalLocationInBusiness,
    shouldAskNormalLocationInProfessional,
    memberRes,
    isPendingMember,
    handleBasicInfoChange,
    handleBusinessChange,
    handleProfessionalChange,
    // handleEmailUpdateRequest, // Commented out - email functionality disabled
    handleNext,
    handleBack,
    handleSubmit,
  } = useEditMemberForm(memberId);

  
  if (isLoading) return <div className="text-white p-4">Loading member data...</div>;
  if (error) return <div className="text-red-500 p-4">Error loading member data: {error.toString()}</div>;

  const onSubmit = () => handleSubmit(isPendingMember);

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar userName="" />
      
      <main className="container mx-auto px-4 py-6">
        <PageHeader 
          breadcrumbs={[
            { label: "Regional Board", onClick: () => navigate("/admin/regional-board") }, 
            { label: "View Members", onClick: () => navigate(-1) }, 
            { label: isPendingMember ? "Edit Pending Member" : "Edit Member" }
          ]} 
        />

        <div className="flex items-start justify-center p-4 md:p-6 py-8">
          <div className="w-full max-w-full shadow-2xl backdrop-blur">
            <GradientContainer>
              {/* Main Content */}
              <div className="bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)] text-white p-4 md:p-10 rounded-2xl min-h-[600px]">
                <h1 className="text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8">
                  {isPendingMember ? "Edit Pending Member Information" : "Edit Member Information"}
                </h1>

                {/* Stepper */}
                <RegistrationStepper 
                  currentStep={currentStep} 
                  onStepClick={setCurrentStep}
                  isNormalRegistration={true}
                  moduleAccess={selectedModules.filter(module => module !== 'social')}
                  hideSocialStep={true}
                />

                {/* Form */}
                <form ref={formRef} className="mt-6 md:mt-8">
                  {currentStep === "BASIC" && (
                    <>
                      {/* Email functionality completely disabled - showing disabled input only */}
                      {/* emailMode="locked_with_popup" - commented to disable edit functionality */}
                      {/* onEmailUpdateRequest={handleEmailUpdateRequest} - commented to disable edit popup */}
                      <BasicInfoStep 
                        data={basicInfo} 
                        errors={errors} 
                        onChange={handleBasicInfoChange}
                        existingProfilePhotoUrl={(memberRes?.user as any)?.basicInfo?.profilePhotoUrl || (memberRes?.user as any)?.profilePhotoUrl}
                        registrationType="normal"
                        showLocationFields={false}
                        disableEmail={true}
                        hideSocialOption={true}
                      />
                    </>
                  )}

                  {currentStep === "BUSINESS" && (
                    <>
                      {shouldAskNormalLocationInBusiness && (
                        <LocationSelectionFields
                          data={basicInfo}
                          errors={errors}
                          onChange={(field, value) => handleBasicInfoChange(field, value)}
                          chapterValue={basicInfo.chapterRegistering}
                          onChapterChange={(id, name) => {
                            console.log('Chapter Change:', { id, name, currentChapterName: basicInfo.chapterName });
                            handleBasicInfoChange("chapterRegistering", id);
                            handleBasicInfoChange("chapterName", name);
                          }}
                          useSocialChapters={false}
                        />
                      )}
                      <BusinessStep 
                        data={businessData} 
                        errors={errors} 
                        onChange={handleBusinessChange}
                        regionId={basicInfo.regionId}
                      />
                    </>
                  )}

                  {currentStep === "PROFESSIONAL" && (
                    <>
                      {shouldAskNormalLocationInProfessional && (
                        <LocationSelectionFields
                          data={basicInfo}
                          errors={errors}
                          onChange={(field, value) => handleBasicInfoChange(field, value)}
                          chapterValue={basicInfo.chapterRegistering}
                          onChapterChange={(id, name) => {
                            console.log('Chapter Change:', { id, name, currentChapterName: basicInfo.chapterName });
                            handleBasicInfoChange("chapterRegistering", id);
                            handleBasicInfoChange("chapterName", name);
                          }}
                          useSocialChapters={false}
                        />
                      )}
                      <ProfessionalStep 
                        data={professionalData} 
                        errors={errors} 
                        onChange={handleProfessionalChange}
                        regionId={basicInfo.regionId}
                      />
                    </>
                  )}

                  {/* Navigation Buttons */}
                  <div className={`flex flex-col sm:flex-row ${currentStep === "BASIC" ? "justify-end" : "justify-between"} gap-3 mt-6 md:mt-8`}>
                    {currentStep !== "BASIC" && (
                      <button
                        type="button"
                        onClick={handleBack}
                        className="px-6 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors order-2 sm:order-1"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={isLastStep ? onSubmit : handleNext}
                      disabled={isUpdating}
                      className="px-6 py-2.5 rounded-lg bg-[#D85D27] hover:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                    >
                      {isLastStep ? (
                        isUpdating ? "Updating..." : (isPendingMember ? "Update Pending Member" : "Update Member")
                      ) : "Next"}
                    </button>
                  </div>
                </form>
              </div>
            </GradientContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
