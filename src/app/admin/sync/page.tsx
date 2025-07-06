
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, ServerCrash, CheckCircle, Download, Database, RefreshCcw, Library, Play, Square, ListRestart, Users, NotebookText, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SyncStatus = 'idle' | 'in-progress' | 'success' | 'error' | 'stopped';
interface ApiSet {
  id: string;
  name: string;
  total: number;
}

export default function SyncAdminPage() {
  const [setsSyncStatus, setSetsSyncStatus] = useState<SyncStatus>('idle');
  const [cardsSyncStatus, setCardsSyncStatus] = useState<SyncStatus>('idle');
  const [artistsSyncStatus, setArtistsSyncStatus] = useState<SyncStatus>('idle');
  const [pokedexSyncStatus, setPokedexSyncStatus] = useState<SyncStatus>('idle');
  
  const [setsLogs, setSetsLogs] = useState<string[]>([]);
  const [cardsLogs, setCardsLogs] = useState<string[]>([]);
  const [artistsLogs, setArtistsLogs] = useState<string[]>([]);
  const [pokedexLogs, setPokedexLogs] = useState<string[]>([]);
  
  const [setsError, setSetsError] = useState<string | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [artistsError, setArtistsError] = useState<string | null>(null);
  const [pokedexError, setPokedexError] = useState<string | null>(null);

  const [isExportingSets, setIsExportingSets] = useState(false);
  const [isExportingCards, setIsExportingCards] = useState(false);
  
  const [setCount, setSetCount] = useState<number | null>(null);
  const [cardCount, setCardCount] = useState<number | null>(null);
  const [artistCount, setArtistCount] = useState<number | null>(null);
  const [pokedexCount, setPokedexCount] = useState<number | null>(null);
  
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const { toast } = useToast();

  const [allSetsToSync, setAllSetsToSync] = useState<ApiSet[]>([]);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [totalCardsSynced, setTotalCardsSynced] = useState(0);
  const isSyncStopped = useRef(false);
  
  const [remoteApiCardCount, setRemoteApiCardCount] = useState<number | null>(null);
  const [showCardSyncConfirm, setShowCardSyncConfirm] = useState(false);
  const [isCheckingCardDiff, setIsCheckingCardDiff] = useState(false);

  // States for the new Master Sync flow
  const [masterSyncStatus, setMasterSyncStatus] = useState<SyncStatus>('idle');
  const [masterSyncLogs, setMasterSyncLogs] = useState<string[]>([]);
  const [masterSyncError, setMasterSyncError] = useState<string | null>(null);
  const [masterSyncProgress, setMasterSyncProgress] = useState(0);
  const [masterSyncCurrentStep, setMasterSyncCurrentStep] = useState("");


  const checkDbStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    setStatusError(null);
    try {
        const [setsResponse, cardsResponse, artistsResponse, pokedexResponse] = await Promise.all([
            fetch('/api/sets-count'),
            fetch('/api/cards-count'),
            fetch('/api/artists-count'),
            fetch('/api/pokedex-count'),
        ]);
        
        if (!setsResponse.ok) throw new Error(`Failed to fetch set count: ${setsResponse.statusText}`);
        const setsData = await setsResponse.json();
        setSetCount(setsData.count);

        if (!cardsResponse.ok) throw new Error(`Failed to fetch card count: ${cardsResponse.statusText}`);
        const cardsData = await cardsResponse.json();
        setCardCount(cardsData.count);

        if (!artistsResponse.ok) throw new Error(`Failed to fetch artist count: ${artistsResponse.statusText}`);
        const artistsData = await artistsResponse.json();
        setArtistCount(artistsData.count);
        
        if (!pokedexResponse.ok) throw new Error(`Failed to fetch pokedex count: ${pokedexResponse.statusText}`);
        const pokedexData = await pokedexResponse.json();
        setPokedexCount(pokedexData.count);

    } catch (err: any) {
        setStatusError(err.message);
        setSetCount(null);
        setCardCount(null);
        setArtistCount(null);
        setPokedexCount(null);
    } finally {
        setIsCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    checkDbStatus();
  }, [checkDbStatus]);

  const handleFullResync = async () => {
    setMasterSyncStatus('in-progress');
    setMasterSyncLogs(['🚀 Starting full data resynchronization...']);
    setMasterSyncError(null);
    setMasterSyncProgress(0);

    try {
        // Step 1: Check card counts
        setMasterSyncCurrentStep("Checking for updates...");
        setMasterSyncLogs(prev => [...prev, "\n[Step 1/4] Checking for new cards..."]);
        const localCountResponse = await fetch('/api/cards-count');
        const remoteCountResponse = await fetch('/api/tcg-api-stats');

        if (!localCountResponse.ok || !remoteCountResponse.ok) {
            throw new Error('Failed to fetch card counts to check for updates.');
        }

        const localData = await localCountResponse.json();
        const remoteData = await remoteCountResponse.json();
        setMasterSyncLogs(prev => [...prev, `Local card count: ${localData.count}`]);
        setMasterSyncLogs(prev => [...prev, `Remote API card count: ${remoteData.totalCount}`]);

        if (localData.count >= remoteData.totalCount) {
             setMasterSyncLogs(prev => [...prev, "\n✅ Database is already up to date. No sync needed."]);
             setMasterSyncStatus('success');
             setMasterSyncProgress(100);
             await checkDbStatus();
             return;
        }
        setMasterSyncProgress(10);

        // Step 2: Sync Sets
        setMasterSyncCurrentStep("Syncing sets...");
        setMasterSyncLogs(prev => [...prev, "\n[Step 2/4] Syncing latest set list..."]);
        const setsResponse = await fetch('/api/sync-sets', { method: 'POST' });
        const setsResult = await setsResponse.json();
        setMasterSyncLogs(prev => [...prev, ...(setsResult.logs || [])]);
        if (!setsResponse.ok || setsResult.status !== 'success') {
             throw new Error(setsResult.message || `Set sync failed.`);
        }
        setMasterSyncLogs(prev => [...prev, `✅ Set sync complete. Found ${setsResult.count} sets.`]);
        await checkDbStatus();
        setMasterSyncProgress(25);

        // Step 3: Sync All Cards
        setMasterSyncCurrentStep("Syncing all cards...");
        setMasterSyncLogs(prev => [...prev, "\n[Step 3/4] Starting full card database sync..."]);
        const setsToSyncResponse = await fetch('/api/sets');
        if (!setsToSyncResponse.ok) throw new Error(`Failed to fetch set list for card sync: ${setsToSyncResponse.statusText}`);
        const setsToSync: ApiSet[] = await setsToSyncResponse.json();
        if (setsToSync.length === 0) {
            throw new Error('No sets found in database to sync cards from.');
        }

        let cumulativeCardCount = 0;
        for (let i = 0; i < setsToSync.length; i++) {
            const currentSet = setsToSync[i];
            const progressPercentage = 25 + ((i + 1) / setsToSync.length) * 50; // Card sync is 25% to 75%
            setMasterSyncProgress(progressPercentage);
            setMasterSyncCurrentStep(`Syncing cards for set: ${currentSet.name}`);
            setMasterSyncLogs(prev => [...prev, `\n[${i + 1}/${setsToSync.length}] Syncing set: ${currentSet.name} (${currentSet.id})`]);

            const syncResponse = await fetch('/api/sync-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId: currentSet.id }),
            });
            const syncResult = await syncResponse.json();
            setMasterSyncLogs(prev => [...prev, ...(syncResult.logs || [])]);

            if (!syncResponse.ok || syncResult.status !== 'success') {
                throw new Error(syncResult.message || `Failed to sync cards for set ${currentSet.id}`);
            }
            cumulativeCardCount += syncResult.count || 0;
        }
        setMasterSyncLogs(prev => [...prev, `\n✅ Card sync complete! Total cards processed in this run: ${cumulativeCardCount}.`]);
        await checkDbStatus();
        setMasterSyncProgress(75);

        // Step 4: Sync Artists
        setMasterSyncCurrentStep("Generating artist database...");
        setMasterSyncLogs(prev => [...prev, "\n[Step 4/4] Generating artist database..."]);
        const artistsResponse = await fetch('/api/artists', { method: 'POST' });
        const artistsResult = await artistsResponse.json();
        setMasterSyncLogs(prev => [...prev, ...(artistsResult.logs || [])]);
        if (!artistsResponse.ok || artistsResult.status !== 'success') {
             throw new Error(artistsResult.message || `Artist database generation failed.`);
        }
        setMasterSyncLogs(prev => [...prev, `✅ Artist sync complete. Found ${artistsResult.count} artists.`]);
        await checkDbStatus();
        setMasterSyncProgress(100);

        // All done
        setMasterSyncCurrentStep("Completed!");
        setMasterSyncLogs(prev => [...prev, "\n🎉🎉🎉 Full data resynchronization complete!"]);
        setMasterSyncStatus('success');

    } catch (err: any) {
        setMasterSyncStatus('error');
        setMasterSyncError(err.message || "An unknown error occurred during the sync process.");
        setMasterSyncLogs(prev => [...prev, `❌ FATAL ERROR: ${err.message}`]);
    }
  };


  const handleSetsSync = async () => {
    setSetsSyncStatus('in-progress');
    setSetsLogs(['Starting set sync process...']);
    setSetsError(null);

    try {
      const response = await fetch('/api/sync-sets', { method: 'POST' });
      const result = await response.json();
      
      setSetsLogs(result.logs || []);

      if (response.ok && result.status === 'success') {
        setSetsSyncStatus('success');
        setSetsLogs(prev => [...prev, `✅ Successfully synced ${result.count} sets.`]);
        await checkDbStatus();
      } else {
        throw new Error(result.message || `Server responded with status ${response.status}`);
      }
    } catch (err: any) {
      setSetsSyncStatus('error');
      setSetsError(err.message || "An unknown client-side error occurred.");
      setSetsLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };

  const stopCardSync = () => {
    isSyncStopped.current = true;
    setCardsSyncStatus('stopped');
    setCardsLogs(prev => [...prev, '🛑 Sync process stopped by user.']);
  };
  
  const resetCardSync = () => {
    setCardsSyncStatus('idle');
    setCardsLogs([]);
    setCardsError(null);
    setCurrentSetIndex(0);
    setTotalCardsSynced(0);
    setAllSetsToSync([]);
    isSyncStopped.current = false;
  };
  
  const handleCardSyncCheck = async () => {
    setIsCheckingCardDiff(true);
    setCardsError(null);
    try {
        await checkDbStatus(); // Ensure local count is up-to-date
        const response = await fetch('/api/tcg-api-stats');
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch API card count.');
        }
        const data = await response.json();
        setRemoteApiCardCount(data.totalCount);
        setShowCardSyncConfirm(true);
    } catch (err: any) {
        setCardsError(err.message);
        setCardsSyncStatus('error');
        setCardsLogs(prev => [...prev, `❌ Error during pre-sync check: ${err.message}`]);
    } finally {
        setIsCheckingCardDiff(false);
    }
  };

  const handleCardsSync = async () => {
    resetCardSync();
    setCardsSyncStatus('in-progress');
    
    setCardsLogs(prev => [...prev, 'Fetching list of all sets to sync...']);
    try {
      const setsResponse = await fetch('/api/sets');
      if (!setsResponse.ok) throw new Error(`Failed to fetch set list: ${setsResponse.statusText}`);
      const sets: ApiSet[] = await setsResponse.json();
      if (sets.length === 0) {
        setCardsLogs(prev => [...prev, '⚠️ No sets found in database. Please sync sets first.']);
        setCardsSyncStatus('error');
        setCardsError('No sets found in database. Please sync sets first.');
        return;
      }
      setAllSetsToSync(sets);
      setCardsLogs(prev => [...prev, `Found ${sets.length} sets. Starting incremental sync...`]);

      let cumulativeCardCount = 0;
      for (let i = 0; i < sets.length; i++) {
        if (isSyncStopped.current) break;

        setCurrentSetIndex(i);
        const currentSet = sets[i];
        setCardsLogs(prev => [...prev, `\n[${i + 1}/${sets.length}] Syncing set: ${currentSet.name} (${currentSet.id})`]);

        const syncResponse = await fetch('/api/sync-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ setId: currentSet.id }),
        });
        
        const syncResult = await syncResponse.json();
        setCardsLogs(prev => [...prev, ...(syncResult.logs || [])]);

        if (!syncResponse.ok || syncResult.status !== 'success') {
          throw new Error(syncResult.message || `Failed to sync set ${currentSet.id}`);
        }
        
        cumulativeCardCount += syncResult.count || 0;
        setTotalCardsSynced(cumulativeCardCount);
      }
      
      if (!isSyncStopped.current) {
        setCardsSyncStatus('success');
        setCardsLogs(prev => [...prev, `\n✅✅✅ Full sync complete! Total cards synced: ${cumulativeCardCount}.`]);
        await checkDbStatus();
      }

    } catch (err: any) {
        setCardsSyncStatus('error');
        setCardsError(err.message || "An unknown client-side error occurred during card sync.");
        setCardsLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };
  
  const handleArtistsSync = async () => {
    setArtistsSyncStatus('in-progress');
    setArtistsLogs(['Starting artist database generation...']);
    setArtistsError(null);
    try {
      const response = await fetch('/api/artists', { method: 'POST' });
      const result = await response.json();

      setArtistsLogs(result.logs || ['No logs returned from server.']);

      if (response.ok && result.status === 'success') {
        setArtistsSyncStatus('success');
        setArtistsLogs(prev => [...prev, `✅ Successfully generated and stored ${result.count} artists.`]);
        await checkDbStatus();
      } else {
        throw new Error(result.message || `Server responded with status ${response.status}`);
      }
    } catch (err: any) {
      setArtistsSyncStatus('error');
      setArtistsError(err.message || 'An unknown client-side error occurred.');
      setArtistsLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };

  const handlePokedexSync = async () => {
    setPokedexSyncStatus('in-progress');
    setPokedexLogs(['Starting Pokédex sync from PokeAPI...']);
    setPokedexError(null);
    try {
      const response = await fetch('/api/sync-pokedex', { method: 'POST' });
      const result = await response.json();

      setPokedexLogs(result.logs || ['No logs returned from server.']);

      if (response.ok && result.status === 'success') {
        setPokedexSyncStatus('success');
        setPokedexLogs(prev => [...prev, `✅ Successfully synced ${result.count} Pokémon.`]);
        await checkDbStatus();
      } else {
        throw new Error(result.message || `Server responded with status ${response.status}`);
      }
    } catch (err: any) {
      setPokedexSyncStatus('error');
      setPokedexError(err.message || 'An unknown client-side error occurred.');
      setPokedexLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    }
  };
  
  const overallProgress = allSetsToSync.length > 0 ? ((currentSetIndex + 1) / allSetsToSync.length) * 100 : 0;

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
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-lg border-primary">
            <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Full Data Resynchronization
                </CardTitle>
                <CardDescription>
                    This will run the full data sync process in the correct order: check for updates, sync sets, sync all cards, then regenerate the artist database.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center">
                    <Button onClick={handleFullResync} disabled={masterSyncStatus === 'in-progress'} size="lg">
                        {masterSyncStatus === 'in-progress' ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing ({masterSyncProgress.toFixed(0)}%)...</>
                        ) : 'Start Full Resync'}
                    </Button>
                    {masterSyncStatus === 'in-progress' && (
                        <p className="text-sm text-muted-foreground mt-2">{masterSyncCurrentStep}</p>
                    )}
                </div>

                {masterSyncStatus !== 'idle' && (
                    <div className="space-y-4">
                        {masterSyncStatus === 'in-progress' && (
                            <Progress value={masterSyncProgress} className="w-full" />
                        )}
                        {masterSyncStatus === 'success' && (
                            <Alert variant="default" className="border-green-200 bg-green-50 text-green-900">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertTitle>Full Resync Successful!</AlertTitle>
                            </Alert>
                          )}
                          {masterSyncStatus === 'error' && masterSyncError && (
                            <Alert variant="destructive">
                              <ServerCrash className="h-4 w-4" />
                              <AlertTitle>Full Resync Failed</AlertTitle>
                              <AlertDescription>{masterSyncError}</AlertDescription>
                            </Alert>
                          )}
                          <Card className="bg-muted/50"><CardHeader className="py-2"><CardTitle className="text-sm">Master Sync Logs</CardTitle></CardHeader><CardContent className="p-2">
                              <ScrollArea className="h-48 w-full rounded-md border p-2 bg-background"><pre className="text-xs font-mono whitespace-pre-wrap">{masterSyncLogs.join('\n')}</pre></ScrollArea>
                          </CardContent></Card>
                    </div>
                )}
            </CardContent>
          </Card>
           <Card className="shadow-lg">
              <CardHeader>
                  <CardTitle className="font-headline text-2xl flex items-center gap-2">
                      <Database className="h-6 w-6 text-primary" />
                      Database Status
                  </CardTitle>
                  <CardDescription>
                      A real-time check of the number of items currently stored in your Firestore database.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  {isCheckingStatus ? (
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
                      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border text-center">
                          <div>
                              <p className="text-sm text-muted-foreground">Sets</p>
                              <p className="text-5xl font-bold text-primary">{setCount}</p>
                          </div>
                          <div>
                              <p className="text-sm text-muted-foreground">Cards</p>
                              <p className="text-5xl font-bold text-primary">{cardCount}</p>
                          </div>
                           <div>
                              <p className="text-sm text-muted-foreground">Artists</p>
                              <p className="text-5xl font-bold text-primary">{artistCount}</p>
                          </div>
                          <div>
                              <p className="text-sm text-muted-foreground">Pokédex</p>
                              <p className="text-5xl font-bold text-primary">{pokedexCount}</p>
                          </div>
                      </div>
                  )}
                  <div className="text-center">
                      <Button onClick={checkDbStatus} disabled={isCheckingStatus} variant="outline" size="sm">
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
                Fetch **all** cards from the API and store them in Firestore, one set at a time. This now checks for updates before starting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <Alert>
                  <AlertTitle>Incremental Sync Process</AlertTitle>
                  <AlertDescription>
                    This tool syncs cards one set at a time to prevent server timeouts. The process may still take several minutes. You can stop the process at any time.
                  </AlertDescription>
                </Alert>
              <div className="flex gap-4 justify-center">
                 {cardsSyncStatus !== 'in-progress' ? (
                    <Button onClick={handleCardSyncCheck} disabled={isCheckingCardDiff} size="lg">
                        {isCheckingCardDiff ? (
                           <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Checking for Updates...</>
                        ) : (
                           <><Play className="mr-2 h-4 w-4"/> Start Full Card Sync</>
                        )}
                    </Button>
                 ) : (
                    <Button onClick={stopCardSync} variant="destructive" size="lg">
                        <Square className="mr-2 h-4 w-4"/> Stop Sync
                    </Button>
                 )}
                 {cardsSyncStatus === 'stopped' && (
                    <Button onClick={resetCardSync} variant="outline" size="lg">
                        <ListRestart className="mr-2 h-4 w-4"/> Reset
                    </Button>
                 )}
              </div>

              {cardsSyncStatus !== 'idle' && (
                <div className="space-y-4">
                  {cardsSyncStatus === 'in-progress' && (
                    <div>
                      <Progress value={overallProgress} className="w-full" />
                      <p className="text-center text-sm text-muted-foreground mt-2">
                        Overall Progress: Synced {currentSetIndex} of {allSetsToSync.length} sets ({overallProgress.toFixed(1)}%)
                        <br/>
                        Total Cards Added in this Session: {totalCardsSynced}
                      </p>
                    </div>
                  )}
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
                  {cardsSyncStatus === 'stopped' && (
                    <Alert variant="default" className="border-yellow-300 bg-yellow-50 text-yellow-900">
                        <CheckCircle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle>Sync Stopped</AlertTitle>
                        <AlertDescription>The sync process was stopped. Click Reset to clear logs and start again.</AlertDescription>
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
                <Users className="h-6 w-6 text-primary" />
                Artist Database Sync
              </CardTitle>
              <CardDescription>
                Scan all cards in the database to generate a list of artists and their card counts. This populates the `pokemon-tcg-artists` collection for the browse page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <Button onClick={handleArtistsSync} disabled={artistsSyncStatus === 'in-progress'} size="lg">
                  {artistsSyncStatus === 'in-progress' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating & Storing Artists...</>
                  ) : 'Generate Artist Database'}
                </Button>
              </div>

              {artistsSyncStatus !== 'idle' && (
                <div className="space-y-4">
                  {artistsSyncStatus === 'success' && (
                    <Alert variant="default" className="border-green-200 bg-green-50 text-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>Artist Sync Successful!</AlertTitle>
                    </Alert>
                  )}
                  {artistsSyncStatus === 'error' && artistsError && (
                    <Alert variant="destructive">
                      <ServerCrash className="h-4 w-4" />
                      <AlertTitle>Artist Sync Failed</AlertTitle>
                      <AlertDescription>{artistsError}</AlertDescription>
                    </Alert>
                  )}
                  <Card className="bg-muted/50"><CardHeader className="py-2"><CardTitle className="text-sm">Artist Sync Logs</CardTitle></CardHeader><CardContent className="p-2">
                      <ScrollArea className="h-48 w-full rounded-md border p-2 bg-background"><pre className="text-xs font-mono whitespace-pre-wrap">{artistsLogs.join('\n')}</pre></ScrollArea>
                  </CardContent></Card>
                </div>
              )}
            </CardContent>
          </Card>

           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <NotebookText className="h-6 w-6 text-primary" />
                Pokédex Data Sync
              </CardTitle>
              <CardDescription>
                Fetch data for all Pokémon from all generations from PokeAPI and store it in the `pokedex` collection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <Button onClick={handlePokedexSync} disabled={pokedexSyncStatus === 'in-progress'} size="lg">
                  {pokedexSyncStatus === 'in-progress' ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing Pokédex...</>
                  ) : 'Sync Pokédex Data'}
                </Button>
              </div>

              {pokedexSyncStatus !== 'idle' && (
                <div className="space-y-4">
                  {pokedexSyncStatus === 'success' && (
                    <Alert variant="default" className="border-green-200 bg-green-50 text-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>Pokédex Sync Successful!</AlertTitle>
                    </Alert>
                  )}
                  {pokedexSyncStatus === 'error' && pokedexError && (
                    <Alert variant="destructive">
                      <ServerCrash className="h-4 w-4" />
                      <AlertTitle>Pokédex Sync Failed</AlertTitle>
                      <AlertDescription>{pokedexError}</AlertDescription>
                    </Alert>
                  )}
                  <Card className="bg-muted/50"><CardHeader className="py-2"><CardTitle className="text-sm">Pokédex Sync Logs</CardTitle></CardHeader><CardContent className="p-2">
                      <ScrollArea className="h-48 w-full rounded-md border p-2 bg-background"><pre className="text-xs font-mono whitespace-pre-wrap">{pokedexLogs.join('\n')}</pre></ScrollArea>
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
        <AlertDialog open={showCardSyncConfirm} onOpenChange={setShowCardSyncConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Full Card Sync</AlertDialogTitle>
              <AlertDialogDescription>
                An update check has been performed. Please review the counts before starting the sync.
                <div className="grid grid-cols-2 gap-4 mt-4 text-foreground">
                    <div className="p-3 bg-muted rounded-md text-center">
                        <p className="text-sm text-muted-foreground">Cards in Your Database</p>
                        <p className="text-2xl font-bold">{cardCount ?? 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-md text-center">
                        <p className="text-sm text-muted-foreground">Total Cards in API</p>
                        <p className="text-2xl font-bold">{remoteApiCardCount ?? 'N/A'}</p>
                    </div>
                </div>
                <p className="mt-4 text-sm">
                    Proceeding will fetch all cards from the Pokémon TCG API and store them in your database. This process can take several minutes.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                  setShowCardSyncConfirm(false);
                  handleCardsSync();
              }}>
                Proceed with Sync
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
