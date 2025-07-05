
"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, ServerCrash, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SyncStatus = 'idle' | 'in-progress' | 'success' | 'error';

export default function SyncAdminPage() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingCards, setIsExportingCards] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setStatus('in-progress');
    setLogs(['Starting sync process...']);
    setError(null);
    setProgress(0);

    try {
      const response = await fetch('/api/sync-sets', {
        method: 'POST',
      });

      if (!response.ok) {
        // Try to parse error from server, otherwise use status text
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // Not a JSON error, use text
          errorData = { message: `Server responded with ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.message || 'An unknown error occurred during sync.');
      }
      
      const result = await response.json();

      setLogs(result.logs || []);
      setProgress(100);

      if (result.status === 'success') {
        setStatus('success');
        setLogs(prev => [...prev, `✅ Successfully synced ${result.count} sets.`]);
      } else {
        throw new Error(result.message || 'The sync process reported a failure.');
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      setStatus('error');
      setError(err.message || "An unknown client-side error occurred.");
      setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast({
      title: "Preparing Export...",
      description: "Fetching all set data from the API. This may take a moment.",
    });

    try {
      const response = await fetch('/api/export-sets');

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `Server responded with ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.message || 'An unknown error occurred during export.');
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = "pokemon_tcg_sets.zip";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful!",
        description: `${filename} has been downloaded.`,
        className: "bg-green-50 text-green-900 border-green-200",
      });

    } catch (err: any) {
      console.error("Export Error:", err);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "An unknown client-side error occurred during export.",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleExportCards = async () => {
    setIsExportingCards(true);
    toast({
      title: "Preparing Full Card Export...",
      description: "This is a large operation and may take several minutes. Your download will begin when ready.",
      duration: 10000,
    });

    try {
      const response = await fetch('/api/export-cards');

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `Server responded with ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.message || 'An unknown error occurred during card export.');
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = "pokemon_tcg_cards.zip";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Card Export Successful!",
        description: `${filename} has been downloaded.`,
        className: "bg-green-50 text-green-900 border-green-200",
      });

    } catch (err: any) {
      console.error("Card Export Error:", err);
      toast({
        variant: "destructive",
        title: "Card Export Failed",
        description: err.message || "An unknown client-side error occurred during card export.",
      });
    } finally {
      setIsExportingCards(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <RefreshCw className="h-6 w-6 text-primary" />
                Pokémon Sets Database Sync
              </CardTitle>
              <CardDescription>
                Fetch the latest set list from the Pokémon TCG API and store it in Firestore.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <Button onClick={handleSync} disabled={status === 'in-progress'} size="lg">
                  {status === 'in-progress' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    'Start Sync'
                  )}
                </Button>
              </div>

              {status !== 'idle' && (
                <div className="space-y-4">
                  {status === 'in-progress' && (
                    <Progress value={progress} className="w-full" />
                  )}
                  {status === 'success' && (
                    <Alert variant="default" className="border-green-200 bg-green-50 text-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>Sync Successful!</AlertTitle>
                      <AlertDescription>The Pokémon TCG sets have been successfully updated in the database.</AlertDescription>
                    </Alert>
                  )}
                  {status === 'error' && error && (
                    <Alert variant="destructive">
                      <ServerCrash className="h-4 w-4" />
                      <AlertTitle>Sync Failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Card className="bg-muted/50">
                    <CardHeader className="py-2">
                      <CardTitle className="text-sm">Sync Logs</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <ScrollArea className="h-48 w-full rounded-md border p-2 bg-background">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {logs.join('\n')}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              <Alert>
                <AlertTitle>Important Note</AlertTitle>
                <AlertDescription>
                  This tool writes data to your Firestore database. Ensure your environment variables for Firebase are set correctly.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                  <Download className="h-6 w-6 text-primary" />
                  Export Sets Data
                </CardTitle>
                <CardDescription>
                  Download a zip archive of all Pokémon TCG set data directly from the API.
                </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                  <Button onClick={handleExport} disabled={isExporting} size="lg">
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      'Download Sets Data (ZIP)'
                    )}
                  </Button>
                </div>
                 <Alert className="mt-6">
                  <AlertTitle>What's Included?</AlertTitle>
                  <AlertDescription>
                    This will generate a zip file containing a single `pokemon_tcg_sets.json` file with the complete data for all sets.
                  </AlertDescription>
                </Alert>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                  <Download className="h-6 w-6 text-primary" />
                  Export All Cards
                </CardTitle>
                <CardDescription>
                  Download a zip archive of **all** individual Pokémon TCG cards from the API.
                </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                  <Button onClick={handleExportCards} disabled={isExportingCards} size="lg">
                    {isExportingCards ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting Cards...
                      </>
                    ) : (
                      'Download All Cards (ZIP)'
                    )}
                  </Button>
                </div>
                <Alert variant="destructive" className="mt-6">
                  <AlertTitle>Warning: Large Operation</AlertTitle>
                  <AlertDescription>
                    This operation fetches over 15,000 cards from the API and may take several minutes to complete. The resulting file will be very large.
                  </AlertDescription>
                </Alert>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
