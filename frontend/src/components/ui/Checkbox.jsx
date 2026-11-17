import React, { useId } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

/**
 * Common Checkbox component conforming to Flat UI rules and dynamic theme config.
 * Uses --color-primary and --color-primary-contrast for dynamic brand color synchronization.
 */
export default function Checkbox({
  id,
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  checkboxClassName = '',
  name,
  value,
  'aria-describedby': ariaDescribedBy,
  ...props
}) {
  const generatedId = useId();
  const checkboxId = id || generatedId;
  const descriptionId = description ? `${checkboxId}-desc` : undefined;
  const combinedDescribedBy = [descriptionId, ariaDescribedBy].filter(Boolean).join(' ') || undefined;

  return (
    <label
      htmlFor={checkboxId}
      className={`inline-flex items-start gap-2.5 cursor-pointer select-none group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`.trim()}
    >
      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          id={checkboxId}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          aria-describedby={combinedDescribedBy}
          className="sr-only peer"
          {...props}
        />
        <div
          style={
            checked
              ? {
                  backgroundColor: 'var(--color-primary, #0369a1)',
                  borderColor: 'var(--color-primary, #0369a1)',
                  color: 'var(--color-primary-contrast, #ffffff)',
                }
              : undefined
          }
          className={`w-4 h-4 rounded-control border flex items-center justify-center transition-colors duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-sky-700 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          } ${
            checked
              ? 'bg-primary border-primary text-primary-contrast'
              : 'bg-white border-slate-300 group-hover:border-slate-400'
          } ${checkboxClassName}`.trim()}
          aria-hidden="true"
        >
          {checked && (
            <CheckIcon className="w-3 h-3 stroke-[3]" aria-hidden="true" />
          )}
        </div>
      </div>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span
              className={`text-xs sm:text-sm font-medium ${
                disabled ? 'text-slate-400' : 'text-slate-800'
              }`}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              id={descriptionId}
              className={`text-xs ${
                disabled ? 'text-slate-400' : 'text-slate-500'
              } mt-0.5`}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
}
