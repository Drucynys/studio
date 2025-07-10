// src/components/CollectionUploadDialog.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ListX } from "lucide-react";

interface CollectionUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CsvRow {
    name: string;
    set: string;
    cardNumber: string;
    quantity: number;
    value?: number;
    variant?: string;
    language?: 'English' | 'Japanese';
}

export function CollectionUploadDialog({ isOpen, onClose }: CollectionUploadDialogProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<CsvRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResult, setUploadResult] = useState<{ addedCount: number; notFoundCount: number; notFound: any[] } | null>(null);

    const resetState = () => {
        setFile(null);
        setParsedData([]);
        setIsParsing(false);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            handleParseCsv(selectedFile);
        }
    };

    const handleParseCsv = (csvFile: File) => {
        setIsParsing(true);
        setUploadResult(null);
        setParsedData([]);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            const headers = rows.shift()?.toLowerCase().split(',').map(h => h.trim().replace(/"/g, '')) || [];
            
            const requiredHeaders = ['name', 'set', 'cardNumber'];
            if (!requiredHeaders.every(h => headers.includes(h))) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid CSV format',
                    description: 'Your CSV must contain "name", "set", and "cardNumber" columns.',
                });
                setIsParsing(false);
                setFile(null);
                return;
            }

            const data = rows.map(row => {
                const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                const rowData: any = {};
                headers.forEach((header, index) => {
                    // Normalize cardnumber header
                    const normalizedHeader = header === 'cardnumber' ? 'cardNumber' : header;
                    rowData[normalizedHeader] = values[index];
                });
                return {
                    name: rowData.name,
                    set: rowData.set,
                    cardNumber: rowData.cardNumber,
                    quantity: parseInt(rowData.quantity, 10) || 1,
                    value: rowData.value ? parseFloat(rowData.value) : undefined,
                    variant: rowData.variant || undefined,
                    language: rowData.language === 'Japanese' ? 'Japanese' : 'English',
                };
            });
            setParsedData(data);
            setIsParsing(false);
        };
        
        reader.onerror = () => {
             toast({ variant: 'destructive', title: 'File Error', description: 'Could not read the selected file.' });
             setIsParsing(false);
        };
        
        reader.readAsText(csvFile);
    };
    
    const handleUpload = async () => {
        if (!user || parsedData.length === 0) return;
        
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/users/collection/upload-csv', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ cards: parsedData }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload collection.');
            }
            
            const result = await response.json();
            setUploadResult(result);
            toast({
                title: 'Upload Complete!',
                description: result.message,
            });

        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: err.message,
            });
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5"/> Upload Collection from CSV</DialogTitle>
                    <DialogDescription>
                        Import your collection by uploading a CSV file.
                        <br/>
                        <b>Required columns:</b> <code className="bg-muted px-1 py-0.5 rounded">name</code>, <code className="bg-muted px-1 py-0.5 rounded">set</code>, <code className="bg-muted px-1 py-0.5 rounded">cardNumber</code>.
                        <br/>
                        <b>Optional columns:</b> <code className="bg-muted px-1 py-0.5 rounded">quantity</code>, <code className="bg-muted px-1 py-0.5 rounded">variant</code>, <code className="bg-muted px-1 py-0.5 rounded">language</code>, <code className="bg-muted px-1 py-0.5 rounded">value</code>.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isParsing}
                        variant="outline"
                        className="w-full"
                    >
                        {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileText className="mr-2 h-4 w-4" />}
                        {file ? file.name : 'Choose a CSV file'}
                    </Button>
                    
                    {parsedData.length > 0 && !uploadResult && (
                        <Alert>
                            <AlertCircle className="h-4 w-4"/>
                            <AlertTitle>Ready to Upload</AlertTitle>
                            <AlertDescription>Found {parsedData.length} cards in your file. Click "Upload Collection" to start the import.</AlertDescription>
                        </Alert>
                    )}
                    
                    {isUploading && (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground text-center">Importing... Do not close this window.</p>
                            {/* This is a visual placeholder as we don't have real-time progress from the backend batch */}
                            <Progress value={50} className="w-full animate-pulse" />
                        </div>
                    )}
                    
                    {uploadResult && (
                       <Alert variant={uploadResult.notFoundCount > 0 ? "default" : "default"} className={uploadResult.notFoundCount === 0 ? 'border-green-300' : ''}>
                           {uploadResult.notFoundCount === 0 ? <CheckCircle className="h-4 w-4 text-green-500"/> : <AlertCircle className="h-4 w-4"/>}
                           <AlertTitle>Import Complete</AlertTitle>
                           <AlertDescription>
                               Successfully added {uploadResult.addedCount} cards.
                               {uploadResult.notFoundCount > 0 && (
                                   <>
                                    <br/>Could not find {uploadResult.notFoundCount} cards.
                                    <details className="text-xs mt-2">
                                        <summary className="cursor-pointer">View un-matched cards</summary>
                                        <ul className="list-disc pl-4 mt-1">
                                            {uploadResult.notFound.slice(0, 5).map((card: any, i: number) => (
                                                <li key={i}>{card.name} - {card.set} - {card.cardNumber}</li>
                                            ))}
                                            {uploadResult.notFound.length > 5 && <li>...and {uploadResult.notFound.length - 5} more.</li>}
                                        </ul>
                                    </details>
                                   </>
                               )}
                           </AlertDescription>
                       </Alert>
                    )}
                </div>
                
                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    <Button 
                        onClick={handleUpload} 
                        disabled={isUploading || isParsing || parsedData.length === 0}
                    >
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Upload Collection
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
