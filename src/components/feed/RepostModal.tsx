import React, { useState, useEffect } from "react";

export interface RepostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepost: (content: string) => void;
  userName: string;
  userAvatar?: string;
  attachment?: React.ReactNode;
}

const RepostModal: React.FC<RepostModalProps> = ({ isOpen, onClose, onRepost, userName, userAvatar, attachment }) => {
  const [content, setContent] = useState("");
  const [showAvatar, setShowAvatar] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setContent("");
    }
  }, [isOpen]);

  // Lock body scroll while modal open
  useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
    return;
  }, [isOpen]);

  const handleSubmit = () => {
    // Allow empty content for repost
    onRepost(content);
    onClose();
  };

  const handleCancel = () => {
    setContent("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pt-16 md:pt-24">
      <div className="bg-[#1a2332] border border-gray-700 rounded-lg w-full max-w-xl mx-4 shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-none">
          <h2 className="text-xl font-semibold text-white">Repost</h2>
          <button onClick={handleCancel} className="text-orange-500 hover:text-orange-600 transition-colors">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* User */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center">
              {userAvatar && showAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-full h-full object-cover"
                  onError={() => setShowAvatar(false)}
                />
              ) : (
                <span className="text-lg font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">{userName}</h3>
            </div>
          </div>

          {/* Thoughts */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your post message"
            className="w-full h-24 px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
          />

          {/* Attachment */}
          {attachment ? (
            <div className="mt-4 border border-gray-700 rounded-lg overflow-auto max-h-60">{attachment}</div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700 flex-none">
          <button
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-[#D85D27] hover:hover:bg-[#C24F20] text-white rounded-lg transition-colors"
          >
            Repost
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepostModal;
