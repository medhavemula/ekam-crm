import React from "react";

/** Public type you can import elsewhere */
export interface TableColumn {
  key: string;
  label: string;
  sublabel?: string;
  sortable?: boolean;
  searchable?: boolean;
  /** Overrides colMinWidth for this one column, in px — for a column (email, notes) that regularly needs more room than the rest. */
  minWidth?: number;
}

interface DataTableProps {
  columns: TableColumn[];
  data: any[];
  searchValues: { [key: string]: string };
  onSearchChange: (key: string, value: string) => void;
  className?: string;
  onRowClick?: (row: any) => void;
  showSearchRow?: boolean;
  noOverflow?: boolean; // if true, do not add overflow-x-auto wrapper
  noMinWidth?: boolean; // if true, do not enforce min-w on table
  /** Minimum width per column, in px. Multiplied by column count for the table's min-width. */
  colMinWidth?: number;
  /** Columns size to their actual content instead of clipping to colMinWidth — the table grows and the wrapper scrolls to show everything in full. */
  fitContent?: boolean;
  headerBgClassName?: string; // customize header background color
  headerTextClassName?: string; // customize header text color
  stickyHeader?: boolean;
  renderCell?: (column: TableColumn, row: any) => React.ReactNode; // custom cell renderer
  // Optional built-in pagination
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  // Optional grouped header support (two-tier header)
  groupedHeaders?: {
    leftRowSpan?: number; // default 2
    groups: { label: string; colSpan: number }[]; // e.g., months with span of dates
  };
}

type SortDir = "asc" | "desc";
interface SortState {
  key: string | null;
  dir: SortDir;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  searchValues,
  onSearchChange,
  className = "",
  onRowClick,
  showSearchRow = false,
  noOverflow = false,
  noMinWidth = false,
  colMinWidth = 160,
  fitContent = false,
  headerBgClassName,
  headerTextClassName,
  stickyHeader = false,
  renderCell,
  total,
  page,
  pageSize,
  onPageChange,
  groupedHeaders,
}) => {
  const [sort, setSort] = React.useState<SortState>({ key: null, dir: "asc" });
  const headerBg = headerBgClassName || "bg-[var(--table-head-bg)]";
  const headerText = headerTextClassName || "text-[var(--table-head-ink)]";
  const stickyHeaderCellClass = stickyHeader ? `${headerBg} sticky top-0 z-20` : "";
  const stickySearchCellClass = stickyHeader ? "sticky top-[49px] z-10 bg-[var(--table-search-bg)]" : "";

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  };

  const sortedData = React.useMemo(() => {
    if (!sort.key) return data;

    const k = sort.key as keyof (typeof data)[number];
    const dir = sort.dir;

    const toVal = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);

      // dd/mm/yyyy
      const ddmmyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      // yyyy-mm-dd
      const iso = /^(\d{4})-(\d{2})-(\d{2})$/;

      if (ddmmyy.test(s)) {
        const [, d, m, y] = s.match(ddmmyy)!;
        return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
      }
      if (iso.test(s)) return new Date(s).getTime();

      return s.toLowerCase();
    };

    const arr = [...data];
    arr.sort((a, b) => {
      const av = toVal(a[k]);
      const bv = toVal(b[k]);
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [data, sort]);

  const anySearchable = React.useMemo(() => columns.some((c) => !!c.searchable), [columns]);

  const isPaginated = typeof page === "number" && typeof pageSize === "number" && typeof onPageChange === "function";
  const totalPages = React.useMemo(() => {
    if (!isPaginated) return undefined;
    if (typeof total === "number" && pageSize! > 0) {
      return Math.max(1, Math.ceil(total / pageSize!));
    }
    return undefined;
  }, [isPaginated, total, pageSize]);
  const canPrev = isPaginated ? (page! > 1) : false;
  const canNext = React.useMemo(() => {
    if (!isPaginated) return false;
    if (typeof totalPages === "number") return page! < totalPages;
    // If total unknown, enable Next while we have a full page of rows
    return sortedData.length >= (pageSize ?? 0) && (pageSize ?? 0) > 0;
  }, [isPaginated, totalPages, page, sortedData.length, pageSize]);

  const TableInner = (
    <div className="relative">
      <div className={noOverflow ? "" : "overflow-x-auto"}>
        {/* table-fixed keeps layout stable; a per-column min-width (rather than
            one flat floor) makes a many-column table actually wider than its
            container, so the overflow wrapper has real content to scroll. */}
        <table
          className={`w-full border-collapse ${fitContent ? "table-auto" : "table-fixed"}`}
          style={noMinWidth ? undefined : { minWidth: columns.reduce((sum, c) => sum + (c.minWidth ?? colMinWidth), 0) }}
        >
          {/* Each column claims its own width rather than table-fixed splitting
              the table evenly across however many there are — a long-text
              column (email, notes) can ask for more room than a date column. */}
          {!noMinWidth && (
            <colgroup>
              {columns.map((c) => (
                <col key={c.key} style={{ width: c.minWidth ?? colMinWidth }} />
              ))}
            </colgroup>
          )}
          <thead>
            {/* Header row */}
            {groupedHeaders ? (
              <>
                <tr className={`${headerBg} ${headerText}`}>
                  {/* First column spans two rows */}
                  {columns.length > 0 && (
                    <th
                      key={columns[0].key}
                      className={`px-5 py-3 text-left text-sm font-medium select-none ${columns[0].sortable ? "cursor-pointer" : ""}`}
                      rowSpan={groupedHeaders.leftRowSpan ?? 3}
                      onClick={columns[0].sortable ? () => toggleSort(columns[0].key) : undefined}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{columns[0].label}</span>
                        </div>
                        {columns[0].sublabel && (
                          <div className="text-xs opacity-70 truncate" title={columns[0].sublabel}>
                            {columns[0].sublabel}
                          </div>
                        )}
                      </div>
                    </th>
                  )}
                  {/* Group cells */}
                  {groupedHeaders.groups.map((g, idx) => (
                    <th key={`grp-${idx}`} className={`px-5 py-3 text-center text-sm font-medium select-none ${idx >= 0 ? "border-l border-[color:var(--table-rule)]" : ""}`} colSpan={g.colSpan}>
                      <span className="truncate inline-block w-full">{g.label}</span>
                    </th>
                  ))}
                </tr>
                {/* Divider between month groups and day labels */}
                <tr>
                  {/* span only the date columns since first column has rowSpan */}
                  <th colSpan={Math.max(0, columns.length - 1)} className="h-[2px] bg-[var(--table-rule)] p-0 m-0 border-0" />
                </tr>
                {/* Second header row: individual column labels (skip first) */}
                <tr className={`${headerBg} ${headerText}`}>
                  {columns.slice(1).map((col, idx) => (
                    <th
                      key={col.key}
                      className={`px-5 py-2 text-left text-xs font-medium select-none ${idx >= 0 ? "border-l border-[color:var(--table-rule)]" : ""}`}
                    >
                      <span className="truncate">{col.label}</span>
                    </th>
                  ))}
                </tr>
                {/* Search row for grouped header tables (only first column searchable) */}
                {showSearchRow && anySearchable && (
                  <tr className="bg-[var(--table-search-bg)] border-b border-[color:var(--table-line)]">
                    {/* First column search cell */}
                    <th className="px-5 py-2">
                      {columns[0].searchable ? (
                        <input
                          type="text"
                          placeholder="Search"
                          value={searchValues[columns[0].key] || ""}
                          onChange={(e) => onSearchChange(columns[0].key, e.target.value)}
                          className="h-9 w-full px-3 bg-[var(--table-search-bg)] border border-[color:var(--table-search-line)] rounded-lg text-[var(--field-ink)] text-sm placeholder-[var(--ov-ink-5)] focus:outline-none focus:border-[color:var(--field-border-focus)]"
                        />
                      ) : (
                        <div className="h-9" />
                      )}
                    </th>
                    {/* Empty placeholders for date columns */}
                    {columns.slice(1).map((_, idx) => (
                      <th key={`search-empty-${idx}`} className={`px-5 py-2 ${idx >= 0 ? 'border-l border-[color:var(--table-rule)]' : ''}`} />
                    ))}
                  </tr>
                )}
              </>
            ) : (
              <tr className={`${headerBg} ${headerText}`}>
              {columns.map((col, idx) => {
                const isActive = sort.key === col.key;

                return (
                  <th
                    key={col.key}
                    className={`px-5 py-3 text-left text-sm font-medium select-none ${
                      col.sortable ? "cursor-pointer" : ""
                    } ${idx > 0 ? "border-l border-[color:var(--table-rule)]" : ""} ${stickyHeaderCellClass}`}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{col.label}</span>

                      {col.sortable && (
                        <span className="inline-flex items-center gap-0">
                          {/* Up (ASC) */}
                          <button
                            type="button"
                            className="p-0 leading-none shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSort({ key: col.key, dir: "asc" });
                            }}
                            aria-label={`Sort ${col.label} ascending`}
                          >
                            <svg
                              className={`w-3.5 h-4 transition-opacity ${
                                isActive && sort.dir === "asc" ? "opacity-100" : "opacity-60"
                              }`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="12" y1="19" x2="12" y2="5" />
                              <polyline points="5 12 12 5 19 12" />
                            </svg>
                          </button>

                          {/* Down (DESC) */}
                          <button
                            type="button"
                            className="p-0 leading-none shrink-0 -ml-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSort({ key: col.key, dir: "desc" });
                            }}
                            aria-label={`Sort ${col.label} descending`}
                          >
                            <svg
                              className={`w-3.5 h-4 transition-opacity ${
                                isActive && sort.dir === "desc" ? "opacity-100" : "opacity-60"
                              }`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <polyline points="19 12 12 19 5 12" />
                            </svg>
                          </button>
                        </span>
                      )}
                      </div>
                      {col.sublabel && (
                        <div className="text-xs opacity-70 truncate" title={col.sublabel}>
                          {col.sublabel}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
            )}

            {/* Search inputs row (optional) */}
            {(!groupedHeaders && showSearchRow && anySearchable) && (
              <tr className="bg-[var(--table-search-bg)] border-b border-[color:var(--table-line)]">
                {columns.map((col, idx) => (
                  <th key={`search-${col.key}`} className={`px-5 py-2 ${idx > 0 ? 'border-l border-[color:var(--table-rule)]' : ''} ${stickySearchCellClass}`}>
                    {col.searchable ? (
                      <input
                        type="text"
                        placeholder="Search"
                        value={searchValues[col.key] || ""}
                        onChange={(e) => onSearchChange(col.key, e.target.value)}
                        className="h-9 w-full px-3 bg-[var(--table-search-bg)] border border-[color:var(--table-search-line)] rounded-lg 
                                   text-[var(--field-ink)] text-sm placeholder-[var(--ov-ink-5)]
                                   focus:outline-none focus:border-[color:var(--field-border-focus)]"
                      />
                    ) : (
                      <div className="h-9" />
                    )}
                  </th>
                ))}
              </tr>
            )}
          </thead>

          <tbody>
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-6 text-center text-[var(--ov-ink-4)]">
                  No data available
                </td>
              </tr>
            )}
            {sortedData.map((row, rIdx) => (
              <tr
                key={row.id ?? rIdx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${
                  rIdx % 2 === 0 ? "bg-[var(--table-row)]" : "bg-[var(--table-row-alt)]"
                } border-t border-[color:var(--table-line)] hover:bg-[var(--table-row-hover)] transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((col, cIdx) => {
                  // Use custom renderer if provided, otherwise default to string
                  const cellContent = renderCell ? renderCell(col, row) : null;
                  const defaultContent = String(row[col.key] ?? "");
                  
                  return (
                    <td
                      key={col.key}
                      className={[
                        "px-5 py-4 text-[var(--table-ink)] text-sm align-middle",
                        cIdx === 0 ? "" : "border-l border-[color:var(--table-rule)]",
                        cellContent ? "" : fitContent ? "whitespace-nowrap" : "truncate",
                      ].join(" ")}
                      title={cellContent || fitContent ? undefined : defaultContent}
                    >
                      {cellContent !== null ? cellContent : defaultContent}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isPaginated && (
        <div className="border-t border-[color:var(--table-line)] p-4 text-sm text-[var(--ov-ink-4)]">
          <div className="flex items-center justify-between">
            <span>
              {typeof total === "number" && typeof totalPages === "number"
                ? totalPages <= 1
                  ? `Showing all ${total} ${total === 1 ? "entry" : "entries"}`
                  : `Showing ${sortedData.length} of ${total} entries`
                : `Showing ${sortedData.length} entries`}
            </span>
            {totalPages !== undefined && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => canPrev && onPageChange!(page! - 1)}
                  disabled={!canPrev}
                  className={`px-3 py-1 rounded-lg border border-[color:var(--ov-line)] ${canPrev ? "hover:bg-[var(--ov-fill-subtle)]" : "opacity-50 cursor-not-allowed"}`}
                >
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => canNext && onPageChange!(page! + 1)}
                  disabled={!canNext}
                  className={`px-3 py-1 rounded-lg border border-[color:var(--ov-line)] ${canNext ? "hover:bg-[var(--ov-fill-subtle)]" : "opacity-50 cursor-not-allowed"}`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return <div className={`relative ${className}`}>{TableInner}</div>;
}

export default DataTable;
