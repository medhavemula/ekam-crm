import React from "react";
import GradientContainer from "../common/GradientContainer";
import ProfileBG from "../../assets/icons/profilebg.svg";

export interface ProfileCardProps {
  name: string;
  company: string;
  role: string;
  postsCount: string;
  connectionsCount: string;
  avatarUrl?: string;
  coverUrl?: string;
  className?: string;
}

const getInitial = (s = "") => (s.trim()[0] || "?").toUpperCase();

const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  company,
  role,
  postsCount,
  connectionsCount,
  avatarUrl,
  coverUrl,
  className = "",
}) => {
  const [imgError, setImgError] = React.useState(false);
  const posts = postsCount && postsCount !== "" ? postsCount : "0";
  const connections = connectionsCount && connectionsCount !== "" ? connectionsCount : "0";
  return (
    <GradientContainer className="h-full min-h-[360px]">
      <div className={"rounded-2xl w-full h-full min-h-[360px] overflow-hidden flex flex-col " + className}>
        {/* Top banner */}
        <div className="relative h-32 w-full">
          <img
          src={coverUrl || ProfileBG}
          alt={`${name} cover`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
          {/* The brand navy over the cover: whatever photo sits behind it, the
              banner reads as part of this product rather than as a stock image. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(13,44,59,0.35) 0%, rgba(13,44,59,0.78) 100%)",
            }}
          />
          {/* Overlapping avatar anchored to banner so scrolling body won't clip it */}
          <div className="absolute left-1/2 -bottom-10 -translate-x-1/2 z-20">
            <div className="h-20 w-20 rounded-full ring-4 ring-[color:var(--ov-panel)] overflow-hidden shadow-[var(--ov-shadow-panel)]">
              {avatarUrl && !imgError ? (
                <img
                  src={avatarUrl}
                  alt={`${name} avatar`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="ekam-figure grid h-full w-full place-items-center bg-[var(--ov-ember-fill)] text-[var(--ov-on-ember)]">
                  <span className="text-3xl font-semibold" aria-label={`Avatar initial for ${name}`}>
                    {getInitial(name)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative px-6 pt-20 pb-6 flex-1">

          {/* Text */}
          <div className="text-center">
            <h2 className="ekam-figure text-[19px] font-bold leading-tight text-[var(--ov-ink)] break-words">
              {name}
            </h2>
            {company ? (
              <p className="mt-1.5 break-words text-[13px] text-[var(--ov-ink-2)]">{company}</p>
            ) : null}
            {role ? (
              <p className="ekam-eyebrow mt-2 inline-flex items-center rounded-full bg-[var(--ov-ember-wash)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ov-ember)]">
                {role}
              </p>
            ) : null}
          </div>

          {/* Divider */}
          <div className="mt-5 mb-4 h-px w-10/12 mx-auto bg-[var(--ov-line)]" />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-center flex-shrink-0">
            <div className="rounded-xl bg-[var(--ov-fill-subtle)] py-3 ring-1 ring-[color:var(--ov-line)]">
              <p className="ekam-figure text-[24px] font-bold leading-none text-[var(--ov-ember)]">
                {posts}
              </p>
              <p className="mt-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.04em] text-[var(--ov-ink-4)]">
                Posts
              </p>
            </div>
            <div className="rounded-xl bg-[var(--ov-fill-subtle)] py-3 ring-1 ring-[color:var(--ov-line)]">
              <p className="ekam-figure text-[24px] font-bold leading-none text-[var(--ov-ember)]">
                {connections}
              </p>
              <p className="mt-1.5 text-[9px] font-semibold uppercase leading-none tracking-[0.04em] text-[var(--ov-ink-4)]">
                Connections
              </p>
            </div>
          </div>
        </div>
      </div>
    </GradientContainer>
  );
};

export default ProfileCard;