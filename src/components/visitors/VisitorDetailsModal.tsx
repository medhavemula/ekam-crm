import { type VisitorDetails } from "../../services/visitorsApi";
import Modal from "../ui/Modal";
import { getVisitTypeLabel, getVisitStatusLabel } from "../../utils/visitorTypes";

interface VisitorDetailsModalProps {
  open: boolean;
  onClose: () => void;
  visitor: VisitorDetails | null;
  isLoading: boolean;
}

export default function VisitorDetailsModal({ open, onClose, visitor, isLoading }: VisitorDetailsModalProps) {
  if (isLoading) {
    return (
      <Modal open={open} onClose={onClose} title="Loading Visitor Details...">
        <div className="flex justify-center py-8">
          <div className="text-gray-400">Loading...</div>
        </div>
      </Modal>
    );
  }

  if (!visitor) {
    return (
      <Modal open={open} onClose={onClose} title="Visitor Details">
        <div className="text-center py-8 text-gray-400">
          No visitor data available.
        </div>
      </Modal>
    );
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  return (
    <Modal open={open} onClose={onClose} title="Visitor Details">
      <div className="space-y-4">
        {/* Personal Information */}
        <div className="border-b border-gray-700 pb-4">
          <h3 className="font-semibold text-white mb-3">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-400">Name:</span>
              <p className="font-medium text-white">{`${visitor.firstName} ${visitor.lastName || ""}`.trim()}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Email:</span>
              <p className="font-medium text-white">{visitor.email || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Phone:</span>
              <p className="font-medium text-white">{visitor.phone || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Company:</span>
              <p className="font-medium text-white">{visitor.company || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Category:</span>
              <p className="font-medium text-white">{visitor.category || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Source:</span>
              <p className="font-medium text-white">{visitor.source || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Visit Information */}
        <div className="pb-4">
          <h3 className="font-semibold text-white mb-3">Visit Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-400">Visit Date:</span>
              <p className="font-medium text-white">{formatDate(visitor.visitDate)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Type:</span>
              <p className="font-medium text-white">{getVisitTypeLabel(visitor.type)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Status:</span>
              <p className="font-medium text-white">{getVisitStatusLabel(visitor.status)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">First Timer:</span>
              <p className="font-medium text-white">{visitor.isFirstTimer ? "Yes" : "No"}</p>
            </div>
            {visitor.checkInTime && (
              <div>
                <span className="text-sm text-gray-400">Check-in Time:</span>
                <p className="font-medium text-white">{formatDateTime(visitor.checkInTime)}</p>
              </div>
            )}
            {visitor.notes && (
              <div className="col-span-2">
                <span className="text-sm text-gray-400">Notes:</span>
                <p className="font-medium text-white">{visitor.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
