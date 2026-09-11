import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Layers, ArrowUpRight, Globe, MapPin, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BEAT, EASE_OUT, EMBER, densityRatio, formatNumberFull, formatRatio } from "./chartTheme";
import Figure from "./Figure";

const NODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  countries: Globe,
  regions: MapPin,
  chapters: Layers,
  totalMembers: Users,
  members: Users,
};

export interface CascadeNode {
  key: string;
  /** Plural noun for the level, e.g. "Regions". */
  label: string;
  value: number;
  iconSrc?: string;
  /** Singular noun of the level above, used for the density line: "per country". */
  parentNoun?: string;
}

interface CascadeRailProps {
  nodes: CascadeNode[];
  /** Bumped whenever a fresh result lands, to replay the sweep. */
  sweepKey: React.Key;
}

/**
 * The four scale metrics, drawn as the containment chain they actually are.
 *
 * Countries contain regions contain chapters contain members. Rendering them as
 * four sibling cards throws that away and asks the reader to hold the hierarchy
 * in their head; rendering them as one rail states it. Each level past the first
 * carries its density against the level above, which is the number an operator
 * is really deriving when they scan these four figures.
 *
 * The rail sits in a recessed trough rather than on a raised card — it is the
 * ground the rest of the screen is measured against, not another card on it.
 */
const NODE_ROUTES: Record<string, string> = {
  countries: "/admin/countries",
  regions: "/admin/regions",
  chapters: "/admin/chapters",
  totalMembers: "/admin/members",
  members: "/admin/members",
};

export const CascadeRail: React.FC<CascadeRailProps> = ({ nodes, sweepKey }) => {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  return (
    <motion.section
      aria-labelledby="cascade-heading"
      initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: BEAT.cascade, ease: EASE_OUT }}
      className="relative mb-4 overflow-hidden rounded-2xl bg-[var(--ov-panel)] ring-1 ring-[color:var(--ov-line)] shadow-[var(--ov-shadow-panel)]"
    >
      {/* The one orchestrated moment: an ember sweep runs the length of the rail
          on load and again on every fresh result, then gets out of the way. */}
      {!reduceMotion && (
        <motion.span
          key={sweepKey}
          aria-hidden="true"
          className="ekam-sweep pointer-events-none absolute top-0 left-0 h-px w-2/5"
          style={{
            background: `linear-gradient(90deg, transparent, ${EMBER}, transparent)`,
          }}
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: "350%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.15, delay: BEAT.cascade + 0.05, ease: "easeInOut" }}
        />
      )}

      <div className="flex items-center justify-between px-5 pt-4 sm:px-6">
        <div className="ekam-heading-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[#E85A14]">
          <Layers className="h-3.5 w-3.5" />
          <h2
            id="cascade-heading"
            className="ekam-eyebrow text-[11px] font-bold tracking-wider uppercase text-[#E85A14]"
          >
            Network cascade
          </h2>
        </div>
        <p className="hidden text-[11px] text-[var(--ov-ink-4)] sm:block">
          Click any level to drill down into its records
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4">
        {nodes.map((node, index) => {
          const parent = index > 0 ? nodes[index - 1] : null;
          const ratio = parent ? densityRatio(node.value, parent.value) : null;
          const route = NODE_ROUTES[node.key];

          const handleDrillDown = () => {
            if (route) navigate(route);
          };

          return (
            <motion.div
              key={node.key}
              role="button"
              tabIndex={0}
              onClick={handleDrillDown}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleDrillDown();
                }
              }}
              aria-label={`Drill down into ${node.label}`}
              initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: BEAT.node + index * BEAT.nodeStagger,
                ease: EASE_OUT,
              }}
              className="group relative px-5 py-5 sm:px-6 sm:py-6 cursor-pointer transition-colors duration-150 hover:bg-[#F8FAFC]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85A14]"
            >
              {/* Divider plus chevron: the containment link, drawn once between
                  levels. Hidden on the first cell of each row so it never dangles
                  off the left edge when the grid wraps to two columns. */}
              {index > 0 && (
                <>
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-5 left-0 w-px bg-gradient-to-b from-transparent via-[color:var(--ov-line)] to-transparent ${
                      index % 2 === 0 ? "hidden lg:block" : ""
                    }`}
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--ov-panel)] text-[var(--ov-ink-5)] ring-1 ring-[color:var(--ov-line)] transition-colors duration-200 group-hover:text-[var(--ov-ember)] group-hover:ring-[color:var(--ov-ember-edge)] ${
                      index % 2 === 0 ? "hidden lg:grid" : ""
                    }`}
                  >
                    <ChevronRight className="h-3 w-3" strokeWidth={2.5} />
                  </span>
                </>
              )}

              <div className="mb-3 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {(() => {
                    const IconComp = NODE_ICONS[node.key] || Layers;
                    return (
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-orange-50 text-[#E85A14] ring-1 ring-orange-200/80 transition-colors duration-200 group-hover:bg-[#E85A14] group-hover:text-white shadow-xs">
                        <IconComp className="h-3.5 w-3.5 transition-colors" />
                      </span>
                    );
                  })()}
                  <h3 className="ekam-eyebrow truncate text-[11px] font-bold uppercase tracking-wider text-[var(--ov-ink-3)] group-hover:text-[var(--ov-ink)] transition-colors">
                    {node.label}
                  </h3>
                </div>

                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#64748B] opacity-0 group-hover:opacity-100 group-hover:text-[#E85A14] transition-all shrink-0">
                  <span className="hidden sm:inline">View</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <Figure
                value={node.value}
                format={formatNumberFull}
                delay={BEAT.node + index * BEAT.nodeStagger}
                className="block text-[32px] font-semibold leading-none text-[var(--ov-ink)] sm:text-[40px] group-hover:text-[#0B2130] transition-colors"
              />

              {/* Density against the level above. An operator scanning four raw
                  counts is computing this ratio anyway. */}
              <p className="mt-2.5 min-h-[1.25rem] text-[11px] leading-5 text-[var(--ov-ink-4)]">
                {parent ? (
                  ratio === null ? (
                    <span className="text-[var(--ov-ink-5)]">
                      No {parent.label.toLowerCase()} to divide by
                    </span>
                  ) : (
                    <>
                      <span className="ekam-figure font-semibold text-[var(--ov-ink-2)]">
                        {formatRatio(ratio)}
                      </span>{" "}
                      per {node.parentNoun ?? parent.label.toLowerCase()}
                    </>
                  )
                ) : (
                  <span className="text-[var(--ov-ink-5)]">Top of the network</span>
                )}
              </p>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default CascadeRail;
