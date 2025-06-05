
"use client";

// This page has been removed as part of scrapping TCGdex API integration.
export default function TcgDexSetDetailsPage() {
   if (typeof window !== 'undefined') {
    // Optional: Redirect to home or another page if accessed directly
    // window.location.href = '/';
  }
  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center p-4">
      <h1 className="text-2xl font-semibold text-destructive mb-4">Page Removed</h1>
      <p className="text-muted-foreground">The TCGdex API integration has been removed from this application.</p>
      <a href="/" className="mt-4 text-primary hover:underline">Go to Homepage</a>
    </div>
  );
}
