import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../../components/toast/ToastProvider";
import { useGetEdM2OQuery, useSubmitEdM2OMutation, useUnlockEdM2OMutation, useUpdateM2OLinesMutation } from "../../../services/ed/edM2OApi";
import Navbar from "../../../components/navigation/Navbar";
import PageHeader from "../../../components/common/PageHeader";
import GradientContainer from "../../../components/common/GradientContainer";
import StatCardSmall from "../../../components/common/StatCardSmall";
import DataTable from "../../../components/common/DataTable";
import type { TableColumn } from "../../../components/common/DataTable";


interface ProcessedData {
  rows: AttendeeRecord[];
  summary: {
    totalMembers: number;
    present: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  readOnly: boolean;
  meetingDate: string;
  status?: string;
  meetingType?: string;
  createdBy?: string;
}

interface AttendeeRecord {
  id: string;
  memberId: string;
  name: string;
  attendance: "P" | "L" | "A" | "S" | "M";
}

// Table columns configuration
const columns: TableColumn[] = [
  { key: "name", label: "Member Name", sortable: true, searchable: true },
  { key: "attendance", label: "Attendance", sortable: true, searchable: true },
];

const ROWS_BATCH_SIZE = 10;

export default function EDM20Page() {
  // Hooks must be called unconditionally at the top level
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // State for UI
  const [isEditing, setIsEditing] = useState(false);
  const [editableLines, setEditableLines] = useState<AttendeeRecord[]>([]);
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(ROWS_BATCH_SIZE);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch M2O meeting data
  const {
    data: m2oDataRes,
    isLoading: isM2OLoading,
    error: m2oError
  } = useGetEdM2OQuery(id || '', {
    skip: !id,
    refetchOnMountOrArgChange: true
  });

  // Mutation for submitting M2O data
  const [submitM2O] = useSubmitEdM2OMutation();
  
  // Mutation for updating M2O lines
  const [updateM2OLines] = useUpdateM2OLinesMutation();
  
  // Mutation for unlocking M2O meeting
  const [unlockM2O] = useUnlockEdM2OMutation();

  // Load saved data from session storage
  useEffect(() => {
    const savedData = sessionStorage.getItem(`meeting_${id}_data`);
    if (savedData) {
      try {
        setEditableLines(JSON.parse(savedData));
      } catch (err) {
        console.error('Error parsing saved data:', err);
      }
    }
  }, [id]);

  // Generate idempotency key for the session
  const idempotencyKey = useMemo(() => {
    const storedKey = sessionStorage.getItem(`meeting_${id}_idempotency_key`);
    return storedKey || `m2o-${new Date().toISOString().split('T')[0].split('-').reverse().join('-')}-${Math.floor(100 + Math.random() * 900)}`;
  }, [id]);

  // Save editable lines to session storage
  useEffect(() => {
    if (editableLines.length > 0) {
      sessionStorage.setItem(`meeting_${id}_data`, JSON.stringify(editableLines));
      sessionStorage.setItem(`meeting_${id}_idempotency_key`, idempotencyKey);
    }
  }, [editableLines, id, idempotencyKey]);

  // Handle API errors
  useEffect(() => {
    if (m2oError) {
      console.error("Error loading meeting:", m2oError);
      showToast({
        title: 'Error',
        description: `Failed to load meeting details: ${(m2oError as any)?.data?.message || 'Unknown error'}`,
        kind: 'error',
      });
      
      if ((m2oError as any)?.status === 401) {
        navigate('/dashboard');
      }
    }
  }, [m2oError, showToast, navigate]);

  // Map API response to ProcessedData format
  const processData = (data: any): ProcessedData => {
    const defaultData = {
      rows: [],
      summary: {
        totalMembers: 0,
        present: 0,
      },
      pagination: {
        page: 1,
        limit: 10,
        total: 0
      },
      readOnly: true,
      meetingDate: new Date().toISOString(),
      meetingType: '',
      createdBy: '',
      status: 'PENDING'
    };

    if (!data) {
      console.warn('No data provided to processData');
      return defaultData;
    }

    try {
      // Validate data structure
      if (!data.lines || !Array.isArray(data.lines)) {
        console.warn('Invalid data.lines structure:', data);
        return defaultData;
      }

      // Map lines to attendee records
      const rows = data.lines.map((line: any, index: number) => {
        // Validate each line has required structure
        if (!line || !line.memberId || !line.memberId._id) {
          console.warn(`Invalid line at index ${index}:`, line);
          return null;
        }
        
        return {
          id: line.memberId._id,
          memberId: line.memberId._id,
          name: line.memberId.name || 'Unknown',
          attendance: (line.attendance as "P" | "L" | "A" | "S" | "M") || 'A',
        };
      }).filter(Boolean); // Remove null entries

      return {
        rows,
        summary: {
          totalMembers: data.kpis?.totalMembers || rows.length,
          present: data.kpis?.present || 0,
        },
        pagination: {
          page: 1,
          limit: 10,
          total: rows.length
        },
        readOnly: data.status === 'CLOSED',
        meetingDate: data.date || new Date().toISOString(),
        meetingType: data.meetingType || '',
        createdBy: data.targetMemberId?.name || '',
        status: data.status || 'PENDING'
      };
    } catch (err) {
      console.error('Error in processData:', err);
      return defaultData;
    }
  };

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return editableLines;
    }

    return editableLines.filter((record) =>
      Object.values(record).some((value) =>
        String(value ?? "").toLowerCase().includes(normalizedSearch)
      )
    );
  }, [editableLines, searchTerm]);

  const visibleRows = useMemo(
    () => filteredRows.slice(0, visibleCount),
    [filteredRows, visibleCount]
  );

  const hasMoreRows = visibleRows.length < filteredRows.length;

  const handleTableScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMoreRows) return;

    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 48;

    if (isNearBottom) {
      setVisibleCount((prev) => Math.min(prev + ROWS_BATCH_SIZE, filteredRows.length));
    }
  };

  const handleSearchChange = (key: string, value: string) => {
    setColumnSearches(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Process the M2O data
  const processedData = useMemo<ProcessedData>(() => {
    // Default empty data structure
    const defaultData: ProcessedData = {
      rows: [],
      summary: {
        totalMembers: 0,
        present: 0,
      },
      pagination: {
        page: 1,
        limit: 10,
        total: 0
      },
      readOnly: false,
      meetingDate: new Date().toISOString()
    };

    try {
      if (m2oDataRes?.data) {
        const result = processData(m2oDataRes.data);
        // Validate the processed data has required structure
        if (result && typeof result === 'object' && Array.isArray(result.rows)) {
          return result;
        }
      }
      return defaultData;
    } catch (err) {
      console.error('Error processing M2O data:', err);
      return defaultData;
    }
  }, [m2oDataRes]);

  const isMeetingDateInFuture = useMemo(() => {
    if (!processedData.meetingDate) return false;
    const meetingDate = new Date(processedData.meetingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    meetingDate.setHours(0, 0, 0, 0);
    return meetingDate > today;
  }, [processedData.meetingDate]);

  const getDisplayAttendance = (attendance: string) => {
    if (isMeetingDateInFuture && attendance === "P") {
      return "-";
    }
    return attendance;
  };

  // Update editable lines when processed data changes
  useEffect(() => {
    if (processedData.rows && processedData.rows.length > 0) {
      setEditableLines(processedData.rows);
    }
  }, [processedData.rows]);

  useEffect(() => {
    setVisibleCount(ROWS_BATCH_SIZE);
  }, [searchTerm, editableLines.length]);

  // Handle before unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Handle loading and error states
  if (isM2OLoading) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
          <p className="text-white">Loading meeting data...</p>
        </div>
      </div>
    );
  }

  if (m2oError) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-6 py-4 rounded-lg mb-4">
            Failed to load meeting data. Please try again.
          </div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!m2oDataRes || !m2oDataRes.data) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="text-center">
          <div className="text-white mb-4">No meeting data found.</div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-[#D85D27] hover:bg-[#C24F20] text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Meeting data is now directly used from processedData

  // Using processedData.summary directly instead of creating a new object


  const handleEdit = async () => {
    if (!id) return;
    
    // Only call unlock API if status is SUBMITTED or LOCKED
    const needsUnlock = processedData.status === 'SUBMITTED' || processedData.status === 'LOCKED';
    
    try {
      if (needsUnlock) {
        // Call unlock API first
        await unlockM2O(id).unwrap();
        showToast({
          title: 'Success',
          description: 'Meeting unlocked for editing',
          kind: 'success',
        });
      }
      setIsEditing(true);
    } catch (err) {
      console.error('Error unlocking meeting:', err);
      showToast({
        title: 'Error',
        description: (err as any)?.data?.message || 'Failed to unlock meeting',
        kind: 'error',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setIsUpdating(true);
      
      // Prepare the data to submit
      const submitData = {
        lines: editableLines.map(line => ({
          memberId: line.memberId,
          attendance: line.attendance,
        })),
        kpis: {
          totalMembers: processedData.summary.totalMembers,
          present: processedData.summary.present,
        }
      };

      // First, call the lines API
      await updateM2OLines({
        m2oId: id,
        data: submitData
      }).unwrap();
      
      // If lines API succeeds, immediately call the submit API
      await submitM2O({
        m2oId: id,
        data: submitData
      }).unwrap();
      
      showToast({
        title: 'Success',
        description: 'Meeting details submitted successfully',
        kind: 'success',
      });

      setIsEditing(false);
      
      // Navigate back to ManyToOnePage after a short delay
      setTimeout(() => {
        navigate('/admin/many-to-one', { state: { refresh: true } });
      }, 500);
      
    } catch (err) {
      console.error('Error saving meeting details:', err);
      
      const errorMessage = (err as any)?.data?.message || 'Failed to save meeting details. Please try again.';
      
      showToast({
        title: 'Error',
        description: errorMessage,
        kind: 'error',
      });
      
      if ((err as any)?.status === 401) {
        navigate('/dashboard');
      }
    } finally {
      // Always reset the loading state, whether the submission succeeded or failed
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    // Reset to original data when canceling edit
    if (m2oDataRes?.data) {
      setEditableLines(processData(m2oDataRes.data).rows);
    }
    setIsEditing(false);
  };

  const breadcrumbs = [
    { label: "Business", onClick: () => navigate("/dashboard") },
    { label: "M2O Meetings", onClick: () => navigate("/admin/many-to-one") },
    { label: "M2O Meeting Details" },
  ];

  return (
    <div className="min-h-screen bg-[#0f1419]">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
          <PageHeader breadcrumbs={breadcrumbs} />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCardSmall title="Total Members" value={String(processedData.summary.totalMembers)} />
          <StatCardSmall title="Present" value={String(processedData.summary.present)} />
        </div>

        <GradientContainer>
          <div className="rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative w-full max-w-xs">
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 pl-10 bg-[#0f1419] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                    <svg className="absolute left-3 top-2.5 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </div>
                </div>

                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">
                  M2O Meeting | {processedData?.meetingDate ? new Date(processedData.meetingDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }).replace(/\//g, '/') : 'Loading...'} 
                </h2>
                </div>

                <div className="flex-1 flex justify-end">
                  <div className="flex items-center">
                    {isEditing ? (
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={handleCancel}
                          disabled={isM2OLoading || isUpdating}
                          className="h-[40px] px-6 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSubmit}
                          disabled={isM2OLoading || isUpdating}
                          className="h-[40px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors disabled:opacity-50"
                        >
                          {isUpdating ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    ) : processedData.status !== 'CANCELLED' && processedData.status !== 'SCHEDULED' && (
                      <button
                        onClick={handleEdit}
                        disabled={isM2OLoading}
                        className="h-[40px] px-6 rounded-md bg-[#D85D27] hover:bg-[#C24F20] text-white font-medium transition-colors disabled:opacity-50"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div
              className="min-w-full max-h-[560px] overflow-y-auto"
              onScroll={handleTableScroll}
            >
              <DataTable
                columns={columns}
                data={visibleRows}
                searchValues={{ ...columnSearches, ...{ name: searchTerm } }}
                onSearchChange={handleSearchChange}
                showSearchRow={true}
                stickyHeader={true}
                noOverflow={true}
                renderCell={(column, row) => {
                  if (!isEditing) {
                    if (column.key === "attendance") {
                      return getDisplayAttendance(String(row.attendance ?? ""));
                    }
                    return row[column.key];
                  }

                  switch (column.key) {
                    case "attendance":
                      return (
                        <select
                          value={row.attendance}
                          onChange={(e) => setEditableLines((prev) => {
                            return prev.map(item => 
                              item.memberId === row.memberId 
                                ? { ...item, attendance: e.target.value as any }
                                : item
                            );
                          })}
                          className="w-full h-9 bg-[#0f1419] border border-gray-700 rounded text-white text-sm px-2"
                        >
                          <option value="P">Present (P)</option>
                          <option value="A">Absent (A)</option>
                        </select>
                      );
                    default:
                      return row[column.key];
                  }
                }}
              />
              <div className="px-4 py-3 text-sm text-gray-400">
                {hasMoreRows
                  ? `Showing ${visibleRows.length} of ${filteredRows.length} entries. Scroll to load more.`
                  : `Showing ${visibleRows.length} of ${filteredRows.length} entries`}
              </div>
            </div>
          </div>
        </GradientContainer>
      </main>
    </div>
  );
}
