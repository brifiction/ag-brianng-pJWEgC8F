import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SelectOption {
  value: string;
  label: string;
}

interface VehicleSelectProps {
  id: string;
  label: string;
  placeholder: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Explains why the field is disabled; shown only while disabled. */
  disabledHint?: string;
  disabled?: boolean;
  error?: string;
}

/** Labelled dropdown with hint and error text linked via `aria-describedby`. */
export function VehicleSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  disabledHint,
  disabled = false,
  error,
}: Readonly<VehicleSelectProps>) {
  const hint = disabled ? disabledHint : undefined;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  );
}
