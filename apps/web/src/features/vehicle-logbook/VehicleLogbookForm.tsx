import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { type LogbookSubmission, submitLogbook, toErrorMessage } from './api.ts';
import {
  getBadges,
  getMakes,
  getModels,
  isSameVehicle,
  makeLabel,
  type Vehicle,
  type VehicleCatalogue,
} from './catalogue.ts';
import { LOGBOOK_ACCEPT, validateLogbook } from './logbook-file.ts';
import { QuickSelect } from './QuickSelect.tsx';
import { SubmissionResult } from './SubmissionResult.tsx';
import { type SelectOption, VehicleSelect } from './VehicleSelect.tsx';

interface FormValues extends Vehicle {
  logbook: File | null;
}

const EMPTY: FormValues = { make: '', model: '', badge: '', logbook: null };

const toOptions = (values: string[], label = (value: string) => value): SelectOption[] =>
  values.map((value) => ({ value, label: label(value) }));

/**
 * Make → Model → Badge selection with logbook upload.
 * Changing any part of the vehicle clears the parts after it and the attached logbook.
 */
export function VehicleLogbookForm({ catalogue }: Readonly<{ catalogue: VehicleCatalogue }>) {
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    clearErrors,
    reset,
    formState: { errors, isSubmitting, isValidating },
  } = useForm<FormValues>({ defaultValues: EMPTY });
  const [make, model, badge, logbook] = useWatch({
    control,
    name: ['make', 'model', 'badge', 'logbook'],
  });
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [result, setResult] = useState<LogbookSubmission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const clearLogbook = () => {
    setValue('logbook', null);
    clearErrors('logbook');
    if (fileInput.current) fileInput.current.value = '';
  };

  const selectMake = (next: string) => {
    if (next === getValues('make')) return;
    setValue('make', next, { shouldValidate: true });
    setValue('model', '');
    setValue('badge', '');
    clearLogbook();
  };

  const selectModel = (next: string) => {
    if (next === getValues('model')) return;
    setValue('model', next, { shouldValidate: true });
    setValue('badge', '');
    clearLogbook();
  };

  const selectBadge = (next: string) => {
    if (next === getValues('badge')) return;
    setValue('badge', next, { shouldValidate: true });
    clearLogbook();
  };

  const applyPreset = (vehicle: Vehicle) => {
    if (isSameVehicle(vehicle, getValues())) return;
    for (const key of ['make', 'model', 'badge'] as const) {
      setValue(key, vehicle[key], { shouldValidate: true });
    }
    clearLogbook();
  };

  const onSubmit = async ({ logbook: file, ...vehicle }: FormValues) => {
    if (!file) return;
    setSubmitError(null);
    try {
      setResult(await submitLogbook({ ...vehicle, logbook: file }));
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    }
  };

  const startAgain = () => {
    reset(EMPTY);
    clearLogbook();
    setResult(null);
    setSubmitError(null);
  };

  const isComplete = Boolean(make && model && badge && logbook);
  const canSubmit = isComplete && !errors.logbook && !isValidating && !isSubmitting;

  return (
    <div className="flex flex-col gap-6">
      <QuickSelect catalogue={catalogue} current={{ make, model, badge }} onSelect={applyPreset} />

      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <Controller
            name="make"
            control={control}
            rules={{ required: 'Select a make' }}
            render={({ field, fieldState }) => (
              <VehicleSelect
                id="make"
                label="Make"
                placeholder="Select a make"
                options={toOptions(getMakes(catalogue), makeLabel)}
                value={field.value}
                onChange={selectMake}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="model"
            control={control}
            rules={{ required: 'Select a model' }}
            render={({ field, fieldState }) => (
              <VehicleSelect
                id="model"
                label="Model"
                placeholder="Select a model"
                options={toOptions(getModels(catalogue, make))}
                value={field.value}
                onChange={selectModel}
                disabled={!make}
                disabledHint="Select a make first"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="badge"
            control={control}
            rules={{ required: 'Select a badge' }}
            render={({ field, fieldState }) => (
              <VehicleSelect
                id="badge"
                label="Badge"
                placeholder="Select a badge"
                options={toOptions(getBadges(catalogue, make, model))}
                value={field.value}
                onChange={selectBadge}
                disabled={!model}
                disabledHint="Select a model first"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            name="logbook"
            control={control}
            rules={{ validate: validateLogbook }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="logbook">Service logbook</FieldLabel>
                <Input
                  id="logbook"
                  type="file"
                  accept={LOGBOOK_ACCEPT}
                  disabled={!badge}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    fieldState.error ? 'logbook-hint logbook-error' : 'logbook-hint'
                  }
                  ref={(element) => {
                    field.ref(element);
                    fileInput.current = element;
                  }}
                  onBlur={field.onBlur}
                  onChange={(event) =>
                    setValue('logbook', event.target.files?.[0] ?? null, { shouldValidate: true })
                  }
                />
                <FieldDescription id="logbook-hint">
                  {badge
                    ? 'Plain text (.txt) or JSON (.json), up to 1 MB.'
                    : 'Select a badge first'}
                </FieldDescription>
                <FieldError id="logbook-error">{fieldState.error?.message}</FieldError>
              </Field>
            )}
          />

          {submitError && (
            <Alert variant="destructive">
              <AlertTitle>Submission failed</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting && <Spinner aria-hidden />}
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </Button>
            <Button type="button" variant="outline" onClick={startAgain}>
              Reset
            </Button>
          </div>
        </FieldGroup>
      </form>

      <div aria-live="polite">{result && <SubmissionResult result={result} />}</div>
    </div>
  );
}
