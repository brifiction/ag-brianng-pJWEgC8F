import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '@/test/axe.ts';
import { catalogue } from '@/test/catalogue.ts';
import { submitLogbook } from './api.ts';
import { VehicleLogbookForm } from './VehicleLogbookForm.tsx';

vi.mock('./api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api.ts')>()),
  submitLogbook: vi.fn(),
}));

const logbookFile = (content = '2024-03-12 Service #1') =>
  new File([content], 'logbook.txt', { type: 'text/plain' });

const jsonLogbookFile = (content: string) =>
  new File([content], 'logbook.json', { type: 'application/json' });

const JSON_LOGBOOK = {
  entries: [
    {
      date: '2024-03-12',
      odometerKm: 15020,
      description: 'Service #1 <b>oil</b>',
      workshop: 'Brisbane Ford',
    },
    { date: '2025-03-08', odometerKm: 30410, description: 'Service #2' },
  ],
};

function setup() {
  /** `applyAccept: false` lets tests upload files the input's `accept` would filter out. */
  const user = userEvent.setup({ applyAccept: false });
  const view = render(
    <main>
      <VehicleLogbookForm catalogue={catalogue} />
    </main>,
  );
  return { user, ...view };
}

const field = (name: string) => screen.getByRole('combobox', { name });
const fileInput = () => screen.getByLabelText<HTMLInputElement>('Service logbook');
const submitButton = () => screen.getByRole('button', { name: 'Submit' });

async function choose(user: UserEvent, name: string, option: string) {
  await user.click(field(name));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function optionsOf(user: UserEvent, name: string) {
  await user.click(field(name));
  const options = screen.getAllByRole('option').map((option) => option.textContent);
  await user.keyboard('{Escape}');
  return options;
}

async function selectVehicle(user: UserEvent, make: string, model: string, badge: string) {
  await choose(user, 'Make', make);
  await choose(user, 'Model', model);
  await choose(user, 'Badge', badge);
}

describe('VehicleLogbookForm', () => {
  it('AC-01.1 lists every make with display labels and nothing selected', async () => {
    const { user } = setup();
    expect(field('Make')).toHaveTextContent('Select a make');
    expect(await optionsOf(user, 'Make')).toEqual(['Ford', 'BMW', 'Tesla']);
  });

  it('AC-01.2 disables model, badge and upload until their parent is chosen', () => {
    setup();
    expect(field('Model')).toBeDisabled();
    expect(field('Model')).toHaveAccessibleDescription('Select a make first');
    expect(field('Badge')).toBeDisabled();
    expect(field('Badge')).toHaveAccessibleDescription('Select a model first');
    expect(fileInput()).toBeDisabled();
    expect(fileInput()).toHaveAccessibleDescription('Select a badge first');
    expect(submitButton()).toBeDisabled();
  });

  it("AC-02.1 lists only the selected make's models", async () => {
    const { user } = setup();
    await choose(user, 'Make', 'Ford');
    expect(field('Model')).toBeEnabled();
    expect(await optionsOf(user, 'Model')).toEqual(['Ranger', 'Falcon', 'Falcon Ute']);
  });

  it("AC-03.1 / AC-03.2 lists only the selected model's badges", async () => {
    const { user } = setup();
    await choose(user, 'Make', 'Ford');
    await choose(user, 'Model', 'Ranger');
    expect(await optionsOf(user, 'Badge')).toEqual(['Raptor', 'Raptor X', 'Wildtrak']);

    await choose(user, 'Model', 'Falcon Ute');
    expect(await optionsOf(user, 'Badge')).toEqual(['XR6', 'XR6 Turbo']);
  });

  it('AC-03.3 enables upload once a badge is selected', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    expect(fileInput()).toBeEnabled();
    expect(fileInput()).toHaveAccessibleDescription(
      'Plain text (.txt) or JSON (.json), up to 1 MB.',
    );
  });

  it('AC-04.1 changing make clears model and badge and loads the new models', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await choose(user, 'Make', 'Tesla');

    expect(field('Model')).toHaveTextContent('Select a model');
    expect(field('Badge')).toHaveTextContent('Select a badge');
    expect(field('Badge')).toBeDisabled();
    expect(await optionsOf(user, 'Model')).toEqual(['Model 3']);
  });

  it('AC-04.2 changing model keeps make and clears badge', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await choose(user, 'Model', 'Falcon');

    expect(field('Make')).toHaveTextContent('Ford');
    expect(field('Badge')).toHaveTextContent('Select a badge');
    expect(await optionsOf(user, 'Badge')).toEqual(['XR6', 'XR6 Turbo', 'XR8']);
  });

  it('AC-04.3 changing the vehicle clears the attached logbook', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), logbookFile());
    expect(submitButton()).toBeEnabled();

    await choose(user, 'Model', 'Falcon');
    expect(fileInput().files).toHaveLength(0);
    expect(fileInput()).toBeDisabled();
    expect(submitButton()).toBeDisabled();
  });

  it('AC-04.3 changing only the badge clears the logbook but keeps upload enabled', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), logbookFile());

    await choose(user, 'Badge', 'Wildtrak');
    expect(fileInput().files).toHaveLength(0);
    expect(fileInput()).toBeEnabled();
    expect(submitButton()).toBeDisabled();
  });

  it('AC-04.4 re-selecting the same make keeps everything', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await choose(user, 'Make', 'Ford');
    expect(field('Model')).toHaveTextContent('Ranger');
    expect(field('Badge')).toHaveTextContent('Raptor');
  });

  it('AC-05.1 / AC-05.2 quick select fills all three fields', async () => {
    const { user } = setup();
    const quickSelect = screen.getByRole('region', { name: 'Quick select' });
    expect(within(quickSelect).getAllByRole('button').length).toBeGreaterThanOrEqual(2);

    await user.click(screen.getByRole('button', { name: 'Ford Ranger Raptor' }));
    expect(field('Make')).toHaveTextContent('Ford');
    expect(field('Model')).toHaveTextContent('Ranger');
    expect(field('Badge')).toHaveTextContent('Raptor');
    expect(fileInput()).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Ford Ranger Raptor' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('AC-05.3 quick select replaces the selection and clears the logbook', async () => {
    const { user } = setup();
    await selectVehicle(user, 'BMW', '240i', 'xDrive 50d');
    await user.upload(fileInput(), logbookFile());

    await user.click(screen.getByRole('button', { name: 'Tesla Model 3 Performance' }));
    expect(field('Make')).toHaveTextContent('Tesla');
    expect(field('Model')).toHaveTextContent('Model 3');
    expect(field('Badge')).toHaveTextContent('Performance');
    expect(fileInput().files).toHaveLength(0);
  });

  it('AC-06.1 a valid logbook enables submit', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), logbookFile());
    expect(submitButton()).toBeEnabled();
  });

  it('AC-06.2 rejects a non-text file with an inline error', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), new File(['%PDF'], 'logbook.pdf', { type: 'application/pdf' }));

    expect(
      await screen.findByText('Logbook must be a plain text (.txt) or JSON (.json) file'),
    ).toBeVisible();
    expect(fileInput()).toHaveAttribute('aria-invalid', 'true');
    expect(fileInput()).toHaveAccessibleDescription(/must be a plain text/);
    expect(submitButton()).toBeDisabled();
  });

  it('AC-06.1 a valid JSON logbook enables submit', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), jsonLogbookFile(JSON.stringify(JSON_LOGBOOK)));
    expect(submitButton()).toBeEnabled();
  });

  it('AC-06.5 rejects a .json file that is not valid JSON', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), jsonLogbookFile('{ "entries": '));

    expect(await screen.findByText('Logbook is not valid JSON')).toBeVisible();
    expect(submitButton()).toBeDisabled();
  });

  it('AC-06.6 names the first problem in JSON that breaks the format', async () => {
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    const [first] = JSON_LOGBOOK.entries;
    await user.upload(
      fileInput(),
      jsonLogbookFile(JSON.stringify({ entries: [{ ...first, date: undefined }] })),
    );

    expect(
      await screen.findByText('Entry 1: date must be a date in YYYY-MM-DD format'),
    ).toBeVisible();
    expect(fileInput()).toHaveAttribute('aria-invalid', 'true');
    expect(submitButton()).toBeDisabled();
  });

  it('AC-07.1 / AC-07.2 submits and shows the response with the logbook as literal text', async () => {
    const logbook = 'Line 1\n  <b>not bold</b>\n<script>alert(1)</script>';
    vi.mocked(submitLogbook).mockResolvedValue({
      make: 'ford',
      model: 'Ranger',
      badge: 'Raptor',
      logbook: { format: 'text', content: logbook },
    });
    const { user, container } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    const file = logbookFile(logbook);
    await user.upload(fileInput(), file);
    await user.click(submitButton());

    expect(submitLogbook).toHaveBeenCalledWith({
      make: 'ford',
      model: 'Ranger',
      badge: 'Raptor',
      logbook: file,
    });
    expect(await screen.findByText('Logbook received')).toBeVisible();
    expect(
      screen.getByText('Ford Ranger Raptor', { selector: '[data-slot=card-description]' }),
    ).toBeVisible();
    const contents = container.querySelector('pre');
    expect(contents?.textContent).toBe(logbook);
    expect(container.querySelector('b, script')).toBeNull();
  });

  it('AC-07.4 shows a JSON logbook as a table of entries in file order', async () => {
    vi.mocked(submitLogbook).mockResolvedValue({
      make: 'ford',
      model: 'Ranger',
      badge: 'Raptor',
      logbook: {
        format: 'json',
        content: JSON.stringify(JSON_LOGBOOK),
        entries: JSON_LOGBOOK.entries,
      },
    });
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), jsonLogbookFile(JSON.stringify(JSON_LOGBOOK)));
    await user.click(submitButton());

    const table = await screen.findByRole('table', { name: 'Logbook contents' });
    const rows = within(table)
      .getAllByRole('row')
      .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent));
    expect(rows).toEqual([
      ['Date', 'Odometer (km)', 'Description', 'Workshop'],
      ['2024-03-12', '15,020', 'Service #1 <b>oil</b>', 'Brisbane Ford'],
      ['2025-03-08', '30,410', 'Service #2', '—'],
    ]);
  });

  it('AC-08.1 shows the API message and keeps the inputs', async () => {
    vi.mocked(submitLogbook).mockRejectedValue(
      new AxiosError('Bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: { error: { code: 'INVALID_VEHICLE', message: 'Badge is not valid for this model' } },
      } as AxiosResponse),
    );
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), logbookFile());
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Badge is not valid for this model');
    expect(field('Badge')).toHaveTextContent('Raptor');
    expect(fileInput().files).toHaveLength(1);
    expect(submitButton()).toBeEnabled();
  });

  it('AC-08.2 shows a generic message for network errors', async () => {
    vi.mocked(submitLogbook).mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'));
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), logbookFile());
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong, please try again',
    );
  });

  it('AC-11.4 can be completed with the keyboard alone', async () => {
    vi.mocked(submitLogbook).mockResolvedValue({
      make: 'tesla',
      model: 'Model 3',
      badge: 'Performance',
      logbook: { format: 'text', content: 'ok' },
    });
    const { user } = setup();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Ford Ranger Raptor' })).toHaveFocus();
    await user.tab();
    await user.keyboard('{Enter}');
    expect(field('Make')).toHaveTextContent('Tesla');

    await user.upload(fileInput(), logbookFile('ok'));
    submitButton().focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Logbook received')).toBeVisible();
  });

  it('AC-12.1 reset clears the fields, file and result', async () => {
    vi.mocked(submitLogbook).mockResolvedValue({
      make: 'ford',
      model: 'Ranger',
      badge: 'Raptor',
      logbook: { format: 'text', content: 'ok' },
    });
    const { user } = setup();
    await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
    await user.upload(fileInput(), logbookFile('ok'));
    await user.click(submitButton());
    await screen.findByText('Logbook received');

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(field('Make')).toHaveTextContent('Select a make');
    expect(field('Model')).toBeDisabled();
    expect(fileInput().files).toHaveLength(0);
    expect(screen.queryByText('Logbook received')).not.toBeInTheDocument();
  });

  describe('accessibility (axe)', () => {
    it('has no violations when showing a JSON logbook table', async () => {
      vi.mocked(submitLogbook).mockResolvedValue({
        make: 'ford',
        model: 'Ranger',
        badge: 'Raptor',
        logbook: { format: 'json', content: '{}', entries: JSON_LOGBOOK.entries },
      });
      const { user, container } = setup();
      await user.click(screen.getByRole('button', { name: 'Ford Ranger Raptor' }));
      await user.upload(fileInput(), jsonLogbookFile(JSON.stringify(JSON_LOGBOOK)));
      await user.click(submitButton());
      await screen.findByRole('table');
      expect(await axeViolations(container)).toEqual([]);
    });

    it('has no violations when empty', async () => {
      const { container } = setup();
      expect(await axeViolations(container)).toEqual([]);
    });

    it('has no violations with a field error', async () => {
      const { user, container } = setup();
      await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
      await user.upload(fileInput(), new File([''], 'empty.txt', { type: 'text/plain' }));
      await screen.findByText('Logbook is empty');
      expect(await axeViolations(container)).toEqual([]);
    });

    it('has no violations after a failed submission', async () => {
      vi.mocked(submitLogbook).mockRejectedValue(new Error('boom'));
      const { user, container } = setup();
      await selectVehicle(user, 'Ford', 'Ranger', 'Raptor');
      await user.upload(fileInput(), logbookFile());
      await user.click(submitButton());
      await screen.findByRole('alert');
      expect(await axeViolations(container)).toEqual([]);
    });

    it('has no violations when showing a result', async () => {
      vi.mocked(submitLogbook).mockResolvedValue({
        make: 'bmw',
        model: '130d',
        badge: 'xDrive 26d',
        logbook: { format: 'text', content: 'ok' },
      });
      const { user, container } = setup();
      await user.click(screen.getByRole('button', { name: 'BMW 130d xDrive 26d' }));
      await user.upload(fileInput(), logbookFile('ok'));
      await user.click(submitButton());
      await screen.findByText('Logbook received');
      expect(await axeViolations(container)).toEqual([]);
    });
  });
});
