import React from "react";

/**
 * The shell every sign-in-adjacent screen sits in.
 *
 * Each of these pages carried its own copy of it: the same backdrop, the same
 * light #E9EEF1 band with the same raster logo, the same dark gradient body,
 * the same submit button. Copies drift — three of them had the submit hover
 * written `hover:hover:`, which compiles to a selector nothing can match, so
 * the only button on those pages did not respond to the pointer at all. One
 * shell, so there is one place for that to be right.
 *
 * The mark stands on the page rather than on a panel of its own, which is what
 * made the old header band read as a sticker stuck to the top of the card.
 */
export const AUTH_SUBMIT =
  "h-12 w-full rounded-xl bg-[var(--ov-ember-fill)] text-[14px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-panel)] disabled:cursor-not-allowed disabled:opacity-60";

/** A quiet link under the card — "back to sign in" and its like. */
export const AUTH_LINK =
  "text-[13px] text-[var(--ov-ink-3)] transition-colors hover:text-[var(--ov-ember)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] rounded";

/**
 * The mark that ends a flow.
 *
 * The screens used verification-success.svg — a green tick inside a hand-drawn
 * red scribble, which is two colours the product does not use and a third
 * drawing style. Drawn here instead, from the success tokens every theme
 * defines, so it belongs to the same set of shapes as everything around it.
 */
export const AuthSuccessMark: React.FC = () => (
  <span
    aria-hidden="true"
    className="grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-success-wash)] text-[var(--ov-success)] ring-1 ring-[color:var(--ov-success-wash)]"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="h-7 w-7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  </span>
);

export const AuthCard: React.FC<{
  title: string;
  caption?: string;
  /** Sits above the title, centred — for the screens that end a flow. */
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Links below the panel, outside the card's own reading order. */
  footer?: React.ReactNode;
}> = ({ title, caption, icon, children, footer }) => {
  const bgImg = `${import.meta.env.BASE_URL}auth-bg.jpg`;
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-4 md:p-6 pt-8 pb-20"
      style={{
        // The scrim's own colour, so the page is not a washed grey while the
        // photograph below loads. Covered once it does.
        backgroundColor: "#0B1220",
        backgroundImage:
          `linear-gradient(rgba(11,18,32,0.72), rgba(11,18,32,0.78)), url('${bgImg}')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
    <div className="w-full max-w-md">
      <div className="mb-7 flex flex-col items-center">
        <img
          src={`${import.meta.env.BASE_URL}EKAMLogo.png`}
          alt="E.K.A.M"
          className="block h-10 w-auto max-w-[152px] select-none object-contain mx-auto"
        />
        <p className="ekam-eyebrow mt-3 text-[10px] font-semibold text-[var(--ov-ink-4)]">
          One network infinite aspirations
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-2xl ring-1 ring-[color:var(--ov-line)]">
        <div className="p-7 md:p-8">
          {icon && <div className="mb-5 flex justify-center">{icon}</div>}
          <h1
            className={`ekam-figure text-[22px] font-bold leading-none text-[var(--ov-ink)] ${
              icon ? "text-center" : ""
            }`}
          >
            {title}
          </h1>
          {caption && (
            <p
              className={`mt-2.5 text-[13px] leading-5 text-[var(--ov-ink-4)] ${
                icon ? "text-center" : ""
              }`}
            >
              {caption}
            </p>
          )}
          {children}
        </div>
      </div>

      {footer && (
        <div className="mt-6 flex flex-col items-center gap-2.5 text-center">{footer}</div>
      )}
    </div>
  </div>
  );
};

export default AuthCard;
