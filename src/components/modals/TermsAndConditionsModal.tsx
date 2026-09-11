interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function TermsAndConditionsModal({ isOpen, onClose, onAccept }: TermsAndConditionsModalProps) {
  if (!isOpen) return null;

  const termsContent = [
    {
      title: "1. Acceptance of Terms",
      content: "By registering or participating in Ekam Global Network, you acknowledge that you have read, understood, and agreed to be bound by these Terms & Conditions, our Privacy Policy, and any other guidelines we may publish from time to time."
    },
    {
      title: "2. Purpose of the Platform",
      content: "Ekam Global Network is a business networking and referral ecosystem designed to:\n• Facilitate genuine business connections\n• Encourage professional collaborations\n• Promote ethical referral sharing\n• Support members in growing their businesses\n\nEkam is not an MLM, not a financial investment platform, and does not guarantee any business or income."
    },
    {
      title: "3. Membership Eligibility",
      content: "To become a member, you must:\n• Be at least 18 years old\n• Own or represent a legitimate business or profession\n• Provide accurate, complete, and updated registration information\n• Follow all networking etiquettes and ethical standards\n\nWe reserve the right to approve or reject any membership without disclosure of reasons."
    },
    {
      title: "4. Member Responsibilities",
      content: "Members agree to:\n• Maintain honesty, integrity, and professionalism\n• Share referrals only after obtaining proper consent\n• Refrain from spamming, misrepresentation, or unethical practices\n• Respect other members' data and confidentiality\n• Comply with all local laws and regulations\n\nAny misuse of the platform, harassment, or unethical conduct may result in suspension or permanent removal."
    },
    {
      title: "5. Referral System",
      content: "While Ekam encourages business referrals, members understand and agree that:\n• Referrals shared are voluntary\n• Ekam does not verify the quality, intention, or outcome of referrals\n• Ekam is not liable for any losses, disputes, or dissatisfaction arising from referrals\n• Any business transaction between members is strictly between the concerned parties"
    },
    {
      title: "6. Events, Meetings & Activities",
      content: "Ekam may conduct online or offline meetings, trainings, or networking events. By participating:\n• You grant Ekam rights to use photos, videos, or content from events for promotional purposes\n• You agree to follow event guidelines and maintain respectful behaviour\n\nAttendance is voluntary unless specified otherwise."
    },
    {
      title: "7. Payment & Fees",
      content: "If applicable:\n• Membership fees or event fees are non-refundable unless explicitly stated\n• Failure to make timely payments may result in membership suspension\n• Ekam reserves the right to revise pricing at any time with prior notice"
    },
    {
      title: "8. Prohibited Activities",
      content: "Members must NOT engage in:\n• Fraud, misrepresentation, or misleading claims\n• Spamming or forcing referrals\n• Defamation or disrespect towards members\n• Sharing confidential data without consent\n• Promoting illegal, harmful, unethical businesses or Ponzi Schemes.\n\nViolation may lead to immediate termination."
    },
    {
      title: "9. Data Privacy",
      content: "Ekam may collect personal or business information for the purpose of:\n• Member verification\n• Networking and communication\n• Platform improvement\n\nWe do not sell or trade your data. Your privacy is protected as per our Privacy Policy."
    },
    {
      title: "10. Limitation of Liability",
      content: "Ekam Global Network is a facilitator, not a guarantor. Therefore:\n• Ekam is not responsible for financial loss, business disputes, or damages arising from member interactions\n• Ekam makes no promises or guarantees regarding business growth or earnings\n• Members participate at their own risk"
    },
    {
      title: "11. Termination of Membership",
      content: "Ekam may suspend or terminate your membership if:\n• You violate these Terms & Conditions\n• You behave unethically or harm the reputation of the network\n• You misuse referrals or platform information\n\nYou may also voluntarily exit by providing written notice."
    },
    {
      title: "12. Amendments",
      content: "Ekam reserves the right to update or revise these Terms & Conditions at any time. Changes will be notified through official communication channels."
    },
    {
      title: "13. Governing Law",
      content: "These Terms are governed by and interpreted under the laws of India. Any disputes shall be settled within the appropriate jurisdiction of Indian courts."
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0f1419] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        {/* Header */}
        <div className="bg-[#1a1f2e] px-4 py-3 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl md:text-3xl font-bold text-white">EKAM GLOBAL NETWORK – TERMS & CONDITIONS</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 min-h-0">
          <p className="text-gray-400 text-sm md:text-lg mb-6 md:mb-8">
            Welcome to Ekam Global Network ("Ekam", "we", "our", "us"). By joining, accessing, or using our business and referral networking platform ("Platform"), you agree to the following Terms & Conditions. Please read them carefully.
          </p>

          {/* Terms Content */}
          <div className="space-y-6 md:space-y-8">
            {termsContent.map((section, index) => (
              <div key={index} className="bg-[#1a1f2e] rounded-lg p-4 md:p-6 border border-gray-700">
                <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">{section.title}</h3>
                <div className="text-gray-300 text-sm md:text-base whitespace-pre-line leading-relaxed">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

          {/* Acknowledgement Section */}
          <div className="mt-8 md:mt-12 mb-6 md:mb-8 bg-[#D85D27]/10 border border-[#D85D27] rounded-lg p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">ACKNOWLEDGEMENT</h3>
            <p className="text-gray-300 text-sm md:text-base leading-relaxed">
              By joining and participating in Ekam Global Network, you acknowledge that you have fully read, understood, and agreed to these Terms & Conditions.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1a1f2e] px-4 py-3 md:px-6 md:py-4 border-t border-gray-700 flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="w-full sm:w-auto px-6 py-3 bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium rounded-lg transition-colors"
          >
            I Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
