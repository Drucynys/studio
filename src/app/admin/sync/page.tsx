
"use client";

import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, ServerCrash, CheckCircle, Download, Database, RefreshCcw, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SyncStatus = 'idle' | 'in-progress' | 'success' | 'error';

export default function SyncAdminPage() {
  const [setsSyncStatus, setSetsSyncStatus] = useState<SyncStatus>('idle');
  const [cardsSyncStatus, setCardsSyncStatus] = useState<SyncStatus>('idle');
  
  const [setsProgress, setSetsProgress] = useState(0);
  const [cardsProgress, setCardsProgress] = useState(0);
  
  const [setsLogs, setSetsLogs] = useState<string[]>([]);
  const [cardsLogs, setCardsLogs] = useState<string[]>([]);
  
  const [setsError, setSetsError] = useState<string | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);

  const [isExportingSets, setIsExportingSets] = useState(false);
  const [isExportingCards, setIsExportingCards] = useState(false);
  
  const [setCount, setSetCount] = useState<number | null>(null);
  const [cardCount, setCardCount] = useState<number | null>(null);
  
  const [isCheckingSetsStatus, setIsCheckingSetsStatus] = useState(true);
  const [isCheckingCardsStatus, setIsCheckingCardsStatus] = useState(true);
  
  const [statusError, setStatusError] = useState<string | null>(null);

  const { toast } = useToast();

  const checkDbStatus = useCallback(async () => {
    setIsCheckingSetsStatus(true);
    setIsCheckingCardsStatus(true);
    setStatusError(null);
    try {
        const [setsResponse, cardsResponse] = await Promise.all([
            fetch('/api/sets-count'),
            fetch('/api/cards-count')
        ]);
        
        if (!setsResponse.ok) throw new Error(`Failed to fetch set count: ${setsResponse.statusText}`);
        const setsData = await setsResponse.json();
        setSetCount(setsData.count);

        if (!cardsResponse.ok) throw new Error(`Failed to fetch card count: ${cardsResponse.statusText}`);
        const cardsData = await cardsResponse.json();
        setCardCount(cardsData.count);

    } catch (err: any) {
        setStatusError(err.message);
        setSetCount(null);
        setCardCount(null);
    } finally {
        setIsCheckingSetsStatus(false);
        setIsCheckingCardsStatus(false);
    }
  }, []);

  useEffect(() => {
    checkDbStatus();
  }, [checkDbStatus]);

  const handleSetsSync = async () => {
    setSetsSyncStatus('in-progress');
    setSetsLogs(['Starting set sync process...']);
    setSetsError(null);
    setSetsProgress(0);

    try {
      const response = await fetch('/api/sync-sets', { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Server responded with ${response.status}` }));
        throw new Error(errorData.message || 'An unknown error occurred during sync.');
      }
      
      const result = await response.json();
      setSetsLogs(result.logs || []);
      setSetsProgress(100);

      if (result.status === 'success') {
        setSetsSyncStatus('success');
        setSetsLogs(prev => [...prev, `✅ Successfully synced ${result.count} sets.`]);
        await checkDbStatus();
      } else {
        throw new Error(result.message || 'The sync process reported a failure.');
      }
    } catch (err: any) {
      setSetsSyncStatus('error');
      setSetsError(err.message || "An unknown client-side error occurred.");
      setSetsLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };

  const handleCardsSync = async () => {
    setCardsSyncStatus('in-progress');
    setCardsLogs(['Starting full card sync process... This will take several minutes.']);
    setCardsError(null);
    setCardsProgress(0);

    try {
        const response = await fetch('/api/sync-cards', { method: 'POST' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `Server responded with ${response.status}` }));
            throw new Error(errorData.message || 'An unknown error occurred during card sync.');
        }

        const result = await response.json();
        setCardsLogs(result.logs || []);
        setCardsProgress(100);

        if (result.status === 'success') {
            setCardsSyncStatus('success');
            setCardsLogs(prev => [...prev, `✅ Successfully synced ${result.count} cards.`]);
            await checkDbStatus();
        } else {
            throw new Error(result.message || 'The card sync process reported a failure.');
        }
    } catch (err: any) {
        setCardsSyncStatus('error');
        setCardsError(err.message || "An unknown client-side error occurred.");
        setCardsLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };


  const handleExport = async (type: 'sets' | 'cards') => {
    const isSets = type === 'sets';
    if (isSets) setIsExportingSets(true);
    else setIsExportingCards(true);

    toast({
      title: `Preparing ${isSets ? 'Sets' : 'Cards'} Export...`,
      description: `Fetching all ${type} data from the API. This may take a moment.`,
    });

    try {
      const response = await fetch(isSets ? '/api/export-sets' : '/api/export-cards');

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Server responded with ${response.status}` }));
        throw new Error(errorData.message || 'An unknown error occurred during export.');
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = isSets ? "pokemon_tcg_sets.zip" : "pokemon_tcg_cards.zip";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch?.[1]) filename = filenameMatch[1];
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
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: err.message || "An unknown client-side error occurred during export.",
      });
    } finally {
      if (isSets) setIsExportingSets(false);
      else setIsExportingCards(false);
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
                      <Database className="h-6 w-6 text-primary" />
                      Database Status
                  </CardTitle>
                  <CardDescription>
                      A real-time check of the number of sets and cards currently stored in your Firestore database.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  {isCheckingSetsStatus || isCheckingCardsStatus ? (
                      <div className="flex items-center justify-center py-4 text-muted-foreground">
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking database status...
                      </div>
                  ) : statusError ? (
                      <Alert variant="destructive">
                          <ServerCrash className="h-4 w-4" />
                          <AlertTitle>Could Not Check Status</AlertTitle>
                          <AlertDescription>{statusError}</AlertDescription>
                      </Alert>
                  ) : (
                      <div className="grid grid-cols-2 divide-x divide-border text-center">
                          <div>
                              <p className="text-sm text-muted-foreground">Sets in Database</p>
                              <p className="text-5xl font-bold text-primary">{setCount}</p>
                          </div>
                          <div>
                              <p className="text-sm text-muted-foreground">Cards in Database</p>
                              <p className="text-5xl font-bold text-primary">{cardCount}</p>
                          </div>
                      </div>
                  )}
                  <div className="text-center">
                      <Button onClick={checkDbStatus} disabled={isCheckingSetsStatus || isCheckingCardsStatus} variant="outline" size="sm">
                          <RefreshCcw className="mr-2 h-3 w-3" />
                          Refresh Status
                      </Button>
                  </div>
              </CardContent>
          </Card>
        
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
                <Button onClick={handleSetsSync} disabled={setsSyncStatus === 'in-progress'} size="lg">
                  {setsSyncStatus === 'in-progress' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing Sets...</>
                  ) : 'Start Set Sync'}
                </Button>
              </div>

              {setsSyncStatus !== 'idle' && (
                <div className="space-y-4">
                  {setsSyncStatus === 'in-progress' && <Progress value={setsProgress} className="w-full" />}
                  {setsSyncStatus === 'success' && (
                    <Alert variant="default" className="border-green-200 bg-green-50 text-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>Set Sync Successful!</AlertTitle>
                    </Alert>
                  )}
                  {setsSyncStatus === 'error' && setsError && (
                    <Alert variant="destructive">
                      <ServerCrash className="h-4 w-4" />
                      <AlertTitle>Set Sync Failed</AlertTitle>
                      <AlertDescription>{setsError}</AlertDescription>
                    </Alert>
                  )}
                  <Card className="bg-muted/50"><CardHeader className="py-2"><CardTitle className="text-sm">Set Sync Logs</CardTitle></CardHeader><CardContent className="p-2">
                      <ScrollArea className="h-48 w-full rounded-md border p-2 bg-background"><pre className="text-xs font-mono whitespace-pre-wrap">{setsLogs.join('\n')}</pre></ScrollArea>
                  </CardContent></Card>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <Library className="h-6 w-6 text-primary" />
                Full Card Database Sync
              </CardTitle>
              <CardDescription>
                Fetch **all** cards from the API and store them in Firestore.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <Alert variant="destructive">
                  <AlertTitle>Warning: Very Long & Large Operation</AlertTitle>
                  <AlertDescription>
                    This will sync over 15,000 cards and may take **5-10 minutes**. Please do not navigate away from this page. This will also increase your Firestore usage significantly.
                  </AlertDescription>
                </Alert>
              <div className="text-center">
                <Button onClick={handleCardsSync} disabled={cardsSyncStatus === 'in-progress'} size="lg">
                  {cardsSyncStatus === 'in-progress' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing All Cards...</>
                  ) : 'Start Full Card Sync'}
                </Button>
              </div>

              {cardsSyncStatus !== 'idle' && (
                <div className="space-y-4">
                  {cardsSyncStatus === 'in-progress' && <Progress value={cardsProgress} className="w-full" />}
                  {cardsSyncStatus === 'success' && (
                    <Alert variant="default" className="border-green-200 bg-green-50 text-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>Card Sync Successful!</AlertTitle>
                    </Alert>
                  )}
                  {cardsSyncStatus === 'error' && cardsError && (
                    <Alert variant="destructive">
                      <ServerCrash className="h-4 w-4" />
                      <AlertTitle>Card Sync Failed</AlertTitle>
                      <AlertDescription>{cardsError}</AlertDescription>
                    </Alert>
                  )}
                  <Card className="bg-muted/50"><CardHeader className="py-2"><CardTitle className="text-sm">Card Sync Logs</CardTitle></CardHeader><CardContent className="p-2">
                      <ScrollArea className="h-48 w-full rounded-md border p-2 bg-background"><pre className="text-xs font-mono whitespace-pre-wrap">{cardsLogs.join('\n')}</pre></ScrollArea>
                  </CardContent></Card>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                  <Download className="h-6 w-6 text-primary" />
                  Export Data as ZIP
                </CardTitle>
                <CardDescription>
                  Download a local copy of all sets or all cards directly from the API.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center space-y-3">
                  <Button onClick={() => handleExport('sets')} disabled={isExportingSets} size="lg" className="w-full">
                    {isExportingSets ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting Sets...</> : 'Download Sets Data'}
                  </Button>
                  <p className="text-xs text-muted-foreground">A zip file containing JSON data for all sets.</p>
              </div>
              <div className="text-center space-y-3">
                  <Button onClick={() => handleExport('cards')} disabled={isExportingCards} size="lg" className="w-full">
                    {isExportingCards ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Exporting Cards...</> : 'Download All Cards'}
                  </Button>
                  <p className="text-xs text-muted-foreground">A zip file containing JSON data for all ~16,000+ cards.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
