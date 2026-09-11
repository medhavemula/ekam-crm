import React, { useState, useEffect } from 'react';
import FormInput from './FormInput';
import { validateUrlForForm } from '../../utils/urlValidation';

interface URLValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

interface URLInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  isRequired?: boolean;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
}

export default function URLInput({
  label,
  value,
  onChange,
  onBlur,
  placeholder = 'Enter URL (e.g., https://example.com)',
  isRequired = false,
  disabled = false,
  className = '',
  showValidation = true
}: URLInputProps) {
  const [validation, setValidation] = useState<URLValidationResult>({
    isValid: true,
    error: undefined,
    suggestion: undefined
  });
  const [isTouched, setIsTouched] = useState(false);

  // Validate URL whenever value changes
  useEffect(() => {
    if (!value.trim()) {
      setValidation({
        isValid: !isRequired,
        error: isRequired ? 'URL is required' : undefined,
        suggestion: undefined
      });
      return;
    }

    const result = validateUrlForForm(value);
    setValidation(result);
  }, [value, isRequired]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsTouched(true);
    
    // Auto-apply suggestion if available and user hasn't typed a full URL
    if (validation.suggestion && !value.includes('://')) {
      onChange(validation.suggestion);
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };

  const showValidationError = showValidation && isTouched && !validation.isValid;

  return (
    <div className={`relative ${className}`}>
      <FormInput
        label={label}
        type="url"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        isRequired={isRequired}
        disabled={disabled}
        className={showValidationError ? 'border-red-500 focus:border-red-500' : ''}
      />
      
      {/* Validation feedback */}
      {showValidationError && (
        <div className="mt-1">
          <div className="flex items-center text-red-400 text-sm">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{validation.error}</span>
          </div>
          
          {validation.suggestion && (
            <div className="mt-1 flex items-center text-blue-400 text-sm">
              <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Suggestion: {validation.suggestion}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Success indicator */}
      {showValidation && isTouched && validation.isValid && value.trim() && (
        <div className="absolute right-3 top-8 text-green-400">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}
