import React from "react";
import RightLeftArrows from "../../assets/icons/right-left-arrows.svg";
import UsersIcon from "../../assets/icons/users.svg";
import DotCalender from "../../assets/icons/DotCalender.svg";
import TickCalender from "../../assets/icons/TickCalender.svg";
import FundsDonated from "../../assets/icons/FundsDonated.svg";
import FundsRaised from "../../assets/icons/FundsRaised.svg";
import OnGoingCalender from "../../assets/icons/OnGoingCaleder.svg";
import UpComingCalender from "../../assets/icons/UpcomingCalender.svg";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?:
    | "exchange"
    | "users"
    | "dot-calender"
    | "tick-calender"
    | "funds-donated"
    | "funds-raised"
    | "social-users"
    | "on-going-calender"
    | "up-coming-calender";
  className?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, className = "", onClick }) => {
  const renderIcon = () => {
    if (icon === "exchange") {
      return <img src={RightLeftArrows} alt="exchange" className="h-10 w-10 opacity-70" />;
    }
    if (icon === "users") {
      return <img src={UsersIcon} alt="users" className="h-10 w-10 opacity-70" />;
    }
    if (icon === "social-users") {
      return <img src={UsersIcon} alt="users" className="h-12 w-12 opacity-90" />;
    }
    if (icon == "dot-calender") {
      return <img src={DotCalender} alt="dot-calender" className="h-10 w-10 opacity-70" />;
    }
    if (icon == "tick-calender") {
      return <img src={TickCalender} alt="tick-calender" className="h-10 w-10 opacity-70" />;
    }
    if (icon == "funds-donated") {
      return <img src={FundsDonated} alt="funds-donated" className="h-10 w-10 opacity-70" />;
    }
    if (icon == "funds-raised") {
      return <img src={FundsRaised} alt="funds-raised" className="h-10 w-10 opacity-70" />;
    }
    if (icon == "on-going-calender") {
      return <img src={OnGoingCalender} alt="funds-raised" className="h-10 w-10 opacity-70" />;
    }
    if (icon == "up-coming-calender") {
      return <img src={UpComingCalender} alt="funds-raised" className="h-10 w-10 opacity-70" />;
    }
    return null;
  };

  return (
    <div 
      className={`rounded-2xl p-4 md:p-6 h-full flex flex-col justify-between ${className} ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
      onClick={onClick}
    >
      {/* Title */}
      <h3 className="text-sm sm:text-base text-white mb-3 w-full truncate leading-tight">{title}</h3>

      {/* Value + Icon */}
      <div className="flex items-end justify-between">
        <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-orange-500 leading-none">{value}</p>
        {icon && <div className="ml-3 shrink-0">{renderIcon()}</div>}
      </div>
    </div>
  );
};
<svg width="62" height="70" viewBox="0 0 62 70" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path
    d="M42.1794 58.4805C39.9138 58.4805 37.9815 57.687 36.3824 56.0998C34.7833 54.5127 33.9825 52.5992 33.9799 50.3593C33.9773 48.1194 34.7781 46.2033 36.3824 44.6111C37.9866 43.0188 39.919 42.2266 42.1794 42.2342C44.4398 42.2419 46.3721 43.0355 47.9764 44.6149C49.5806 46.1944 50.3802 48.1092 50.375 50.3593C50.3698 52.6094 49.569 54.5242 47.9725 56.1037C46.376 57.6831 44.445 58.4754 42.1794 58.4805ZM6.25812 70C4.47562 70 2.98762 69.4087 1.79412 68.226C0.600624 67.0433 0.00258333 65.5676 0 63.7987V14.7641C0 12.9978 0.598041 11.5233 1.79412 10.3406C2.99021 9.15798 4.4795 8.56537 6.262 8.56281H13.1169V0H17.2902V8.56281H45.012V0H48.887V8.56281H55.7419C57.5244 8.56281 59.0137 9.15542 60.2097 10.3406C61.4058 11.5259 62.0026 13.0016 62 14.768V63.7987C62 65.565 61.4032 67.0408 60.2097 68.226C59.0162 69.4112 57.5257 70.0026 55.738 70H6.25812ZM6.25812 66.1602H55.7419C56.336 66.1602 56.8824 65.9144 57.381 65.4229C57.8796 64.9314 58.1276 64.3887 58.125 63.7948V30.1273H3.875V63.7987C3.875 64.3875 4.123 64.9289 4.619 65.4229C5.115 65.917 5.66137 66.1627 6.25812 66.1602ZM3.875 26.2836H58.125V14.7641C58.125 14.1754 57.877 13.6339 57.381 13.1399C56.885 12.6458 56.3373 12.4001 55.738 12.4026H6.262C5.66525 12.4026 5.11758 12.6484 4.619 13.1399C4.12042 13.6314 3.87242 14.1741 3.875 14.768V26.2836Z"
    fill="white"
  />
</svg>;

export default StatCard;
