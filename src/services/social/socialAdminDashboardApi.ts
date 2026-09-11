// Re-export everything from the new modular structure for backward compatibility
export * from "./types";
export * from "./dashboardApi";
export * from "./regionalBoardApi";
export * from "./regionalTeamApi";
export * from "./chaptersApi";
export * from "./eventsApi";
export * from "./teamApi";
export * from "./volunteersApi";

// Legacy export - keep the old API name for backward compatibility
export { socialDashboardApi as socialAdminDashboardApi } from "./dashboardApi";
