// import { useGetModuleAccessStatusQuery } from "../services/moduleAccessApi"; // Commented out - not used in current implementation

export type ModuleButtonState = {
  showButton: boolean;
  buttonText: string;
  buttonDisabled: boolean;
  openModal: boolean;
  status: "has-access" | "pending" | "rejected" | "no-request" | "loading";
};

export const useModuleAccessButton = (_moduleKey: "business" | "professional" | "social"): ModuleButtonState => {
  // Always block the upgrade request button for user modules
  return {
    showButton: false,
    buttonText: "",
    buttonDisabled: true,
    openModal: false,
    status: "has-access"
  };
  
  // Original logic is now commented out - button is blocked for all user modules
  /*
  const { data: moduleAccessData, isLoading, error } = useGetModuleAccessStatusQuery();
  
  if (isLoading) {
    return {
      showButton: true,
      buttonText: "Loading...",
      buttonDisabled: true,
      openModal: false,
      status: "loading"
    };
  }

  if (error) {
    return {
      showButton: true,
      buttonText: "Error Loading",
      buttonDisabled: true,
      openModal: false,
      status: "loading"
    };
  }

  const currentModuleAccess = moduleAccessData?.data?.moduleAccess?.[moduleKey];
  const currentModuleStatus = moduleAccessData?.data?.moduleRequestStatus?.[moduleKey];
  
  // User has access - no button needed
  if (currentModuleAccess === true || currentModuleStatus === "APPROVED") {
    return {
      showButton: false,
      buttonText: "",
      buttonDisabled: true,
      openModal: false,
      status: "has-access"
    };
  }
  
  // Request is pending - show waiting button, no modal
  if (currentModuleStatus === "PENDING") {
    return {
      showButton: true,
      buttonText: "Waiting for Approval",
      buttonDisabled: false,
      openModal: false,
      status: "pending"
    };
  }
  
  // Request was rejected - show request again button
  if (currentModuleStatus === "REJECTED") {
    return {
      showButton: true,
      buttonText: "Request Again",
      buttonDisabled: false,
      openModal: true,
      status: "rejected"
    };
  }
  
  // No request made - show upgrade now button
  return {
    showButton: true,
    buttonText: "Upgrade Now",
    buttonDisabled: false,
    openModal: true,
    status: "no-request"
  };
  */
};
