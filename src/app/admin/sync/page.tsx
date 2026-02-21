"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle, Database, RefreshCcw, Sparkles } from "lucide-react";
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches data from internal API and ensures JSON response.
 * Handles platform-level HTML errors (504/502).
 */
async function safeFetch(url: string, options?: RequestInit) {
    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type');
        
        if (response.status === 504) {
            throw new Error("Gateway Timeout (504). The server took too long to respond. This usually happens when the external TCG API is slow.");
        }
        if (response.status === 502) {
            throw new Error("Bad Gateway (502). The server is temporarily unavailable.");
        }

        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.status === 'error') {
                throw new Error(data.message || "Unknown backend error");
            }
            return data;
        }
        
        throw new Error(`Server returned unexpected format (${response.status}).`);
    } catch (err: any) {
        return { status: 'error', message: err.message };
    }
}

export default function SyncAdminPage() {
  const [setCount, setSetCount] = useState<number | null>(null);
  const [cardCount, setCardCount] = useState<number | null>(null);
  const [artistCount, setArtistCount] = useState<number | null>(null);
  const [pokedexCount, setPokedexCount] = useState<number | null>(null);
  
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  const { toast } = useToast();

  const isSyncStopped = useRef(false);
  const [masterSyncStatus, setMasterSyncStatus] = useState<SyncStatus>('idle');
  const [masterSyncLogs, setMasterSyncLogs] = useState<string[]>([]);
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

  const addLog = (msg: string) => {
    setMasterSyncLogs(prev => [...prev, msg]);
  };

  /**
   * Helper to perform a fetch with retries for resilient sync
   */
  const fetchWithRetry = async (url: string, options?: RequestInit, maxRetries = 3): Promise<any> => {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
        const result = await safeFetch(url, options);
        if (result.status !== 'error') {
            return result;
        }
        lastError = new Error(result.message);
        const isTimeout = result.message?.toLowerCase().includes('timeout');
        
        if (isTimeout && i < maxRetries - 1) {
            const waitTime = (i + 1) * 3000; // Increased retry delay
            addLog(`⚠️ Attempt ${i + 1} timed out. Retrying in ${waitTime/1000}s...`);
            await sleep(waitTime);
            continue;
        }
        break;
    }
    throw lastError;
  };

  const handleFullResync = async () => {
    setMasterSyncStatus('in-progress');
    setMasterSyncLogs(['🚀 Starting granular data resynchronization...']);
    setMasterSyncProgress(0);
    isSyncStopped.current = false;

    try {
        // Step 1: Granular Set Discovery
        const PAGE_SIZE = 25; 
        setMasterSyncCurrentStep("Step 1/3: Discovering latest sets...");
        addLog(`\n[Step 1/3] Fetching expansion list from TCG API in pages (${PAGE_SIZE} per page)...`);
        
        let allDiscoveredSets: any[] = [];
        let page = 1;
        let totalSetsCount = 0;

        while (true) {
            if (isSyncStopped.current) break;
            
            setMasterSyncCurrentStep(`Discovering sets (Page ${page})...`);
            const discoveryResult = await fetchWithRetry('/api/sync-sets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'discover', page, pageSize: PAGE_SIZE }),
            });

            allDiscoveredSets.push(...(discoveryResult.data || []));
            totalSetsCount = discoveryResult.totalCount || 0;
            
            addLog(`✅ Discovered ${allDiscoveredSets.length} / ${totalSetsCount} sets.`);

            if (allDiscoveredSets.length >= totalSetsCount || !discoveryResult.data?.length) {
                break;
            }
            page++;
            await sleep(1000); // 1-second pause between requests
        }

        if (isSyncStopped.current) throw new Error("Sync stopped by user.");

        // Step 1.1: Save Discovery Results
        setMasterSyncCurrentStep("Step 1.1/3: Saving expansion list to database...");
        await fetchWithRetry('/api/sync-sets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save', sets: allDiscoveredSets }),
        });

        addLog(`✅ Successfully saved ${allDiscoveredSets.length} expansions.`);
        setMasterSyncProgress(10);
        await checkDbStatus();
        await sleep(1000);

        // Step 2: Sync All Cards
        setMasterSyncCurrentStep("Step 2/3: Populating card database...");
        addLog("\n[Step 2/3] Starting full card population loop...");
        
        const localSets = await safeFetch('/api/sets');
        if (!Array.isArray(localSets)) throw new Error("Could not retrieve local sets list.");

        let cumulativeCardCount = 0;
        for (let i = 0; i < localSets.length; i++) {
            if (isSyncStopped.current) break;
            const currentSet = localSets[i];
            const progress = 10 + ((i + 1) / localSets.length) * 80;
            setMasterSyncProgress(progress);
            setMasterSyncCurrentStep(`Syncing: ${currentSet.name} (${i + 1}/${localSets.length})`);
            
            try {
                const syncResult = await fetchWithRetry('/api/sync-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ setId: currentSet.id }),
                });
                
                if (syncResult.status !== 'error') {
                    cumulativeCardCount += syncResult.count || 0;
                    addLog(`✅ ${currentSet.name}: +${syncResult.count} cards`);
                } else {
                    addLog(`⚠️ ${currentSet.name}: ${syncResult.message}`);
                }
            } catch (err: any) {
                addLog(`⚠️ Failed ${currentSet.name}: ${err.message}. Skipping...`);
            }
            
            await sleep(1000); // 1-second pause between sets
        }
        
        addLog(`\n✅ Card population complete! Total cards processed: ${cumulativeCardCount}.`);
        await checkDbStatus();

        // Step 3: Rebuild Artist Index
        setMasterSyncCurrentStep("Step 3/3: Rebuilding artist index...");
        addLog("\n[Step 3/3] Aggregating unique illustrators...");
        const artistsResult = await fetchWithRetry('/api/artists', { method: 'POST' });
        if (artistsResult.logs) setMasterSyncLogs(prev => [...prev, ...artistsResult.logs]);
        
        setMasterSyncProgress(100);
        setMasterSyncCurrentStep("Resynchronization Completed Successfully!");
        setMasterSyncStatus('success');
        toast({ title: "Full Sync Complete", description: "Database is now fully up to date." });

    } catch (err: any) {
        setMasterSyncStatus('error');
        addLog(`❌ FATAL ERROR: ${err.message}`);
        toast({ variant: "destructive", title: "Resync Failed", description: err.message });
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
                    Resilient iterative synchronization with 1-second delays to respect API rate limits.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center">
                    <Button 
                        onClick={handleFullResync} 
                        disabled={masterSyncStatus === 'in-progress'} 
                        size="lg" 
                        className="w-full sm:w-auto"
                    >
                        {masterSyncStatus === 'in-progress' ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Syncing ({masterSyncProgress.toFixed(0)}%)...</>
                        ) : 'Start Full Resync'}
                    </Button>
                    {masterSyncStatus === 'in-progress' && (
                        <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium text-primary animate-pulse">{masterSyncCurrentStep}</p>
                            <Button variant="outline" size="sm" onClick={() => { isSyncStopped.current = true; }}>Stop Process</Button>
                        </div>
                    )}
                </div>

                {masterSyncStatus !== 'idle' && (
                    <div className="space-y-4">
                        <Progress value={masterSyncProgress} className="w-full" />
                        {masterSyncStatus === 'success' && (
                            <Alert className="border-green-200 bg-green-50 text-green-900">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertTitle>Full Resync Successful!</AlertTitle>
                              <AlertDescription>Your database is completely populated.</AlertDescription>
                            </Alert>
                          )}
                          <Card className="bg-muted/50">
                            <CardHeader className="py-2"><CardTitle className="text-sm">Process Logs</CardTitle></CardHeader>
                            <CardContent className="p-2">
                              <ScrollArea className="h-64 w-full rounded-md border p-2 bg-background">
                                <pre className="text-xs font-mono whitespace-pre-wrap">{masterSyncLogs.join('\n')}</pre>
                              </ScrollArea>
                            </CardContent>
                          </Card>
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
      </main>
    </div>
  );
}
