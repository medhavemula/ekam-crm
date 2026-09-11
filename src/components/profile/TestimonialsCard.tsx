import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import GradientContainer from "../common/GradientContainer";
import TestimonialItemCard from "../testimonials/TestimonialItemCard";

export interface Testimonial {
  name: string;
  text: string;
  avatarUrl?: string;
}

export interface TestimonialsCardProps {
  testimonials: Testimonial[];
  variant?: "gradient" | "none";
  className?: string;
}

export default function TestimonialsCard({
  testimonials,
  variant: _variant = "gradient",
  className = "",
}: TestimonialsCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const t = testimonials[currentIndex];

  // Auto-rotate every 2s
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const id = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % testimonials.length);
    }, 2000);
    return () => clearInterval(id);
  }, [testimonials.length]);

  // An empty card, not a missing one, and not a fabricated testimonial either:
  // returning null used to leave a hole in the grid, so callers passed a made-up
  // entry reading "No testimonials yet", which rendered as a speech bubble with
  // a question mark for an author. The early return also sat above the hooks,
  // so the first testimonial to arrive changed the hook order.
  if (!testimonials?.length) {
    return (
      <GradientContainer className={`h-full ${className}`}>
        <div className="flex h-full flex-col rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-[var(--ov-ember-fill)]" />
            <h3 className="ekam-figure text-[17px] font-bold text-[var(--ov-ink)] md:text-[19px]">
              Testimonials
            </h3>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <span
              aria-hidden="true"
              className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)]"
            >
              <Quote className="h-5 w-5" strokeWidth={2} />
            </span>
            <p className="text-[14px] font-medium text-[var(--ov-ink-2)]">No testimonials yet</p>
            <p className="mx-auto mt-1.5 max-w-[14rem] text-[12px] leading-5 text-[var(--ov-ink-4)]">
              Ones written about this member will appear here.
            </p>
          </div>
        </div>
      </GradientContainer>
    );
  }

  // Trigger a fade animation on index change (only inner card)
  useEffect(() => {
    // drop opacity to 0 this frame, then back to 1 next frame
    setFadeIn(false);
    const raf = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(raf);
  }, [currentIndex]);

  return (
    <GradientContainer className={`h-full ${className}`}>
      <div
        className="h-full flex flex-col rounded-2xl p-6"
        aria-live="polite"
      >
        <div className={`flex-1 transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
          <TestimonialItemCard
            key={currentIndex}
            name={t.name}
            text={t.text}
            avatarUrl={t.avatarUrl}
            size="md"
            showTitle
          />
        </div>

        {testimonials.length > 1 && (
          <div className="flex justify-center items-center gap-2.5 mt-8 pb-2">
            {testimonials.map((_, i) => {
              const active = i === currentIndex;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={[
                    "rounded-full transition-all duration-300",
                    active ? "w-3.5 h-3.5 bg-[var(--ov-ember-fill)]" : "w-2 h-2 bg-[var(--ov-ink-5)] hover:bg-[var(--ov-ink-4)]",
                  ].join(" ")}
                />
              );
            })}
          </div>
        )}
      </div>
    </GradientContainer>
  );
}
