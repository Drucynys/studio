
import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';
import type { PokemonCard } from '@/types';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.length < 3) {
            return NextResponse.json({ message: 'Search query must be at least 3 characters long.' }, { status: 400 });
        }

        const lowercasedQuery = query.toLowerCase();
        const usersRef = dbAdmin.collection('users');
        
        // This is a simple "starts with" search on the case-insensitive field.
        const usersSnapshot = await usersRef
            .where('displayName_lowercase', '>=', lowercasedQuery)
            .where('displayName_lowercase', '<=', lowercasedQuery + '\uf8ff')
            .limit(10)
            .get();

        if (usersSnapshot.empty) {
            return NextResponse.json([]);
        }

        const usersWithCollections = await Promise.all(
            usersSnapshot.docs.map(async (userDoc) => {
                const userData = userDoc.data();
                let collectionPreview: PokemonCard[] = [];

                // Check privacy settings before showing collection
                if (userData.followSetting === 'everyone') {
                    const cardsSnapshot = await dbAdmin.collection('users').doc(userData.uid).collection('cards')
                        .orderBy('timestamp', 'desc')
                        .limit(5)
                        .get();
                    
                    collectionPreview = cardsSnapshot.docs.map(doc => doc.data() as PokemonCard);
                }

                return {
                    uid: userData.uid,
                    displayName: userData.displayName,
                    followSetting: userData.followSetting, // Pass this to the client
                    collectionPreview,
                };
            })
        );
        
        return NextResponse.json(usersWithCollections);

    } catch (error: any) {
        console.error('Error searching users:', error);
        return NextResponse.json(
            { message: error.message || 'An unknown server error occurred.' },
            { status: 500 }
        );
    }
}
