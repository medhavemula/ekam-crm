import { useMemo } from "react";
import Bg1 from "../../assets/icons/Bg1.svg";
import Bg2 from "../../assets/icons/BG2.svg";
import Bg3 from "../../assets/icons/BG3.svg";
import Bg4 from "../../assets/icons/BG4.svg";

interface ConnectionSuggestionCardProps {
  id: string;
  name: string;
  company: string;
  role?: string;
  avatarUrl?: string;
  backgroundUrl?: string;
  onConnect: (id: string) => void;
  onViewProfile?: (id: string) => void;
}

export function ConnectionSuggestionCard({
  id,
  name,
  company,
  role,
  avatarUrl,
  onConnect,
  onViewProfile,
}: ConnectionSuggestionCardProps) {
  // Generate a consistent random background based on the id
  const backgroundImage = useMemo(() => {
    const backgrounds = [Bg1, Bg2, Bg3, Bg4];
    const index = id ? Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % backgrounds.length : 0;
    return backgrounds[index];
  }, [id]);
  return (
    <div
      className="bg-[#141922] rounded-xl overflow-hidden border border-white/10 hover:border-white/15 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.25)] h-[340px] flex flex-col cursor-pointer"
      onClick={() => onViewProfile?.(id)}
      role={onViewProfile ? 'button' : undefined}
      tabIndex={onViewProfile ? 0 : -1}
    >
      {/* Background Image */}
      <div 
        className="h-28 relative overflow-hidden flex-shrink-0"
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
      <div className="flex justify-center -mt-16 mb-4 relative z-10 flex-shrink-0">
        <div className="w-28 h-28 rounded-full border-4 border-[#141922] overflow-hidden bg-gray-700 shadow-xl ring-2 ring-white/10">
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
      <div className="px-5 pb-5 text-center flex flex-col flex-1">
        <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1" title={name}>
          {name}
        </h3>
         <p className="text-gray-300 text-sm mb-1 line-clamp-1" title={company}>
          {company || "\u00A0"}
        </p>
        {role && (
          <p className="text-gray-500 text-sm mb-0.5 line-clamp-1">
            {role}
          </p>
        )}

        {/* Connect Button */}
        <div className="mt-auto">
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(id); }}
            className="w-full py-2 px-4 border border-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors text-sm font-medium"
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
