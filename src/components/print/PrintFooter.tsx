
export default function PrintFooter() {
  return (
    <div
      className="print:block hidden w-full"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <div className="w-full bg-[#0F1419] text-white">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm">
          <div className="font-medium">www.ekamnetwork.com</div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span>✉️</span>
              <span>support@ekamnetwork.com</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📞</span>
              <span>+91 9988776655</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
