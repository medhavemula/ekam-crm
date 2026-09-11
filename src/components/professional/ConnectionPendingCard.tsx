import { useMemo } from "react";
import Bg1 from "../../assets/icons/Bg1.svg";
import Bg2 from "../../assets/icons/BG2.svg";
import Bg3 from "../../assets/icons/BG3.svg";
import Bg4 from "../../assets/icons/BG4.svg";

interface ConnectionPendingCardProps {
  id: string;
  name: string;
  company: string;
  role?: string;
  avatarUrl?: string;
  backgroundUrl?: string;
  onCancel: (id: string) => void;
  onViewProfile?: (id: string) => void;
}

export function ConnectionPendingCard({
  id,
  name,
  company,
  role,
  avatarUrl,
  onCancel,
  onViewProfile,
}: ConnectionPendingCardProps) {
  // Generate a consistent random background based on the id
  const backgroundImage = useMemo(() => {
    const backgrounds = [Bg1, Bg2, Bg3, Bg4];
    const index = id ? Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % backgrounds.length : 0;
    return backgrounds[index];
  }, [id]);

  return (
    <div className="bg-[#1a1f26] rounded-lg overflow-hidden border border-gray-800 hover:border-gray-700 transition-colors h-[340px] flex flex-col">
      {/* Background Image */}
      <div 
        className="h-24 relative overflow-hidden flex-shrink-0"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Avatar - Overlapping the background */}
      <div className="flex justify-center -mt-14 mb-4 relative z-10 flex-shrink-0">
        <div
          className={`w-28 h-28 rounded-full border-4 border-[#1a1f26] overflow-hidden bg-gray-700 ${onViewProfile ? "cursor-pointer" : ""}`}
          onClick={() => onViewProfile?.(id)}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <span className="text-3xl font-semibold text-gray-300">{name.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 text-center flex flex-col flex-1">
        <h3
          className={`text-white font-semibold text-lg mb-1 line-clamp-1 ${onViewProfile ? "cursor-pointer hover:underline" : ""}`}
          title={name}
          onClick={() => onViewProfile?.(id)}
        >
          {name}
        </h3>
{company && (
          <p className="text-gray-300 text-sm mb-1 line-clamp-1" title={company}>
            {company}
          </p>
        )}
        {role && (
          <p className="text-gray-500 text-sm mb-0.5 line-clamp-1" title={role}>
            {role}
          </p>
        )}

        {/* Status and Action */}
        <div className="flex gap-2 mt-auto">
          <div className="flex-1 px-4 py-2 bg-[#D85D27] text-white rounded-full text-md font-medium">
            Pending
          </div>
          <button
            onClick={() => onCancel(id)}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full text-md font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
