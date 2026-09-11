/**
 * ChapterInfoCard - Displays chapter information with action button
 * Used in Chapter Details page
 */

import GradientContainer from "../common/GradientContainer";

interface ChapterInfoCardProps {
  title: string;
  content: string | number;
  contentSecondary?: string;
  subtitle?: string;
  buttonText?: string;
  buttonVariant?: "primary" | "secondary";
  onButtonClick?: () => void;
  className?: string;
  headerSize?: "sm" | "md" | "lg"; // controls orange header height/font
  titleSize?: "sm" | "md" | "lg"; // controls content heading size when content is string
  subtitleSize?: "sm" | "md" | "lg"; // controls subtitle text size
}

export const ChapterInfoCard: React.FC<ChapterInfoCardProps> = ({
  title,
  content,
  contentSecondary,
  subtitle,
  buttonText,
  buttonVariant = "secondary",
  onButtonClick,
  className = "",
  headerSize = "md",
  titleSize = "md",
  subtitleSize = "md",
}) => {
  const headerClasses = headerSize === "lg"
    ? "text-lg px-4 py-4"
    : headerSize === "sm"
    ? "text-sm px-4 py-2"
    : "text-base px-4 py-3"; // md default

  const titleClasses = titleSize === "lg"
    ? "text-3xl md:text-4xl"
    : titleSize === "sm"
    ? "text-xl md:text-2xl"
    : "text-2xl md:text-3xl"; // md default
  const subtitleClasses = subtitleSize === "lg"
    ? "text-base md:text-lg"
    : subtitleSize === "sm"
    ? "text-sm"
    : "text-base"; // md default bumped to base
  return (
    <GradientContainer className={className}>
      <div className="rounded-2xl overflow-hidden">
        {/* Title */}
        <div className={`bg-[#D85D27] text-white font-medium ${headerClasses}`}>
          {title}
        </div>

        {/* Content */}
        <div className="p-6 relative">
          {typeof content === "number" ? (
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <p className="text-5xl md:text-6xl font-bold text-[#D85D27] leading-none">{content}</p>
              {buttonText && onButtonClick && (
                <button
                  onClick={onButtonClick}
                  className={`px-5 h-10 rounded-md text-sm font-medium transition-colors border flex items-center justify-center ${
                    buttonVariant === "primary"
                      ? "bg-[#D85D27] hover:bg-[#C24F20] text-white border-[#D85D27]"
                      : "bg-transparent text-white/90 border-[#D85D27] hover:border-[#D85D27]"
                  }`}
                >
                  {buttonText}
                </button>
              )}
            </div>
          ) : (
            <div>
              <h3 className={`${titleClasses} font-bold text-[#D85D27] mb-1`}>
                {content}
                {contentSecondary ? (
                  <span className="ml-2 align-middle text-[#D85D27] text-lg md:text-xl font-semibold">{contentSecondary}</span>
                ) : null}
              </h3>
              {subtitle && (
                <p className={`text-white whitespace-pre-line ${subtitleClasses}`}>{subtitle}</p>
              )}
              {buttonText && onButtonClick && (
                <div className="flex justify-end">
                  <button
                    onClick={onButtonClick}
                    className={`px-5 h-10 rounded-md text-sm font-medium transition-colors border flex items-center justify-center ${
                      buttonVariant === "primary"
                        ? "bg-[#D85D27] hover:bg-[#C24F20] text-white border-[#D85D27]"
                        : "bg-transparent text-white/90 border-[#D85D27] hover:border-[#D85D27]"
                    }`}
                  >
                    {buttonText}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GradientContainer>
  );
};

export default ChapterInfoCard;
