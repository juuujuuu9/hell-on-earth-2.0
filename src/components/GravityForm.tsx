import { useState, type FormEvent } from 'react';

export interface GravityFormField {
  id: number;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'number' | 'tel' | 'url';
  required?: boolean;
  placeholder?: string;
}

export interface GravityFormProps {
  formId: number;
  fields: GravityFormField[];
  onSubmitSuccess?: (response: { entry_id?: number; confirmation_message?: string }) => void;
  onSubmitError?: (error: string) => void;
  submitButtonText?: string;
  className?: string;
}

export default function GravityForm({
  formId,
  fields,
  onSubmitSuccess,
  onSubmitError,
  submitButtonText = 'Submit',
  className = '',
}: GravityFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [confirmationMessage, setConfirmationMessage] = useState<string>('');

  const handleChange = (fieldId: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [`input_${fieldId}`]: value,
    }));
    // Clear error when user starts typing
    if (errors[`input_${fieldId}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`input_${fieldId}`];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const value = formData[`input_${field.id}`] || '';
      
      if (field.required && !value.trim()) {
        newErrors[`input_${field.id}`] = `${field.label} is required`;
      }

      if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newErrors[`input_${field.id}`] = 'Please enter a valid email address';
      }

      if (field.type === 'url' && value && !/^https?:\/\/.+/.test(value)) {
        newErrors[`input_${field.id}`] = 'Please enter a valid URL';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitStatus('idle');
    setConfirmationMessage('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/gravityform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          fieldValues: formData,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.is_valid) {
        // Handle validation errors from Gravity Forms
        if (result.validation_messages) {
          const validationErrors: Record<string, string> = {};
          Object.keys(result.validation_messages).forEach((key) => {
            validationErrors[key] = result.validation_messages[key];
          });
          setErrors(validationErrors);
        }

        const errorMessage =
          result.validation_messages
            ? 'Please correct the errors below'
            : result.error || 'Failed to submit form';
        
        setSubmitStatus('error');
        onSubmitError?.(errorMessage);
        return;
      }

      // Success
      setSubmitStatus('success');
      setConfirmationMessage(
        result.confirmation_message || 'Form submitted successfully!'
      );
      onSubmitSuccess?.(result);

      // Reset form after successful submission
      setFormData({});
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setSubmitStatus('error');
      onSubmitError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: GravityFormField) => {
    const fieldName = `input_${field.id}`;
    const value = formData[fieldName] || '';
    const error = errors[fieldName];
    const hasError = !!error;

    const baseClasses =
      'w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
    const errorClasses = hasError
      ? 'border-red-500 focus:ring-red-500'
      : 'border-gray-300';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            key={field.id}
            id={fieldName}
            name={fieldName}
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            rows={4}
            className={`${baseClasses} ${errorClasses}`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldName}-error` : undefined}
          />
        );

      default:
        return (
          <input
            key={field.id}
            type={field.type}
            id={fieldName}
            name={fieldName}
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            className={`${baseClasses} ${errorClasses}`}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${fieldName}-error` : undefined}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {fields.map((field) => (
        <div key={field.id} className="mb-4">
          <label
            htmlFor={`input_${field.id}`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(field)}
          {errors[`input_${field.id}`] && (
            <p
              id={`input_${field.id}-error`}
              className="mt-1 text-sm text-red-600"
              role="alert"
            >
              {errors[`input_${field.id}`]}
            </p>
          )}
        </div>
      ))}

      {submitStatus === 'success' && confirmationMessage && (
        <div
          className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800"
          role="alert"
        >
          {confirmationMessage}
        </div>
      )}

      {submitStatus === 'error' && !Object.keys(errors).length && (
        <div
          className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800"
          role="alert"
        >
          Failed to submit form. Please try again.
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Submitting...' : submitButtonText}
      </button>
    </form>
  );
}
