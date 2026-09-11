import React, { useState, useEffect } from "react";

interface EditBusinessOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: EditBusinessOpportunityFormData) => void;
  initialData: EditBusinessOpportunityFormData;
}

export interface EditBusinessOpportunityFormData {
  id: number;
  date: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  comments: string;
}

// Status options
const statusOptions = [
  "Not Contacted Yet",
  "Contacted",
  "No Response",
  "Got The Business",
  "Did Not Get The Business",
  "Not a Good Fit",
];

export const EditBusinessOpportunityModal: React.FC<EditBusinessOpportunityModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  initialData,
}) => {
  const [formData, setFormData] = useState<EditBusinessOpportunityFormData>(initialData);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    handleClose();
  };

  const handleClose = () => {
    setShowStatusDropdown(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a2332] border border-gray-700 rounded-lg w-full max-w-md p-6 md:p-8 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date (Read-only) */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Date</label>
            <div className="px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-gray-400">
              {formData.date}
            </div>
          </div>

          {/* Name (Read-only) */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Name</label>
            <div className="px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-gray-400">
              {formData.name}
            </div>
          </div>

          {/* Phone (Read-only) */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Phone</label>
            <div className="px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-gray-400">
              {formData.phone}
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Email</label>
            <div className="px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-gray-400">
              {formData.email}
            </div>
          </div>

          {/* Status (Editable dropdown) */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="w-full px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-left text-white focus:outline-none focus:border-orange-500 flex items-center justify-between"
              >
                <span>{formData.status}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showStatusDropdown && (
                <div className="absolute z-10 w-full mt-2 bg-[#2a3442] border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <div className="py-1">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, status });
                          setShowStatusDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Comments</label>
            <textarea
              placeholder="Enter comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-[#D85D27] hover:hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors"
            >
              Update
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBusinessOpportunityModal;
