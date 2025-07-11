
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

// Duplicating this init function as it's not exported from other routes
function initializeFirebaseAdmin() {
    if (admin.apps.length > 0) { return; }
    const serviceAccountJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!serviceAccountJson || !projectId) {
        throw new Error("Firebase credentials or Project ID are not set in environment variables.");
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (serviceAccount.private_key) {
        const serviceAccount = JSON.parse(serviceAccountJson);
if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}
    }
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
    });
}

async function runFullDataResync(baseUrl: string) {
    const logs: string[] = ["🚀 Starting automated full data resynchronization..."];
    
    const postRequestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    };

    try {
        // Step 1: Sync Sets
        logs.push("\n[Step 1/3] Syncing latest set list...");
        const setsResponse = await fetch(`${baseUrl}/api/sync-sets`, postRequestOptions);
        if (!setsResponse.ok) throw new Error(`Set sync failed with status ${setsResponse.status}`);
        const setsResult = await setsResponse.json();
        logs.push(...(setsResult.logs || []));
        logs.push(`✅ Set sync complete. Found ${setsResult.count} sets.`);

        // Step 2: Sync All Cards
        logs.push("\n[Step 2/3] Starting full card database sync...");
        const setsToSyncResponse = await fetch(`${baseUrl}/api/sets`);
        if (!setsToSyncResponse.ok) throw new Error(`Failed to fetch set list for card sync: ${setsToSyncResponse.statusText}`);
        const setsToSync: { id: string; name: string }[] = await setsToSyncResponse.json();
        if (setsToSync.length === 0) throw new Error('No sets found in database to sync cards from.');

        let cumulativeCardCount = 0;
        for (const currentSet of setsToSync) {
            logs.push(`\n[${setsToSync.indexOf(currentSet) + 1}/${setsToSync.length}] Syncing set: ${currentSet.name} (${currentSet.id})`);
            const syncCardResponse = await fetch(`${baseUrl}/api/sync-cards`, {
                ...postRequestOptions,
                body: JSON.stringify({ setId: currentSet.id }),
            });
            if (!syncCardResponse.ok) throw new Error(`Failed to sync cards for set ${currentSet.id}`);
            const syncResult = await syncCardResponse.json();
            logs.push(...(syncResult.logs || []));
            cumulativeCardCount += syncResult.count || 0;
        }
        logs.push(`\n✅ Card sync complete! Total cards processed: ${cumulativeCardCount}.`);

        // Step 3: Sync Artists
        logs.push("\n[Step 3/3] Generating artist database...");
        const artistsResponse = await fetch(`${baseUrl}/api/artists`, postRequestOptions);
        if (!artistsResponse.ok) throw new Error(`Artist database generation failed.`);
        const artistsResult = await artistsResponse.json();
        logs.push(...(artistsResult.logs || []));
        logs.push(`✅ Artist sync complete. Found ${artistsResult.count} artists.`);
        
        logs.push("\n🎉🎉🎉 Automated data resynchronization complete!");
        console.log(logs.join('\n'));
        return { success: true, logs };

    } catch (err: any) {
        logs.push(`❌ FATAL ERROR: ${err.message}`);
        console.error('Automated sync failed:', logs.join('\n'));
        throw err; // Re-throw to be caught by the main handler
    }
}

export async function GET(request: Request) {
    // 1. Protect the route
    const CRON_SECRET = process.env.CRON_SECRET;
    if (!CRON_SECRET) {
        return NextResponse.json({ status: 'error', message: 'CRON_SECRET environment variable is not set.' }, { status: 500 });
    }
    
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        initializeFirebaseAdmin();
        const db = getFirestore();
        
        // 2. Fetch local set count
        const setsCollection = db.collection('pokemon-tcg-sets');
        const localSetsCount = (await setsCollection.count().get()).data().count;

        // 3. Fetch remote set count from TCG API
        const apiKey = process.env.NEXT_PUBLIC_POKEMONTCG_API_KEY;
        if (!apiKey) throw new Error("Pokémon TCG API key is missing.");
        
        const response = await axios.get('https://api.pokemontcg.io/v2/sets', {
            headers: { 'X-Api-Key': apiKey },
            params: { pageSize: 1 } // We only need the totalCount
        });
        const remoteSetsCount = response.data.totalCount;

        // 4. Compare counts
        if (localSetsCount >= remoteSetsCount) {
            console.log(`Automated check: No new sets found. Local: ${localSetsCount}, Remote: ${remoteSetsCount}.`);
            return NextResponse.json({ 
                status: 'noop', 
                message: `Database is already up to date with sets. Local count: ${localSetsCount}, Remote count: ${remoteSetsCount}.` 
            });
        }

        console.log(`Automated check: New sets found! Local: ${localSetsCount}, Remote: ${remoteSetsCount}. Triggering full sync.`);
        
        // 5. Trigger the full resync
        const baseUrl = new URL(request.url).origin;
        await runFullDataResync(baseUrl);
        
        return NextResponse.json({ status: 'success', message: 'New sets found. Full data resynchronization triggered and completed successfully.' });

    } catch (error: any) {
        console.error('Cron job failed:', error);
        return NextResponse.json(
            { status: 'error', message: `Cron job failed: ${error.message}` },
            { status: 500 }
        );
    }
}
