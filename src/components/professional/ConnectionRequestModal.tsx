import { useState } from "react";
import { X } from "lucide-react";

interface ConnectionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  userName: string;
}

const MIN_MESSAGE_LENGTH = 5;
const MAX_MESSAGE_LENGTH = 300;

function validateMessage(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "Please write a short message.";
  if (trimmed.length < MIN_MESSAGE_LENGTH)
    return `Message must be at least ${MIN_MESSAGE_LENGTH} characters.`;
  if (trimmed.length > MAX_MESSAGE_LENGTH)
    return `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`;
  return null;
}

export function ConnectionRequestModal({ isOpen, onClose, onSubmit, userName }: ConnectionRequestModalProps) {
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);

  if (!isOpen) return null;

  const trimmedLength = message.trim().length;
  const error = validateMessage(message);
  const showError = touched && error !== null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    onSubmit(message.trim());
    setMessage("");
    setTouched(false);
    onClose();
  };

  const handleClose = () => {
    setMessage("");
    setTouched(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1f26] rounded-lg border border-gray-700 w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Send Connection Request</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-4">
            <p className="text-gray-300 text-sm mb-4">
              Send a connection request to <span className="font-semibold text-white">{userName}</span>
            </p>

            <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Hi, I'd like to connect to collaborate."
              className={`w-full px-3 py-2 bg-[#0f1419] border rounded-lg text-white placeholder-gray-500 focus:outline-none transition-colors resize-none ${
                showError
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-700 focus:border-orange-500"
              }`}
              rows={4}
              maxLength={MAX_MESSAGE_LENGTH}
              aria-invalid={showError}
              aria-describedby={showError ? "message-error" : "message-help"}
            />
            <div className="mt-1 flex items-start justify-between gap-3">
              {showError ? (
                <p id="message-error" className="text-xs text-red-400">
                  {error}
                </p>
              ) : (
                <p id="message-help" className="text-xs text-gray-500">
                  Between {MIN_MESSAGE_LENGTH} and {MAX_MESSAGE_LENGTH} characters.
                </p>
              )}
              <p
                className={`text-xs shrink-0 ${
                  trimmedLength > MAX_MESSAGE_LENGTH ? "text-red-400" : "text-gray-500"
                }`}
              >
                {trimmedLength}/{MAX_MESSAGE_LENGTH}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={error !== null}
              className="flex-1 px-4 py-2 bg-[#D85D27] hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
