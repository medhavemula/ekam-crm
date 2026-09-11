import Modal from "../ui/Modal";
import { getAdminVisitorTypeLabel } from "../../utils/visitorTypes";

interface AdminVisitorDetails {
  memberName: string;
  companyName: string;
  phone: string;
  email: string;
  profession: string;
  speciality: string;
  visitDate: string;
  chapter: string;
  invitedBy: string;
  description: string;
  type: string;
}

interface AdminVisitorDetailsModalProps {
  open: boolean;
  onClose: () => void;
  visitor: AdminVisitorDetails | null;
  isLoading: boolean;
}

export default function AdminVisitorDetailsModal({ open, onClose, visitor, isLoading }: AdminVisitorDetailsModalProps) {
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

  return (
    <Modal open={open} onClose={onClose} title="Visitor Details">
      <div className="space-y-4">
        {/* Personal Information */}
        <div className="border-b border-gray-700 pb-4">
          <h3 className="font-semibold text-white mb-3">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-400">Member Name:</span>
              <p className="font-medium text-white">{visitor.memberName || "N/A"}</p>
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
              <p className="font-medium text-white">{visitor.companyName || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Profession:</span>
              <p className="font-medium text-white">{visitor.profession || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Speciality:</span>
              <p className="font-medium text-white">{visitor.speciality || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Visit Information */}
        <div className="pb-4">
          <h3 className="font-semibold text-white mb-3">Visit Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-400">Visit Date:</span>
              <p className="font-medium text-white">{visitor.visitDate || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Chapter:</span>
              <p className="font-medium text-white">{visitor.chapter || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Invited By:</span>
              <p className="font-medium text-white">{visitor.invitedBy || "N/A"}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">Type:</span>
              <p className="font-medium text-white">{getAdminVisitorTypeLabel(visitor.type)}</p>
            </div>
            {visitor.description && (
              <div className="col-span-2">
                <span className="text-sm text-gray-400">Description:</span>
                <p className="font-medium text-white">{visitor.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
