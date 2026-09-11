import {useEffect, useState } from "react";
import FormSelect from "../forms/FormSelect";
import FormInput from "../forms/FormInput";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "select" | "number";
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  hideOptionsUntilSearch?: boolean;
  disableClientSideFilter?: boolean;
  includePlaceholderOption?: boolean;
  menuMaxHeightClass?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  value?: string;
  hideWhenRoleIn?: string[];
  multiSelect?: boolean;
  chipDisplay?: boolean;
  className?: string;
  chipClassName?: string;
  showWhenField?: string;
  showWhenValues?: string[];
  hideWhenField?: string;
  hideWhenValues?: string[];
}

interface FormState {
  errors: Record<string, string>;
}

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** One line under the title saying what this dialog does. */
  description?: string;
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => Promise<{ errors?: Record<string, string> } | void>;
  submitButtonText?: string;
  initialValues?: Record<string, string>;
}

export default function CreateModal({
  isOpen,
  onClose,
  title,
  description,
  fields,
  onSubmit,
  submitButtonText = "Create",
  initialValues,
}: CreateModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>({ role: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>({ errors: {} });
  // Default max height for dropdown menus to show 3 items at a time
  const defaultMenuMaxHeight = 'max-h-36';
  // Track multi-select values separately to manage chips
  const [multiValues, setMultiValues] = useState<Record<string, string[]>>({});
  
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setFormData(initialValues || {});
    // Initialize multiValues from initialValues (comma-separated)
    const initMulti: Record<string, string[]> = {};
    (fields || []).forEach((f) => {
      if (f.type === 'select' && f.multiSelect) {
        const raw = (initialValues || {})[f.name];
        initMulti[f.name] = typeof raw === 'string' && raw.trim()
          ? Array.from(new Set(raw.split(',').map((s) => s.trim()).filter(Boolean)))
          : [];
      }
    });
    setMultiValues(initMulti);
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen, initialValues, fields]);

  const handleChange = (name: string, value: string, customOnChange?: (value: string) => void) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Call custom onChange if provided
    if (customOnChange) {
      customOnChange(value);
    }
  };

  const handleMultiAdd = (name: string, value: string) => {
    setMultiValues((prev) => {
      const cur = prev[name] || [];
      if (!value || cur.includes(value)) return prev;
      const next = [...cur, value];
      setFormData((p) => ({ ...p, [name]: next.join(',') }));
      return { ...prev, [name]: next };
    });
  };

  const handleMultiRemove = (name: string, value: string) => {
    setMultiValues((prev) => {
      const cur = prev[name] || [];
      const next = cur.filter((v) => v !== value);
      setFormData((p) => ({ ...p, [name]: next.join(',') }));
      return { ...prev, [name]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormState({ errors: {} });

    try {
      const result = await onSubmit(formData);
      
      if (result?.errors) {
        // If there are errors, update the form state and keep the modal open
        setFormState({ errors: result.errors });
      } else {
        // If no errors, close the modal and reset the form
        setFormData({});
        setMultiValues({});
        onClose();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormState({ 
        errors: { form: 'An unexpected error occurred. Please try again.' } 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({});
    setMultiValues({});
    setFormState({ errors: {} });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-[9998]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* The two-layer shell GradientContainer used to draw, but reading its
            colours from tokens so the dialog follows whichever theme the page
            behind it is wearing. */}
        <div
          className="p-[2px] rounded-[16px] relative max-w-lg w-full mx-auto max-h-[92vh] overflow-visible flex flex-col"
          style={{ background: "var(--surface-ring)" }}
        >
          <div
            className="w-full rounded-[14px] flex flex-col max-h-[92vh] overflow-visible shadow-[var(--ov-shadow-pop)]"
            style={{ background: "var(--surface-bg)" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[color:var(--field-border)] px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold leading-tight text-[var(--field-ink)]">
                  {title}
                </h2>
                {description && (
                  <p className="mt-1 text-[12.5px] leading-5 text-[var(--field-label)]">
                    {description}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--field-label)] transition-colors hover:bg-[var(--field-bg-hover)] hover:text-[var(--field-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--field-border-focus)]"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto overflow-x-visible px-5 py-5">
              <form id="create-modal-form" onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {fields.map((field) => {
                    const currentRole = (formData["role"] || "").toString();
                    const shouldHide = Array.isArray(field.hideWhenRoleIn) && field.hideWhenRoleIn.includes(currentRole);
                    const showFieldValue = field.showWhenField ? String(formData[field.showWhenField] || "") : "";
                    const hideFieldValue = field.hideWhenField ? String(formData[field.hideWhenField] || "") : "";
                    const hiddenByShowCondition =
                      Array.isArray(field.showWhenValues) &&
                      field.showWhenValues.length > 0 &&
                      (!field.showWhenField || !field.showWhenValues.includes(showFieldValue));
                    const hiddenByHideCondition =
                      Array.isArray(field.hideWhenValues) &&
                      field.hideWhenValues.length > 0 &&
                      !!field.hideWhenField &&
                      field.hideWhenValues.includes(hideFieldValue);
                    if (shouldHide || hiddenByShowCondition || hiddenByHideCondition) return null;
                    
                    // Use field.value if provided (for controlled components), otherwise use formData
                    const fieldValue = field.value !== undefined ? field.value : formData[field.name] || "";
                    
                    return (
                    <div key={field.name}>
                      {field.type === "select" ? (
                        (() => {
                          const selectedVals = (multiValues[field.name] || []).map(String);
                          const baseOpts = field.options || [];
                          const withPlaceholder = field.includePlaceholderOption === false
                            ? baseOpts
                            : [{ value: "", label: field.placeholder || `Select ${field.label.toLowerCase()}` }, ...baseOpts];
                          const filteredOpts = withPlaceholder.filter((opt) => !selectedVals.includes(String(opt.value)) || String(opt.value) === "");
                          
                          return (
                            <FormSelect
                              label={field.label}
                              className="text-[13px]"
                              value={field.multiSelect ? "" : fieldValue}
                              onChange={(e) => {
                                const newValue = e.target.value;
                              
                                if (field.multiSelect) {
                                  handleMultiAdd(field.name, newValue);
                                } else {
                                  handleChange(field.name, newValue, field.onChange);
                                }
                              
                                if (formState.errors[field.name]) {
                                  setFormState(prev => ({
                                    errors: { ...prev.errors, [field.name]: '' }
                                  }));
                                }
                              }}
                              
                              options={filteredOpts}
                              isRequired={field.required}
                              searchable={field.searchable}
                              searchPlaceholder={field.searchPlaceholder}
                              onSearchChange={field.onSearchChange}
                              showMenuHeader={!field.searchable}
                              hideOptionsUntilSearch={field.hideOptionsUntilSearch}
                              disableClientSideFilter={field.disableClientSideFilter}
                              menuMaxHeightClass={field.menuMaxHeightClass || defaultMenuMaxHeight}
                              disabled={field.disabled}
                              openDirection="down"
                              topAdornment={field.multiSelect && field.chipDisplay ? (
                                <div className="mb-2 flex flex-wrap gap-2">
                                  {(multiValues[field.name] || []).map((val) => {
                                    const label = field.options?.find((o) => o.value === val)?.label || val;
                                    return (
                                      <span key={val} className={`inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--field-border)] bg-[var(--field-bg-hover)] py-1 pl-2.5 pr-1.5 text-[12px] text-[var(--field-ink)] ${field.chipClassName || ''}`}>
                                        {label}
                                        <button type="button" className="grid h-4 w-4 place-items-center rounded text-[var(--field-label)] transition-colors hover:text-[var(--field-ink)]" onClick={() => handleMultiRemove(field.name, val)} aria-label={`Remove ${label}`}>
                                          ×
                                        </button>
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : undefined}
                              error={formState.errors[field.name]}
                            />
                          );
                        })()
                      ) : (
                        <div className="w-full">
                          <FormInput
                            label={field.label}
                            className="text-[13px]"
                            value={fieldValue}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              handleChange(field.name, newValue, field.onChange);
                              
                              // Clear error when user types
                              if (formState.errors[field.name]) {
                                setFormState(prev => ({
                                  errors: { ...prev.errors, [field.name]: '' }
                                }));
                              }
                            }}
                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                            isRequired={field.required}
                            type={field.type}
                            disabled={field.disabled}
                            error={formState.errors[field.name]}
                          />
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>

              </form>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[color:var(--field-border)] px-5 py-4">
              <button
                type="button"
                onClick={handleClose}
                className="h-10 rounded-[var(--field-radius)] px-4 text-[13px] font-medium text-[var(--field-ink)] transition-colors hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--field-border-focus)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-modal-form"
                disabled={isSubmitting}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--field-radius)] bg-[var(--field-accent)] px-5 text-[13px] font-semibold text-[var(--field-accent-ink)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--field-border-focus)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Saving…" : submitButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
