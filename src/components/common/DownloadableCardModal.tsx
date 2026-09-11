import { useRef, useState, type PropsWithChildren } from "react";
import html2canvas from "html2canvas";

export type DownloadableCardModalProps = PropsWithChildren<{
  fileName: string;
  onClose: () => void;
}>;

export default function DownloadableCardModal({ fileName, onClose, children }: DownloadableCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0D1117",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight,
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Failed to create blob");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (err) {
      console.error("Failed to download card:", err);
      alert("Failed to download image. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative z-10 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={cardRef}>{children}</div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-6 py-2.5 rounded-lg bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download as Image
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Shared EKAM header with logo and title
export function EkamCardHeader({ title }: { title: string }) {
  return (
    <div style={{ backgroundColor: "#D85D27", padding: "16px 24px", textAlign: "center" }}>
      <img
        src="/EKAMLogo.png"
        alt="EKAM"
        style={{ height: "40px", margin: "0 auto 8px auto", display: "block" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 800,
          color: "#ffffff",
          letterSpacing: "0.025em",
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

// Shared EKAM footer line
export function EkamCardFooter() {
  return (
    <div
      style={{
        padding: "12px 24px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "11px", color: "#6B7280", margin: 0 }}>
        Powered by EKAM Business Network
      </p>
    </div>
  );
}
