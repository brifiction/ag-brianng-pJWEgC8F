import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
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
import { LogbookField } from './LogbookField.tsx';
import { validateLogbook } from './logbook-file.ts';
import { QuickSelect } from './QuickSelect.tsx';
import { SubmissionResult } from './SubmissionResult.tsx';
import { type SelectOption, VehicleSelect } from './VehicleSelect.tsx';

/** Form state: the vehicle plus the attached logbook file. */
interface FormValues extends Vehicle {
  logbook: File | null;
}

/** Starting values: nothing selected, no file. */
const EMPTY: FormValues = { make: '', model: '', badge: '', logbook: null };

/**
 * Turns plain values into dropdown options, with an optional display label.
 * @param values - The values to offer.
 * @param label - Turns a value into its display label; defaults to the value itself.
 * @returns The dropdown options.
 */
const toOptions = (values: string[], label = (value: string) => value): SelectOption[] =>
  values.map((value) => ({ value, label: label(value) }));

/**
 * Make → Model → Badge selection with logbook upload.
 * Changing any part of the vehicle clears the parts after it and the attached logbook.
 * @param props - The vehicle catalogue to choose from.
 * @returns The quick-select buttons, the form and the result.
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

  /** Removes the attached file and its error, and empties the file input. */
  const clearLogbook = () => {
    setValue('logbook', null);
    clearErrors('logbook');
    if (fileInput.current) fileInput.current.value = '';
  };

  /**
   * Sets the make and clears model, badge and logbook.
   * @param next - Make chosen in the dropdown.
   */
  const selectMake = (next: string) => {
    if (next === getValues('make')) return;
    setValue('make', next, { shouldValidate: true });
    setValue('model', '');
    setValue('badge', '');
    clearLogbook();
  };

  /**
   * Sets the model and clears badge and logbook.
   * @param next - Model chosen in the dropdown.
   */
  const selectModel = (next: string) => {
    if (next === getValues('model')) return;
    setValue('model', next, { shouldValidate: true });
    setValue('badge', '');
    clearLogbook();
  };

  /**
   * Sets the badge and clears the logbook.
   * @param next - Badge chosen in the dropdown.
   */
  const selectBadge = (next: string) => {
    if (next === getValues('badge')) return;
    setValue('badge', next, { shouldValidate: true });
    clearLogbook();
  };

  /**
   * Fills all three fields from a quick-select and clears the logbook.
   * @param vehicle - The quick-select vehicle.
   */
  const applyPreset = (vehicle: Vehicle) => {
    if (isSameVehicle(vehicle, getValues())) return;
    for (const key of ['make', 'model', 'badge'] as const) {
      setValue(key, vehicle[key], { shouldValidate: true });
    }
    clearLogbook();
  };

  /**
   * Uploads the logbook and shows the result, or the error message.
   * @param values - The validated form values.
   */
  const onSubmit = async ({ logbook: file, ...vehicle }: FormValues) => {
    if (!file) return;
    setSubmitError(null);
    try {
      setResult(await submitLogbook({ ...vehicle, logbook: file }));
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    }
  };

  /** Clears every field, the file, the result and any error. */
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
              <LogbookField
                disabled={!badge}
                error={fieldState.error?.message}
                inputRef={(element) => {
                  field.ref(element);
                  fileInput.current = element;
                }}
                onBlur={field.onBlur}
                onChange={(file) => setValue('logbook', file, { shouldValidate: true })}
              />
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
