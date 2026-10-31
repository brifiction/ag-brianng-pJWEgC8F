import type { LogbookEntry } from '@autograb/logbook';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LogbookSubmission } from './api.ts';
import { makeLabel, vehicleLabel } from './catalogue.ts';

/** Formats kilometres with thousands separators, e.g. 15,020. */
const odometer = new Intl.NumberFormat('en-AU');

/** Labels both the contents section and the entries table. */
const HEADING_ID = 'logbook-contents-heading';

/**
 * Table of JSON logbook entries, one row per entry in file order.
 * @param props - The entries to list.
 * @returns The entries table.
 */
function EntriesTable({ entries }: Readonly<{ entries: LogbookEntry[] }>) {
  return (
    <div className="max-h-96 overflow-auto rounded-md border">
      <table aria-labelledby={HEADING_ID} className="w-full text-left text-sm">
        <thead className="bg-muted">
          <tr>
            <th scope="col" className="p-2 font-medium">
              Date
            </th>
            <th scope="col" className="p-2 text-right font-medium">
              Odometer (km)
            </th>
            <th scope="col" className="p-2 font-medium">
              Description
            </th>
            <th scope="col" className="p-2 font-medium">
              Workshop
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: read-only rows that may be identical; order never changes.
            <tr key={index} className="border-t align-top">
              <td className="p-2 whitespace-nowrap">{entry.date}</td>
              <td className="p-2 text-right tabular-nums">{odometer.format(entry.odometerKm)}</td>
              <td className="p-2">{entry.description}</td>
              <td className="p-2">{entry.workshop ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Shows what the API received. User-supplied text renders as literal text, never HTML.
 * @param props - The API's response.
 * @returns The result card.
 */
export function SubmissionResult({ result }: Readonly<{ result: LogbookSubmission }>) {
  const { logbook } = result;
  const details = [
    ['Make', makeLabel(result.make)],
    ['Model', result.model],
    ['Badge', result.badge],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logbook received</CardTitle>
        <CardDescription>{vehicleLabel(result)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {details.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-muted-foreground">{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
          <h3 id={HEADING_ID} className="text-sm font-medium">
            Logbook contents
          </h3>
          {logbook.format === 'json' ? (
            <EntriesTable entries={logbook.entries} />
          ) : (
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-sm break-words whitespace-pre-wrap">
              {logbook.content}
            </pre>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
