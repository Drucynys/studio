
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, ServerCrash, CheckCircle, Download, Database, RefreshCcw, Library, Play, Square, ListRestart, Users, NotebookText, Sparkles, DollarSign } from "lucide-react";
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function safeFetch(url: string, options?: RequestInit) {
    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        throw new Error(`Server returned non-JSON response (${response.status}). The platform may be experiencing issues.`);
    } catch (err: any) {
        return { status: 'error', message: err.message };
    }
}

export default function SyncAdminPage() {
  const [setsSyncStatus, setSetsSyncStatus] = useState<SyncStatus>('idle');
  const [cardsSyncStatus, setCardsSyncStatus] = useState<SyncStatus>('idle');
  const [artistsSyncStatus, setArtistsSyncStatus] = useState<SyncStatus>('idle');
  const [pokedexSyncStatus, setPokedexSyncStatus] = useState<SyncStatus>('idle');
  const [pricesSyncStatus, setPricesSyncStatus] = useState<SyncStatus>('idle');
  
  const [setsLogs, setSetsLogs] = useState<string[]>([]);
  const [cardsLogs, setCardsLogs] = useState<string[]>([]);
  const [artistsLogs, setArtistsLogs] = useState<string[]>([]);
  const [pokedexLogs, setPokedexLogs] = useState<string[]>([]);
  const [pricesLogs, setPricesLogs] = useState<string[]>([]);
  
  const [setsError, setSetsError] = useState<string | null>(null);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [artistsError, setArtistsError] = useState<string | null>(null);
  const [pokedexError, setPokedexError] = useState<string | null>(null);
  const [pricesError, setPricesError] = useState<string | null>(null);

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

  const [masterSyncStatus, setMasterSyncStatus] = useState<SyncStatus>('idle');
  const [masterSyncLogs, setMasterSyncLogs] = useState<string[]>([]);
  const [masterSyncError, setMasterSyncError] = useState<string | null>(null);
  const [masterSyncProgress, setMasterSyncProgress] = useState(0);
  const [masterSyncCurrentStep, setMasterSyncCurrentStep] = useState("");

  const checkDbStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    setStatusError(null);
    try {
        const [sets, cards, artists, pokedex] = await Promise.all([
            safeFetch('/api/sets-count'),
            safeFetch('/api/cards-count'),
            safeFetch('/api/artists-count'),
            safeFetch('/api/pokedex-count'),
        ]);
        
        setSetCount(sets.count ?? null);
        setCardCount(cards.count ?? null);
        setArtistCount(artists.count ?? null);
        setPokedexCount(pokedex.count ?? null);

    } catch (err: any) {
        setStatusError(err.message);
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
    isSyncStopped.current = false;

    try {
        // Step 1: Sync Sets
        setMasterSyncCurrentStep("Step 1/3: Discovering sets...");
        setMasterSyncLogs(prev => [...prev, "\n[Step 1/3] Syncing latest set list from API..."]);
        const setsResult = await safeFetch('/api/sync-sets', { method: 'POST' });
        
        if (setsResult.logs) setMasterSyncLogs(prev => [...prev, ...setsResult.logs]);
        
        if (setsResult.status === 'error') {
            throw new Error(setsResult.message || "Discovery phase failed. See logs.");
        }
        
        setMasterSyncProgress(10);
        await checkDbStatus();

        // Step 2: Sync All Cards
        setMasterSyncCurrentStep("Step 2/3: Downloading cards...");
        setMasterSyncLogs(prev => [...prev, "\n[Step 2/3] Starting full card database population..."]);
        const setsToSync = await safeFetch('/api/sets');
        if (!Array.isArray(setsToSync)) throw new Error("Could not retrieve locally synced sets list.");

        let cumulativeCardCount = 0;
        for (let i = 0; i < setsToSync.length; i++) {
            if (isSyncStopped.current) break;
            const currentSet = setsToSync[i];
            const progress = 10 + ((i + 1) / setsToSync.length) * 80;
            setMasterSyncProgress(progress);
            setMasterSyncCurrentStep(`Syncing: ${currentSet.name} (${i + 1}/${setsToSync.length})`);
            
            // Delays to prevent API blocks
            await sleep(1000); 

            const syncResult = await safeFetch('/api/sync-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId: currentSet.id }),
            });
            
            if (syncResult.status === 'error') {
                setMasterSyncLogs(prev => [...prev, `⚠️ Error syncing ${currentSet.name}: ${syncResult.message}. Continuing...`]);
            } else {
                cumulativeCardCount += syncResult.count || 0;
            }
        }
        
        setMasterSyncLogs(prev => [...prev, `\n✅ Card population complete! Total cards processed: ${cumulativeCardCount}.`]);
        await checkDbStatus();

        // Step 3: Sync Artists
        setMasterSyncCurrentStep("Step 3/3: Rebuilding artist index...");
        setMasterSyncLogs(prev => [...prev, "\n[Step 3/3] Aggregating unique illustrators..."]);
        const artistsResult = await safeFetch('/api/artists', { method: 'POST' });
        if (artistsResult.logs) setMasterSyncLogs(prev => [...prev, ...artistsResult.logs]);
        
        setMasterSyncProgress(100);
        setMasterSyncCurrentStep("Resynchronization Completed Successfully!");
        setMasterSyncStatus('success');
        toast({ title: "Full Sync Complete", description: "Database is now fully up to date." });

    } catch (err: any) {
        setMasterSyncStatus('error');
        setMasterSyncError(err.message);
        setMasterSyncLogs(prev => [...prev, `❌ FATAL ERROR: ${err.message}`]);
        toast({ variant: "destructive", title: "Resync Failed", description: err.message });
    }
  };

  const handleSetsSync = async () => {
    setSetsSyncStatus('in-progress');
    setSetsLogs(['Starting set sync process...']);
    const result = await safeFetch('/api/sync-sets', { method: 'POST' });
    setSetsLogs(result.logs || [result.message]);
    setSetsSyncStatus(result.status === 'success' ? 'success' : 'error');
    if (result.status === 'success') await checkDbStatus();
  };

  const handleCardSyncCheck = async () => {
    setIsCheckingCardDiff(true);
    const data = await safeFetch('/api/tcg-api-stats');
    if (data.status === 'error') {
        toast({ variant: 'destructive', title: 'Check Failed', description: data.message });
    } else {
        setRemoteApiCardCount(data.totalCount);
        setShowCardSyncConfirm(true);
    }
    setIsCheckingCardDiff(false);
  };

  const handleCardsSync = async () => {
    setCardsSyncStatus('in-progress');
    setCardsLogs(['Fetching list of all sets...']);
    isSyncStopped.current = false;
    
    const sets = await safeFetch('/api/sets');
    if (!Array.isArray(sets)) {
        setCardsSyncStatus('error');
        setCardsLogs(prev => [...prev, `❌ Error: ${sets.message}`]);
        return;
    }
    
    setAllSetsToSync(sets);
    let cumulative = 0;
    for (let i = 0; i < sets.length; i++) {
        if (isSyncStopped.current) break;
        setCurrentSetIndex(i);
        await sleep(1000);
        const result = await safeFetch('/api/sync-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setId: sets[i].id }),
        });
        setCardsLogs(prev => [...prev, ...(result.logs || [result.message])]);
        if (result.status === 'success') cumulative += result.count;
        setTotalCardsSynced(cumulative);
    }
    setCardsSyncStatus('success');
    await checkDbStatus();
  };

  const stopCardSync = () => {
    isSyncStopped.current = true;
    setCardsSyncStatus('stopped');
    setMasterSyncStatus('stopped');
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
                    This will run the full data sync process in order: sets, cards, then artists. 
                    Discovery timeout is set to 90s to handle slow API days.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center">
                    <Button onClick={handleFullResync} disabled={masterSyncStatus === 'in-progress'} size="lg" className="w-full sm:w-auto">
                        {masterSyncStatus === 'in-progress' ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing ({masterSyncProgress.toFixed(0)}%)...</>
                        ) : 'Start Full Resync'}
                    </Button>
                    {masterSyncStatus === 'in-progress' && (
                        <p className="text-sm font-medium text-primary mt-4 animate-pulse">{masterSyncCurrentStep}</p>
                    )}
                </div>

                {masterSyncStatus !== 'idle' && (
                    <div className="space-y-4">
                        {masterSyncStatus === 'in-progress' && <Progress value={masterSyncProgress} className="w-full" />}
                        {masterSyncStatus === 'success' && (
                            <Alert className="border-green-200 bg-green-50 text-green-900">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertTitle>Full Resync Successful!</AlertTitle>
                              <AlertDescription>Your database is completely populated.</AlertDescription>
                            </Alert>
                          )}
                          <Card className="bg-muted/50"><CardHeader className="py-2"><CardTitle className="text-sm">Master Sync Logs</CardTitle></CardHeader><CardContent className="p-2">
                              <ScrollArea className="h-64 w-full rounded-md border p-2 bg-background"><pre className="text-xs font-mono whitespace-pre-wrap">{masterSyncLogs.join('\n')}</pre></ScrollArea>
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
              </CardHeader>
              <CardContent className="space-y-4">
                  {isCheckingStatus ? (
                      <div className="flex items-center justify-center py-4"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</div>
                  ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 divide-x text-center">
                          <div><p className="text-sm text-muted-foreground">Sets</p><p className="text-3xl font-bold">{setCount ?? '-'}</p></div>
                          <div><p className="text-sm text-muted-foreground">Cards</p><p className="text-3xl font-bold">{cardCount ?? '-'}</p></div>
                          <div><p className="text-sm text-muted-foreground">Artists</p><p className="text-3xl font-bold">{artistCount ?? '-'}</p></div>
                          <div><p className="text-sm text-muted-foreground">Pokédex</p><p className="text-3xl font-bold">{pokedexCount ?? '-'}</p></div>
                      </div>
                  )}
                  <div className="text-center">
                      <Button onClick={checkDbStatus} variant="outline" size="sm"><RefreshCcw className="mr-2 h-3 w-3" />Refresh Status</Button>
                  </div>
              </CardContent>
          </Card>
        </div>

        <AlertDialog open={showCardSyncConfirm} onOpenChange={setShowCardSyncConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Sync</AlertDialogTitle>
              <AlertDialogDescription>
                API has {remoteApiCardCount} cards. Local has {cardCount}. Proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleCardsSync}>Proceed</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
