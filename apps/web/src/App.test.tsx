import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axeViolations } from '@/test/axe.ts';
import { catalogue } from '@/test/catalogue.ts';
import { App } from './App.tsx';
import { fetchCatalogue } from './features/vehicle-logbook/api.ts';

vi.mock('./features/vehicle-logbook/api.ts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./features/vehicle-logbook/api.ts')>()),
  fetchCatalogue: vi.fn(),
}));

describe('App', () => {
  it('shows a loading state while the catalogue loads', async () => {
    vi.mocked(fetchCatalogue).mockReturnValue(new Promise(() => {}));
    const { container } = render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading vehicles…');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('renders the form once the catalogue loads', async () => {
    vi.mocked(fetchCatalogue).mockResolvedValue(catalogue);
    const { container } = render(<App />);

    expect(await screen.findByRole('combobox', { name: 'Make' })).toBeEnabled();
    expect(screen.getByRole('heading', { level: 1, name: 'Vehicle logbook' })).toBeVisible();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('AC-01.3 shows an error with retry when the catalogue fails to load', async () => {
    vi.mocked(fetchCatalogue)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(catalogue);
    const user = userEvent.setup();
    const { container } = render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load vehicles");
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('combobox', { name: 'Make' })).toBeEnabled();
    expect(fetchCatalogue).toHaveBeenCalledTimes(2);
  });
});
