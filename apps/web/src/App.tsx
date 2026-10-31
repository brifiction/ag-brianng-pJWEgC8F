import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useCatalogue } from './features/vehicle-logbook/use-catalogue.ts';
import { VehicleLogbookForm } from './features/vehicle-logbook/VehicleLogbookForm.tsx';

/**
 * Shows loading or error states until the catalogue arrives, then the form.
 * @returns A loading message, an error with Retry, or the form.
 */
function CatalogueGate() {
  const { state, retry } = useCatalogue();

  if (state.status === 'loading') {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Spinner aria-hidden /> Loading vehicles…
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn't load vehicles</AlertTitle>
        <AlertDescription>Check your connection and try again.</AlertDescription>
        <AlertAction>
          <Button size="sm" variant="outline" onClick={retry}>
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }

  return <VehicleLogbookForm catalogue={state.catalogue} />;
}

/**
 * Page layout: a card holding the vehicle logbook form.
 * @returns The page.
 */
export function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Vehicle logbook</h1>
          </CardTitle>
          <CardDescription>
            Select your vehicle, then upload its service logbook as a text file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CatalogueGate />
        </CardContent>
      </Card>
    </main>
  );
}
