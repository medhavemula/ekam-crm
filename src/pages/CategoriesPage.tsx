import React, { useState, useMemo, useEffect } from "react";
import { Pencil, Plus, Search as SearchIcon, Tags, Trash2, X } from "lucide-react";
import { ADMIN_THEME } from "../theme/themeScope";
import Navbar from "../components/navigation/Navbar";
import DataTable from "../components/common/DataTable";
import type { TableColumn } from "../components/common/DataTable";
import { TableSkeleton } from "../components/common/Skeletons";
import CreateModal from "../components/modals/CreateModal";
import { ConfirmationDialog } from "../components/common/ConfirmationDialog";
import { useRole } from "../hooks/useRole";
import { useToast } from "../components/toast/ToastProvider";
import { 
  useGetSACategoriesQuery, 
  useGetEDCategoriesQuery,
  useGetSCCategoriesQuery,
  useCreateSACategoryMutation, 
  useCreateEDCategoryMutation,
  useCreateSCCategoryMutation,
  useUpdateSACategoryMutation, 
  useUpdateEDCategoryMutation,
  useUpdateSCCategoryMutation,
  useDeleteSACategoryMutation, 
  useDeleteEDCategoryMutation,
  useDeleteSCCategoryMutation,
  type CreateCategoryInput,
  type UpdateCategoryInput
} from "../services/categoriesApi";

interface Category {
  id: string;
  name: string;
  value: string;
  type: "business" | "professional" | "social";
  scope: "global" | "regional";
  isActive: boolean;
  metadata?: {
    description?: string;
    sortOrder?: number;
    tags?: string[];
  };
}

const CategoriesPage: React.FC = () => {
  const { role } = useRole();
  const { showToast } = useToast();
  const [searchType, setSearchType] = useState<"business" | "professional" | "social">(() => {
    if (role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM") {
      return "business";
    } else if (role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") {
      return "business";
    } else if (role === "SOCIAL_CHAIRPERSON") {
      return "social";
    } else {
      return "business";
    }
  });
  
  // Update searchType when role changes
  useEffect(() => {
    if (role === "SOCIAL_CHAIRPERSON") {
      setSearchType("social");
    } else if (role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM") {
      setSearchType("business");
    } else if (role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") {
      setSearchType("business");
    }
  }, [role]);
  const [edTab, setEdTab] = useState<"global" | "regional">("global");
  const [socialTab, setSocialTab] = useState<"global" | "regional">("global");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // Search state. What is typed and what has been asked for are separate: the
  // query key feeds the request, so binding it straight to the input would fire
  // one request per keystroke.
  const [typedSearch, setTypedSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => {
      const next = typedSearch.trim();
      setSearchQuery((prev) => {
        if (prev === next) return prev;
        setCurrentPage(1);
        return next;
      });
    }, 350);
    return () => clearTimeout(t);
  }, [typedSearch]);
  
  // API hooks - only call the appropriate API based on user role
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM";
  const isExecutiveDirector = role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR";
  const isSocialChairperson = role === "SOCIAL_CHAIRPERSON";
  
  // Only call the API that matches the user's role
  const saCategoriesQuery = useGetSACategoriesQuery(
    isSuperAdmin ? {
      type: searchType,
      isActive: true,
      page: currentPage,
      limit: pageSize,
      sortBy: "name",
      sortOrder: "asc",
      search: searchQuery
    } : undefined,
    { skip: !isSuperAdmin }
  );
  
  const edCategoriesQuery = useGetEDCategoriesQuery(
    isExecutiveDirector ? {
      type: searchType,
      isActive: true,
      page: currentPage,
      limit: pageSize,
      search: searchQuery,
      ...(edTab === "regional" && { scope: "regional" })
    } : undefined,
    { skip: !isExecutiveDirector }
  );
  
  const socialCategoriesQuery = useGetSCCategoriesQuery(
    isSocialChairperson ? {
      type: "social" as const,
      isActive: true,
      page: currentPage,
      limit: pageSize,
      search: searchQuery,
      ...(socialTab === "regional" && { scope: "regional" })
    } : undefined,
    { skip: !isSocialChairperson }
  );
  
  // Select the appropriate query result based on role
  const { data: categoriesData, isLoading, error } = isSuperAdmin 
    ? saCategoriesQuery 
    : isExecutiveDirector 
      ? edCategoriesQuery 
      : isSocialChairperson 
        ? socialCategoriesQuery 
        : { data: undefined, isLoading: false, error: undefined };
  
  // Initialize mutation hooks
  const [createSACategory] = useCreateSACategoryMutation();
  const [createEDCategory] = useCreateEDCategoryMutation();
  const [createSCCategory] = useCreateSCCategoryMutation();
  const [updateSACategory] = useUpdateSACategoryMutation();
  const [updateEDCategory] = useUpdateEDCategoryMutation();
  const [updateSCCategory] = useUpdateSCCategoryMutation();
  const [deleteSACategory] = useDeleteSACategoryMutation();
  const [deleteEDCategory] = useDeleteEDCategoryMutation();
  const [deleteSCCategory] = useDeleteSCCategoryMutation();
  
  // State management
  const [searchValues, setSearchValues] = useState<{ [key: string]: string }>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Local state for fallback when API is not available
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  
  // Mock data for development/testing - filtered by role
  const mockCategories = useMemo<Category[]>(() => {
    const allMockCategories: Category[] = [
      { id: "1", name: "Technology", value: "technology", type: "business", scope: "global", isActive: true },
      { id: "2", name: "Healthcare", value: "healthcare", type: "business", scope: "global", isActive: true },
      { id: "3", name: "Finance", value: "finance", type: "business", scope: "global", isActive: true },
      { id: "4", name: "Software Development", value: "software-development", type: "professional", scope: "global", isActive: true },
      { id: "5", name: "Marketing", value: "marketing", type: "professional", scope: "global", isActive: true },
      { id: "6", name: "Community Events", value: "community-events", type: "social", scope: "regional", isActive: true },
      { id: "7", name: "Sports", value: "sports", type: "social", scope: "regional", isActive: true },
    ];
    
    // Filter mock data based on role
    if (isSuperAdmin) {
      return allMockCategories.filter(cat => cat.type === searchType);
    } else if (isExecutiveDirector) {
      return allMockCategories.filter(cat => 
        cat.type === searchType && 
        (edTab === 'global' ? cat.scope === 'global' : true)
      );
    } else if (isSocialChairperson) {
      return allMockCategories.filter(cat => 
        cat.type === 'social' && 
        (socialTab === 'global' ? cat.scope === 'global' : true)
      );
    }
    return [];
  }, [searchType, edTab, socialTab, isSuperAdmin, isExecutiveDirector, isSocialChairperson]);
  const allCategories = categoriesData?.data?.categories ? 
    categoriesData.data.categories : 
    [...mockCategories.filter(cat => cat.type === searchType), ...localCategories.filter(cat => cat.type === searchType)];

  // Role-based category types
  const categoryTypes = useMemo(() => {
    if (role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM") {
      return [
        { value: "business", label: "Business Categories" },
        { value: "professional", label: "Professional Categories" },
        { value: "social", label: "Social Categories" },
      ];
    } else if (role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") {
      return [
        { value: "business", label: "Business Categories" },
        { value: "professional", label: "Professional Categories" },
      ];
    } else if (role === "SOCIAL_CHAIRPERSON") {
      return [
        { value: "social", label: "Social Categories" },
      ];
    } else {
      // Default fallback
      return [
        { value: "business", label: "Business Categories" },
        { value: "professional", label: "Professional Categories" },
      ];
    }
  }, [role]);

  // Role-based title and description
  // The caption below already says which categories these are, so the heading
  // does not repeat it — the other admin screens are named in a word or two.
  const getPageTitle = () => "Categories";

  const getPageDescription = () => {
    if (role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM") {
      return "Manage global categories across the entire platform";
    } else if (role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") {
      return "Manage regional categories within your scope";
    }
    return "Manage different categories across the platform";
  };

  const chooseType = (type: "business" | "professional" | "social") => {
    setSearchType(type);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const columns: TableColumn[] = [
    { key: "name", label: "Category name", sortable: true, searchable: true },
    { key: "description", label: "Description" },
    ...((role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") 
      ? (edTab === "regional" ? [{ key: "actions", label: "Actions" }] : [])
      : (role === "SOCIAL_CHAIRPERSON")
        ? (socialTab === "regional" ? [{ key: "actions", label: "Actions" }] : [])
        : [{ key: "actions", label: "Actions" }]
    ),
  ];

  const handleSearchChange = (key: string, value: string) => {
    setSearchValues(prev => ({ ...prev, [key]: value }));
    
    // If the name field is being changed, automatically trigger search
    if (key === 'name') {
      setSearchQuery(value);
      setCurrentPage(1); // Reset to first page when searching
    }
  };

  const handleAddCategory = () => {
    setIsAddModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setIsDeleting(true);
    try {
      let result;
      if (isSuperAdmin) {
        result = await deleteSACategory(categoryToDelete.id).unwrap();
      } else if (isExecutiveDirector) {
        result = await deleteEDCategory(categoryToDelete.id).unwrap();
      } else if (isSocialChairperson) {
        result = await deleteSCCategory(categoryToDelete.id).unwrap();
      }
      
      if (result?.success) {
        showToast({
          title: "Category Deleted",
          description: "Category has been deleted successfully",
          kind: "success"
        });
        // Close dialog and reset state
        setIsDeleteDialogOpen(false);
        setCategoryToDelete(null);
      }
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      const errorMessage = error?.data?.error || error?.message || "Failed to delete category. Please try again.";
      showToast({
        title: "Deletion Failed",
        description: errorMessage,
        kind: "error"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleAddSubmit = async (data: Record<string, string>) => {
    console.log('Create Category - Form Data:', data);
    
    // Validate required fields before making API call
    if (!data.name || data.name.trim() === '') {
      showToast({
        title: "Validation Error",
        description: "Category name is required",
        kind: "error"
      });
      return { errors: { name: "Category name is required", type: "" } };
    }
    
    if (!data.type || data.type.trim() === '') {
      showToast({
        title: "Validation Error", 
        description: "Category type is required",
        kind: "error"
      });
      return { errors: { type: "Category type is required", name: "" } };
    }
    
    // Validate that type is one of the allowed values
    const allowedTypes = ["business", "professional", "social"];
    if (!allowedTypes.includes(data.type)) {
      showToast({
        title: "Validation Error",
        description: "Please select a valid category type",
        kind: "error"
      });
      return { errors: { type: "Please select a valid category type", name: "" } };
    }
    
    try {
      // Calculate sortOrder based on current categories count + 1
      const currentCategoriesCount = allCategories.filter(cat => cat.type === data.type).length;
      
      // Auto-generate value from category name if not provided
      const autoValue = data.value || data.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')  // Remove special characters first
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-');           // Remove consecutive hyphens
      console.log('Auto-generated value:', autoValue);
      
      const newCategoryData: CreateCategoryInput = {
        name: data.name,
        value: autoValue,
        type: data.type as "business" | "professional" | "social",
        scope: (role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM") ? "global" as const : 
               (role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") ? "regional" as const : 
               (role === "SOCIAL_CHAIRPERSON") ? "regional" as const : "global",
        metadata: {
          description: data.description || undefined,
          sortOrder: currentCategoriesCount + 1
        }
      };
      
      console.log('Creating category with data:', newCategoryData);
      
      if (role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM") {
        await createSACategory(newCategoryData).unwrap();
      } else if (role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") {
        await createEDCategory(newCategoryData).unwrap();
      } else if (role === "SOCIAL_CHAIRPERSON") {
        await createSCCategory(newCategoryData).unwrap();
      }
      showToast({
        title: "Category Created",
        description: "New category has been created successfully",
        kind: "success"
      });
      setIsAddModalOpen(false);
    } catch (error: any) {
      console.error('Failed to create category:', error);
      const errorMessage = error?.data?.error || error?.message || "Failed to create category. Please try again.";
      showToast({
        title: "Creation Failed",
        description: errorMessage,
        kind: "error"
      });
      // Fallback to local state update for mock data
      const currentCategoriesCount = allCategories.filter(cat => cat.type === searchType).length;
      
      // Auto-generate value from category name if not provided
      const autoValue = data.value || data.name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')  // Remove special characters first
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-');           // Remove consecutive hyphens
      console.log('Fallback - Auto-generated value:', autoValue);
      
      const newCategory: Category = {
        id: Date.now().toString(),
        name: data.name,
        value: autoValue,
        type: data.type as "business" | "professional" | "social",
        scope: (role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM") ? "global" as const : 
               (role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") ? "regional" as const : 
               (role === "SOCIAL_CHAIRPERSON") ? "regional" as const : "global",
        isActive: true,
        metadata: {
          description: data.description || undefined,
          sortOrder: currentCategoriesCount + 1
        }
      };
      console.log('Fallback - Creating local category:', newCategory);
      setLocalCategories(prev => [...prev, newCategory]);
      setIsAddModalOpen(false);
    }
  };

  const handleEditSubmit = async (data: Record<string, string>) => {
    if (selectedCategory) {
      console.log('Edit Category - Form Data:', data);
      
      // Validate required fields before making API call
      if (!data.name || data.name.trim() === '') {
        showToast({
          title: "Validation Error",
          description: "Category name is required",
          kind: "error"
        });
        return { errors: { name: "Category name is required", type: "" } };
      }
      
      if (!data.type || data.type.trim() === '') {
        showToast({
          title: "Validation Error", 
          description: "Category type is required",
          kind: "error"
        });
        return { errors: { type: "Category type is required", name: "" } };
      }
      
      // Validate that type is one of the allowed values
      const allowedTypes = ["business", "professional", "social"];
      if (!allowedTypes.includes(data.type)) {
        showToast({
          title: "Validation Error",
          description: "Please select a valid category type",
          kind: "error"
        });
        return { errors: { type: "Please select a valid category type", name: "" } };
      }
      
      try {
        // Auto-generate value from category name if not provided
        const autoValue = selectedCategory.value || data.name.toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')  // Remove special characters first
          .replace(/\s+/g, '-')          // Replace spaces with hyphens
          .replace(/-+/g, '-');           // Remove consecutive hyphens
        console.log('Edit - Auto-generated value:', autoValue);
        
        const updateData: UpdateCategoryInput = {
          name: data.name,
          value: autoValue,
          type: data.type as "business" | "professional" | "social",
          isActive: true,
          metadata: {
            description: data.description || '',
            sortOrder: selectedCategory.metadata?.sortOrder || 1
          }
        };
        
        console.log('Updating category with data:', updateData);
        
        if (role === "SUPER_ADMIN" || role === "SUPER_ADMIN_TEAM") {
          await updateSACategory({
            id: selectedCategory.id,
            data: updateData
          }).unwrap();
        } else if (role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR") {
          await updateEDCategory({
            id: selectedCategory.id,
            data: updateData
          }).unwrap();
        } else if (role === "SOCIAL_CHAIRPERSON") {
          await updateSCCategory({
            id: selectedCategory.id,
            data: updateData
          }).unwrap();
        }
        showToast({
          title: "Category Updated",
          description: "Category has been updated successfully",
          kind: "success"
        });
        setIsEditModalOpen(false);
        setSelectedCategory(null);
      } catch (error: any) {
        console.error('Failed to update category:', error);
        const errorMessage = error?.data?.error || error?.message || "Failed to update category. Please try again.";
        showToast({
          title: "Update Failed",
          description: errorMessage,
          kind: "error"
        });
        // Fallback to local state update for mock data
        setLocalCategories(prev => prev.map(cat =>
          cat.id === selectedCategory.id
            ? { 
                ...cat, 
                name: data.name,
                type: data.type as "business" | "professional" | "social",
                metadata: {
                  description: data.description || '',
                  sortOrder: cat.metadata?.sortOrder || 1
                }
              }
            : cat
        ));
        setIsEditModalOpen(false);
        setSelectedCategory(null);
      }
    }
  };

  const renderCell = (column: TableColumn, row: Category) => {
    if (column.key === "description") {
      const description = row.metadata?.description?.trim();
      return description ? (
        <span className="text-[var(--ov-ink-2)]">{description}</span>
      ) : (
        <span className="text-[var(--ov-ink-5)]">—</span>
      );
    }
    if (column.key === "actions") {
      // Two labelled buttons per row put a wall of ember down the last column
      // and made Delete the loudest thing on the page. Icons with a hover wash,
      // the way the other tables carry theirs.
      return (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleEditCategory(row)}
            aria-label={`Edit ${row.name}`}
            title="Edit category"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-ember-wash)] hover:text-[var(--ov-ember)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteCategory(row)}
            aria-label={`Delete ${row.name}`}
            title="Delete category"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-danger-wash)] hover:text-[var(--ov-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      );
    }
    return null;
  };

  const isEdScope = role === "EXECUTIVE_DIRECTOR" || role === "ED_TEAM" || role === "REGIONAL_DIRECTOR";
  const isScScope = role === "SOCIAL_CHAIRPERSON";
  const scopeTab = isEdScope ? edTab : socialTab;
  const setScopeTab = isEdScope ? setEdTab : setSocialTab;
  // Adding is global for a super admin, and only within their own scope for the
  // roles that have one.
  const canAdd = (!isEdScope && !isScScope) || scopeTab === "regional";
  const total = categoriesData?.data?.total ?? allCategories.length;

  const segment = (active: boolean) =>
    `rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] ${
      active
        ? "bg-[var(--nav-active-wash)] text-[var(--nav-active-ink)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--nav-active-edge)]"
        : "text-[var(--ov-ink-4)] hover:text-[var(--ov-ink-2)]"
    }`;

  return (
    <div className={`${ADMIN_THEME} min-h-screen`} style={{ background: "var(--ov-floor)" }}>
      <Navbar />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="ekam-figure text-[26px] font-bold leading-none text-[var(--ov-ink)] sm:text-[32px]">
              {getPageTitle()}
            </h1>
            <p className="mt-2.5 text-[12px] text-[var(--ov-ink-4)]">
              {!isLoading && !error && (
                <>
                  <span className="ekam-figure font-medium text-[var(--ov-ink-2)]">{total}</span>{" "}
                  {total === 1 ? "category" : "categories"}
                  {searchQuery ? " matching" : ""}
                  {" · "}
                </>
              )}
              {getPageDescription()}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="relative w-full sm:w-64">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ov-ink-4)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={typedSearch}
                onChange={(e) => setTypedSearch(e.target.value)}
                placeholder="Search categories"
                aria-label="Search categories by name"
                className="h-11 w-full rounded-xl bg-[var(--ov-fill-subtle)] pl-9 pr-9 text-[13px] text-[var(--ov-ink)] ring-1 ring-[color:var(--ov-line)] transition-colors placeholder:text-[var(--ov-ink-5)] focus:bg-[var(--ov-fill-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ov-ember)] [&::-webkit-search-cancel-button]:hidden"
              />
              {typedSearch && (
                <button
                  type="button"
                  onClick={() => setTypedSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[var(--ov-ink-4)] transition-colors hover:bg-[var(--ov-fill-hover)] hover:text-[var(--ov-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)]"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {canAdd && (
              <button
                type="button"
                onClick={handleAddCategory}
                className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-[var(--ov-ember-fill)] px-4 text-[13px] font-semibold text-[var(--ov-on-ember)] transition-colors hover:bg-[var(--ov-ember-fill-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ov-ember)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ov-floor)]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add category
              </button>
            )}
          </div>
        </div>

        {/* Type, and — for the roles that have one — scope. Both are filters,
            so they sit together on one row above what they filter. */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {categoryTypes.length > 1 && (
            <div className="inline-flex rounded-xl bg-[var(--ov-trough)] p-1 ring-1 ring-[color:var(--ov-line-faint)]">
              {categoryTypes.map((t: { value: string; label: string }) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => chooseType(t.value as "business" | "professional" | "social")}
                  aria-pressed={searchType === t.value}
                  className={segment(searchType === t.value)}
                >
                  {t.label.replace(" Categories", "")}
                </button>
              ))}
            </div>
          )}

          {(isEdScope || isScScope) && (
            <div className="inline-flex rounded-xl bg-[var(--ov-trough)] p-1 ring-1 ring-[color:var(--ov-line-faint)]">
              {(["global", "regional"] as const).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setScopeTab(scope)}
                  aria-pressed={scopeTab === scope}
                  className={segment(scopeTab === scope)}
                >
                  {scope === "global" ? "Global" : "Regional"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Failed, waiting, empty and populated are four different things. The
            table used to render for all of them, so a dead request looked
            exactly like an empty category list. */}
        {error ? (
          <div className="rounded-2xl bg-[var(--ov-panel)] p-6 text-[13px] text-[var(--ov-danger)] ring-1 ring-[color:var(--ov-line)]">
            Couldn&apos;t load categories. Check your connection and try again.
          </div>
        ) : isLoading ? (
          <TableSkeleton columns={columns.length} rows={6} />
        ) : allCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--ov-line-strong)] bg-[var(--ov-fill-subtle)] px-6 py-16 text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-[var(--ov-ember-wash)] text-[var(--ov-ember)] ring-1 ring-[color:var(--ov-ember-wash)]"
            >
              <Tags className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="text-[17px] font-semibold text-[var(--ov-ink)]">
              {searchQuery ? "Nothing matches that search" : "No categories yet"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-[var(--ov-ink-4)]">
              {searchQuery
                ? "Try a different name, or another category type."
                : "Categories you add appear here, and become selectable when members fill in their profiles."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-[var(--ov-panel)] shadow-[var(--ov-shadow-panel)] ring-1 ring-[color:var(--ov-line)]">
            <DataTable
              columns={columns}
              data={allCategories}
              searchValues={searchValues}
              onSearchChange={handleSearchChange}
              renderCell={renderCell}
              total={total}
              page={currentPage}
              pageSize={pageSize}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </main>

      <div>
        {/* Add Category Modal */}
        <CreateModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add New Category"
          fields={[
            {
              name: "name",
              label: "Category Name",
              type: "text",
              placeholder: "Enter category name",
              required: true,
            },
            {
              name: "type",
              label: "Category Type",
              type: "select",
              options: categoryTypes.map((type: { value: string; label: string }) => ({ value: type.value, label: type.label.replace(" Categories", "") })),
              required: true,
            },
            {
              name: "description",
              label: "Description",
              type: "text",
              placeholder: "Enter category description",
              required: false,
            },
          ]}
          onSubmit={handleAddSubmit}
          submitButtonText="Add Category"
        />

        {/* Edit Category Modal */}
        <CreateModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Category"
          fields={[
            {
              name: "name",
              label: "Category Name",
              type: "text",
              placeholder: "Enter category name",
              required: true,
            },
            {
              name: "type",
              label: "Category Type",
              type: "select",
              options: categoryTypes.map((type: { value: string; label: string }) => ({ value: type.value, label: type.label.replace(" Categories", "") })),
              required: true,
            },
            {
              name: "description",
              label: "Description",
              type: "text",
              placeholder: "Enter category description",
              required: false,
            },
          ]}
          onSubmit={handleEditSubmit}
          submitButtonText="Update Category"
          initialValues={selectedCategory ? { 
            name: selectedCategory.name,
            type: selectedCategory.type,
            description: selectedCategory.metadata?.description || ''
          } : undefined}
        />
      </div>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        isSubmitting={isDeleting}
        actionType="delete"
        confirmText="Yes, Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default CategoriesPage;
