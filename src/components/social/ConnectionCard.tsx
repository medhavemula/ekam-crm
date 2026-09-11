import React from "react";
import GradientContainer from "../common/GradientContainer";

export interface BaseSocialConnectionCardProps {
  name: string;
  avatar?: string;
  title: string;
  company: string;
  mutualConnections?: number;
}

export interface MyConnectionsCardProps extends BaseSocialConnectionCardProps {
  onMessage?: () => void;
  onRemove?: () => void;
  onCardClick?: () => void;
}

export interface ConnectionActionCardProps extends BaseSocialConnectionCardProps {
  type: "requests" | "pending" | "suggested";
  onConnect?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}

export interface ConnectionCardProps extends BaseSocialConnectionCardProps {
  type: "connections" | "requests" | "pending" | "suggested";
  onConnect?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
  onMessage?: () => void;
}


export const MyConnectionsCard: React.FC<MyConnectionsCardProps> = ({
  name,
  avatar,
  title,
  company,
  mutualConnections,
  onMessage,
  onRemove,
  onCardClick,
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onCardClick?.();
  };

  return (
    <GradientContainer className="w-full overflow-hidden cursor-pointer" onClick={handleCardClick}>
      <div className="p-5 overflow-hidden rounded-[14px]">
        <div className="flex flex-row items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#4a5568] overflow-hidden flex items-center justify-center shrink-0">
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-white">{name.charAt(0)}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-white text-lg font-semibold leading-tight truncate">{name}</h3>
                <p className="text-gray-400 text-xs font-bold uppercase mt-1 truncate">{company}</p>
                <p className="text-gray-500 text-xs mt-1 truncate">{title}</p>
                {mutualConnections !== undefined && (
                  <p className="text-gray-500 text-xs mt-1">{mutualConnections}+ Connections</p>
                )}
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={onMessage}
                  className="px-4 py-1.5 text-[11px] font-medium bg-transparent text-white border border-[#D85D27] rounded-full hover:bg-[#D85D27] hover:text-white transition-colors"
                >
                  Message
                </button>
                {onRemove ? (
                  <button
                    type="button"
                    onClick={onRemove}
                    className="px-4 py-1.5 text-[11px] font-medium bg-transparent text-red-100 border border-red-500/70 rounded-full hover:bg-red-500/15 transition-colors"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GradientContainer>
  );
};


export const ConnectionActionCard: React.FC<ConnectionActionCardProps> = ({
  name,
  avatar,
  title,
  company,
  mutualConnections,
  type,
  onConnect,
  onAccept,
  onDecline,
  onCancel,
}) => {
  const isActionDisabled = {
    connect: !onConnect,
    accept: !onAccept,
    decline: !onDecline,
    cancel: !onCancel,
  };

  const renderActionButtons = () => {
    switch (type) {
      case "requests":
        return (
          <>
            <button
              onClick={onAccept}
              disabled={isActionDisabled.accept}
              className="px-6 py-2 text-xs font-medium bg-transparent text-white border border-[#D85D27] rounded-full hover:bg-[#D85D27] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              disabled={isActionDisabled.decline}
              className="px-6 py-2 text-xs font-medium bg-[#4a5568] text-white rounded-full hover:bg-[#5a6578] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reject
            </button>
          </>
        );
      case "pending":
        return (
          <>
            <button
              type="button"
              className="px-6 py-2 text-xs font-medium bg-[#D85D27] text-white rounded-full"
              disabled
            >
              Pending
            </button>
            <button
              onClick={onCancel}
              disabled={isActionDisabled.cancel}
              className="px-6 py-2 text-xs font-medium bg-[#4a5568] text-white rounded-full hover:bg-[#5a6578] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </>
        );
      case "suggested":
        return (
          <>
            <button
              onClick={onConnect}
              disabled={isActionDisabled.connect}
              className="px-6 py-2 text-xs font-medium bg-transparent text-white border border-[#D85D27] rounded-full hover:bg-[#D85D27] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <GradientContainer className="w-full overflow-hidden">
      <div className="p-5 overflow-hidden rounded-[14px]">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 rounded-full bg-[#4a5568] overflow-hidden flex items-center justify-center shrink-0">
            {avatar ? (
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl text-white">{name.charAt(0)}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-white text-lg font-semibold leading-tight truncate">{name}</h3>
                <p className="text-gray-400 text-xs font-bold uppercase mt-1 truncate">{company}</p>
                <p className="text-gray-500 text-xs mt-1 truncate">{title}</p>
                {mutualConnections !== undefined && (
                  <p className="text-gray-500 text-xs mt-1">{mutualConnections}+ Connections</p>
                )}
              </div>

              <div className="shrink-0 flex flex-wrap justify-end gap-3">
                {renderActionButtons()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </GradientContainer>
  );
};

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  type,
  onMessage,
  onConnect,
  onAccept,
  onDecline,
  onCancel,
  ...rest
}) => {
  if (type === "connections") {
    return <MyConnectionsCard {...rest} onMessage={onMessage} />;
  }

  return (
    <ConnectionActionCard
      {...rest}
      type={type}
      onConnect={onConnect}
      onAccept={onAccept}
      onDecline={onDecline}
      onCancel={onCancel}
    />
  );
};

export default ConnectionCard;
