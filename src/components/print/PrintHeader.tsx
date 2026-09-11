import EkamLogo from "../common/EkamLogo";

type PrintHeaderProps = {
  userName?: string;
};

export default function PrintHeader({ userName }: PrintHeaderProps) {
  return (
    <div
      className="print:block hidden w-full"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <div className="w-full bg-[#0F1419] text-white">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Simple avatar placeholder to resemble mock */}
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
              {userName?.[0]?.toUpperCase() || "M"}
            </div>
            <div className="text-lg font-semibold">{userName || "Mike"}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 flex items-center">
              <EkamLogo />
            </div>
            <div className="text-xs text-gray-300 whitespace-nowrap">One Network Infinite Aspirations</div>
          </div>
        </div>
      </div>
    </div>
  );
}
