import React from "react";

export interface AttendanceColumn {
  key: string;
  label: string;
  /** Width applied via <colgroup> — e.g. "200px" or "1.5rem" */
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  // Allow extra style/class props (used by page-level config, ignored by component)
  className?: string;
  headerClassName?: string;
  cellClassName?: string;
  style?: React.CSSProperties;
  headerStyle?: React.CSSProperties;
  cellStyle?: React.CSSProperties;
}

export interface AttendanceGroupedHeader {
  groups: { label: string; colSpan: number }[];
}

interface Props {
  columns: AttendanceColumn[];
  data: any[];
  searchValues: { [key: string]: string };
  onSearchChange: (key: string, value: string) => void;
  groupedHeaders?: AttendanceGroupedHeader;
}

type SortDir = "asc" | "desc";

const AttendanceDataTable: React.FC<Props> = ({
  columns,
  data,
  searchValues,
  onSearchChange,
  groupedHeaders,
}) => {
  const [sort, setSort] = React.useState<{ key: string | null; dir: SortDir }>({ key: null, dir: "asc" });

  const sortedData = React.useMemo(() => {
    if (!sort.key) return data;
    const k = sort.key;
    const dir = sort.dir;
    return [...data].sort((a, b) => {
      const av = String(a[k] ?? "").toLowerCase();
      const bv = String(b[k] ?? "").toLowerCase();
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sort]);

  const headerBg = "bg-[var(--table-head-bg)]";
  const headerText = "text-[var(--table-head-ink)]";

  const [firstCol, ...dateCols] = columns;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
        {/* Enforce column widths via colgroup */}
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: col.width, minWidth: col.width }} />
          ))}
        </colgroup>

        <thead>
          {/* Row 1: Member Name (rowspan 3) + month group headers */}
          <tr className={`${headerBg} ${headerText}`}>
            <th
              className="px-4 py-4 text-left text-base font-semibold select-none cursor-pointer"
              rowSpan={3}
              onClick={() =>
                setSort((prev) => ({
                  key: firstCol.key,
                  dir: prev.key === firstCol.key && prev.dir === "asc" ? "desc" : "asc",
                }))
              }
            >
              {firstCol.label}
            </th>
            {groupedHeaders?.groups.map((g, idx) => (
              <th
                key={`grp-${idx}`}
                colSpan={g.colSpan}
                className="py-3 text-center text-sm font-semibold border-l border-[color:var(--table-rule)]"
                style={{ padding: "0.5rem 0" }}
              >
                {g.label}
              </th>
            ))}
          </tr>

          {/* Row 2: divider */}
          <tr>
            <th
              colSpan={Math.max(0, columns.length - 1)}
              className="h-[2px] bg-[color:var(--table-rule)] p-0 m-0 border-0"
            />
          </tr>

          {/* Row 3: individual date labels */}
          <tr className={`${headerBg} ${headerText}`}>
            {dateCols.map((col) => (
              <th
                key={col.key}
                className="border-l border-[color:var(--table-rule)] text-center text-xs font-semibold select-none"
                style={{ padding: "0.5rem 0" }}
              >
                {col.label}
              </th>
            ))}
          </tr>

          {/* Row 4: search row (only Member Name column is searchable) */}
          <tr className="bg-[var(--table-search-bg)] border-b border-[color:var(--table-line)]">
            <th className="px-4 py-2">
              {firstCol.searchable ? (
                <input
                  type="text"
                  placeholder="Search"
                  value={searchValues[firstCol.key] || ""}
                  onChange={(e) => onSearchChange(firstCol.key, e.target.value)}
                  className="h-9 w-full px-3 bg-[var(--table-search-bg)] border border-[color:var(--table-search-line)] rounded-lg text-[var(--table-ink)] text-sm placeholder:text-[color:var(--table-search-line)] focus:outline-none focus:border-[color:var(--field-border-focus)]"
                />
              ) : (
                <div className="h-9" />
              )}
            </th>
            {dateCols.map((col) => (
              <th key={`s-${col.key}`} className="border-l border-[color:var(--table-rule)]" />
            ))}
          </tr>
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
              key={rIdx}
              className={`${rIdx % 2 === 0 ? "bg-[var(--table-row)]" : "bg-[var(--table-row-alt)]"} border-t border-[color:var(--table-line)]`}
            >
              {/* Member Name cell */}
              <td className="px-4 py-2 text-[var(--table-ink)] text-sm truncate">
                {String(row[firstCol.key] ?? "")}
              </td>

              {/* Date cells */}
              {dateCols.map((col) => (
                <td
                  key={col.key}
                  className="border-l border-[color:var(--table-rule)] text-center align-middle"
                  style={{ padding: 0 }}
                >
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AttendanceDataTable;
