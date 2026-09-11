import React, { useState } from "react";
import FormSelect from "../forms/FormSelect";
import GradientContainer from "../common/GradientContainer";
import { useToast } from "../toast/ToastProvider";

export interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: (content: string, files?: File[]) => Promise<void> | void;
  userName: string;
  userAvatar?: string;
  modalTitle?: string;
  submitText?: string;
  attachment?: React.ReactNode;
  allowEmpty?: boolean;
  categoryEnabled?: boolean;
  categoryLabel?: string;
  categoryPlaceholder?: string;
  categoryOptions?: Array<{ value: string; label: string }>; 
  categoryValue?: string;
  onCategoryChange?: (value: string) => void;
}

/**
 * CreatePostModal Component
 *
 * Modal for creating a new post with text and optional image/video.
 */
export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPost,
  userName,
  userAvatar,
  modalTitle = "Create Post",
  submitText = "Post",
  attachment,
  allowEmpty = false,
  categoryEnabled = false,
  categoryLabel = "Category",
  categoryPlaceholder = "Select category",
  categoryOptions = [],
  categoryValue,
  onCategoryChange,
}) => {
  const [postContent, setPostContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const lastLimitToastTime = React.useRef<number>(0);

  // Always run hooks; conditionally render UI below to keep hook order stable

  const handlePost = async () => {
    const contentTrimmed = postContent.trim();
    const canSubmit = Boolean(allowEmpty) || (contentTrimmed.length >= 5);
    if (!canSubmit || isSubmitting) {
      if (contentTrimmed.length > 0 && contentTrimmed.length < 5) {
        setErrorMsg("Message must be at least 5 characters long.");
      } else if (contentTrimmed.length === 0) {
        setErrorMsg("Message is required.");
      }
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await Promise.resolve(onPost(postContent, selectedFiles.length ? selectedFiles : undefined));
      setPostContent("");
      // Revoke existing previews
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Failed to post. Please try again.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setPostContent("");
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!isSubmitting) onClose();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    
    // Calculate total media count
    const totalCount = selectedFiles.length;
    const availableSlots = 5 - totalCount;
    const now = Date.now();

    if (availableSlots <= 0) {
      if (now - lastLimitToastTime.current > 1000) {
        showToast({
          title: "Limit reached",
          description: "You can only add up to 5 images/videos",
          kind: "info",
        });
        lastLimitToastTime.current = now;
      }
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    const newSelected = [...selectedFiles, ...filesToAdd];
    const newPreviews = [
      ...previewUrls,
      ...filesToAdd.map((file) => URL.createObjectURL(file)),
    ];

    setSelectedFiles(newSelected);
    setPreviewUrls(newPreviews);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (files.length > availableSlots) {
      if (now - lastLimitToastTime.current > 1000) {
        showToast({
          title: "Limit reached",
          description: "You can only add up to 5 images/videos",
          kind: "info",
        });
        lastLimitToastTime.current = now;
      }
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setPostContent("");
      // Clear any existing previews when reopening
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setSelectedFiles([]);
      setPreviewUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsSubmitting(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Lock body scroll while modal open
  React.useEffect(() => {
    if (isOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
    return;
  }, [isOpen]);

  return isOpen ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pt-16 md:pt-24">
      <GradientContainer className="w-full max-w-lg mx-4 shadow-2xl max-h-[85vh]">
        <div className="rounded-lg flex flex-col h-full">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 flex-none">
            <h2 className="text-xl font-semibold text-white">{modalTitle || "Create a Post"}</h2>
            <button onClick={handleCancel} className="text-orange-500 hover:text-orange-600 transition-colors">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 flex-1 overflow-y-auto">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.avatar-initial') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : (
                <span className="text-lg font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold">{userName}</h3>
            </div>
          </div>

          {/* Error banner */}
          {errorMsg ? (
            <div className="mb-3 px-3 py-2 rounded border border-red-700 bg-red-900/30 text-red-300 text-sm">
              {errorMsg}
            </div>
          ) : null}

          {/* Post Content Textarea */}
          {/* Optional attachment (e.g., repost preview) */}
          {attachment ? <div className="mb-4">{attachment}</div> : null}

          {/* Category Selector (optional) */}
          {categoryEnabled ? (
            <div className="mb-3">
              <FormSelect
                label={categoryLabel}
                value={categoryValue ?? ""}
                onChange={(e) => onCategoryChange?.(e.target.value)}
                options={[{ value: "", label: categoryPlaceholder }, ...categoryOptions]}
              />
            </div>
          ) : null}
          <textarea
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
            placeholder="Share your post message"
            className="w-full h-22 px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
            disabled={isSubmitting}
          />

          {/* Media Preview */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {/* Show new file previews */}
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="relative">
                  {(() => {
                    const src = previewUrls[idx];
                    const isVideo = file.type.startsWith("video/");
                    return isVideo ? (
                      <video
                        src={src}
                        controls
                        className="w-full max-h-24 rounded-lg bg-black"
                      />
                    ) : (
                      <img
                        src={src}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    );
                  })()}
                  <button
                    onClick={() => {
                      // Revoke URL for this preview and remove both file and URL
                      setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                      setPreviewUrls((prev) => {
                        const next = [...prev];
                        const [removed] = next.splice(idx, 1);
                        if (removed) URL.revokeObjectURL(removed);
                        return next;
                      });
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-700 rounded-full text-white"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
              {selectedFiles.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-orange-500 bg-orange-500/10 text-orange-500 transition-colors hover:border-orange-400 hover:bg-orange-500/20 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Add image or video"
                  title="Add Image/Video"
                >
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </button>
              )}
            </div>
          )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700 flex-none">
            {/* Add Image/Video Button */}
            <label className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white cursor-pointer transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span className="text-sm">Add Image/Video</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                ref={fileInputRef}
                disabled={isSubmitting}
              />
            </label>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handlePost}
                disabled={isSubmitting}
                className="px-6 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Posting..." : (submitText || "Post")}
              </button>
            </div>
          </div>
        </div>
      </GradientContainer>
    </div>
  ) : null;
};

export default CreatePostModal;
