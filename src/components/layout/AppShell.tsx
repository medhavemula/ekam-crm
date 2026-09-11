import React from "react";
import { Link, NavLink } from "react-router-dom";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold">EKAM</Link>
            <nav className="hidden md:flex items-center gap-4 text-sm">
              <NavLink to="/app/business/deals" className={({isActive})=>isActive?"text-blue-600":"text-gray-600 hover:text-gray-900"}>Deals</NavLink>
              <NavLink to="/ui-preview" className={({isActive})=>isActive?"text-blue-600":"text-gray-600 hover:text-gray-900"}>UI Preview</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-600 hover:text-gray-900">Notifications</button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">U</div>
              <span className="text-sm">Profile</span>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </div>
    </div>
  );
}
