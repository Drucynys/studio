
"use client";

import React, { useState, useRef } from "react";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

// Assume Firebase is already initialized elsewhere in the app
// import firebaseApp from "@/lib/firebase"; // Example import

interface CardScannerCameraUploadProps {
  onUploadSuccess?: (downloadUrl: string) => void;
  onUploadError?: (error: Error) => void;
}

const CardScannerCameraUpload: React.FC<CardScannerCameraUploadProps> = ({
  onUploadSuccess,
  onUploadError,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadProgress(0);
      setDownloadUrl(null);
      setError(null);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
      setDownloadUrl(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setUploadProgress(0);

    const storage = getStorage(); // Use the default Firebase app storage
    const storageRef = ref(storage, `pokemon-card-scans/${selectedFile.name}`);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setError("Upload failed. Please try again.");
        setIsLoading(false);
        if (onUploadError) {
          onUploadError(error);
        }
      },
      async () => {
        // Upload completed successfully, now get the download URL
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setDownloadUrl(url);
          setIsLoading(false);
          if (onUploadSuccess) {
            onUploadSuccess(url);
          }
        } catch (error: any) {
          console.error("Failed to get download URL:", error);
          setError("Upload successful, but failed to get download URL.");
          setIsLoading(false);
          if (onUploadError) {
            onUploadError(error);
          }
        }
      }
    );
  };

  // Clean up preview URL when component unmounts or file changes
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);


  return (
    <div className="flex flex-col items-center justify-center p-4 border rounded-md">
      <input
        type="file"
        accept="image/*"
        capture="environment" // Use the rear camera
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="mb-4"
        disabled={isLoading}
      >
        {isLoading ? (
           <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
           </>
        ) : (
          "Take Photo or Select Image"
        )}
      </Button>

      {previewUrl && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Preview:</h3>
          <img src={previewUrl} alt="Preview" className="max-w-full h-auto rounded-md" />
        </div>
      )}

      {selectedFile && !downloadUrl && (
        <Button onClick={handleUpload} disabled={isLoading || uploadProgress > 0} className="mb-4">
           {isLoading ? (
            <>
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
             Uploading... ({uploadProgress.toFixed(0)}%)
            </>
           ) : (
            "Upload Image"
           )}
        </Button>
      )}

       {isLoading && uploadProgress > 0 && (
         <div className="w-full mb-4">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-center mt-2">{uploadProgress.toFixed(0)}% Uploaded</p>
         </div>
       )}


      {downloadUrl && (
        <div className="mt-4 text-center">
          <h3 className="text-lg font-semibold mb-2">Download URL:</h3>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline break-all">
            {downloadUrl}
          </a>
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-500">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default CardScannerCameraUpload;
