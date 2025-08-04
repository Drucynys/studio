import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/firebase-admin';

export async function GET(
    request: Request,
    context: { params: { cardApiId: string } }
) {
    const { cardApiId } = context.params;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d'; // Default to 30 days

    if (!cardApiId) {
        return NextResponse.json({ message: 'Card API ID is required' }, { status: 400 });
    }

    try {
        const historyRef = dbAdmin.collection('priceHistory');

        let days;
        switch (range) {
            case '90d': days = 90; break;
            case '180d': days = 180; break;
            case '365d': days = 365; break;
            default: days = 30;
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Firestore query to get all records for the card within the date range
        const querySnapshot = await historyRef
            .where('cardApiId', '==', cardApiId)
            .where('date', '>=', startDate)
            .orderBy('date', 'asc') // Order by date ascending
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json([]);
        }

        const history = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                date: data.date.toDate().toISOString().split('T')[0], // Format date for client
            };
        });

        return NextResponse.json(history);
    } catch (error: any) {
        console.error(`Error fetching price history for ${cardApiId}:`, error);
        return NextResponse.json({ message: error.message || 'An unknown server error occurred.' }, { status: 500 });
    }
}
