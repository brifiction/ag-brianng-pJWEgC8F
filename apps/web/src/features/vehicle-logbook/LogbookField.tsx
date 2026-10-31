import type { Ref } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { LOGBOOK_ACCEPT } from './logbook-file.ts';

/** Props for the logbook file input. */
interface LogbookFieldProps {
  /** Disabled until a badge is chosen. */
  disabled: boolean;
  error?: string;
  inputRef: Ref<HTMLInputElement>;
  onBlur: () => void;
  onChange: (file: File | null) => void;
}

/**
 * Labelled file input for the logbook, with hint and error text linked via `aria-describedby`.
 * @param props - Disabled state, error, input ref and change handlers.
 * @returns The logbook field.
 */
export function LogbookField({
  disabled,
  error,
  inputRef,
  onBlur,
  onChange,
}: Readonly<LogbookFieldProps>) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="logbook">Service logbook</FieldLabel>
      <Input
        id="logbook"
        type="file"
        accept={LOGBOOK_ACCEPT}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'logbook-hint logbook-error' : 'logbook-hint'}
        ref={inputRef}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      <FieldDescription id="logbook-hint">
        {disabled ? 'Select a badge first' : 'Plain text (.txt) or JSON (.json), up to 1 MB.'}
      </FieldDescription>
      <FieldError id="logbook-error">{error}</FieldError>
    </Field>
  );
}
