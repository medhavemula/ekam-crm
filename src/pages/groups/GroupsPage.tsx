import React from "react";
import Navbar from "../../components/navigation/Navbar";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import GroupsHomePage from "./GroupsHomePage";
import GroupSuggestionsPage from "./GroupSuggestionsPage";
import GroupDetailPage from "./GroupDetailPage";
import EditGroupPage from "./EditGroupPage";

const GroupsLayout: React.FC = () => (
  <div className="min-h-screen bg-[linear-gradient(180deg,#0D1117_0%,#1E2630_100%)]">
    <Navbar />
    <div className="container mx-auto px-3 md:px-1 lg:px-2 py-6">
      <Outlet />
    </div>
  </div>
);

const GroupsPage: React.FC = () => {
  return (
    <Routes>
      <Route element={<GroupsLayout />}>
        <Route index element={<GroupsHomePage />} />
        <Route path="suggestions" element={<GroupSuggestionsPage />} />
        <Route path=":id" element={<GroupDetailPage />} />
        <Route path=":id/edit" element={<EditGroupPage />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
};

export default GroupsPage;
