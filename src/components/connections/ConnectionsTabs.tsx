import React from "react";
import { TestimonialTabButton } from "../testimonials";
import UsersIcon from "../../assets/icons/users.svg";
import TestimonialsReceiveIcon from "../../assets/icons/testimonals-receive.svg";
import TestimonialsRequestsIcon from "../../assets/icons/testimonals-given.svg";

export type ConnectionsTabType = "connections" | "sent" | "received";

export interface ConnectionsTabsProps {
  activeTab: ConnectionsTabType;
  onChange: (tab: ConnectionsTabType) => void;
  counts: {
    connections: number;
    sent: number;
    received: number;
  };
}

export const ConnectionsTabs: React.FC<ConnectionsTabsProps> = ({ activeTab, onChange, counts }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <TestimonialTabButton
        title="My Connections"
        count={counts.connections}
        isActive={activeTab === "connections"}
        onClick={() => onChange("connections")}
        icon={<img src={UsersIcon} alt="users" className="w-8 h-8" />}
      />
      <TestimonialTabButton
        title="Sent Requests"
        count={counts.sent}
        isActive={activeTab === "sent"}
        onClick={() => onChange("sent")}
        icon={<img src={TestimonialsRequestsIcon} alt="testimonials requests" className="w-8 h-8" />}
      />
      <TestimonialTabButton
        title="Received Requests"
        count={counts.received}
        isActive={activeTab === "received"}
        onClick={() => onChange("received")}
        icon={<img src={TestimonialsReceiveIcon} alt="testimonials receive" className="w-8 h-8" />}
      />
    </div>
  );
};

export default ConnectionsTabs;
