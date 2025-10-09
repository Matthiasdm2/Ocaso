"use client";
import { X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';

type LegacyApiResponse = {
  success: boolean;
  ids?: string[];
  compared?: number;
  search_terms: string[];
  error?: string;
  message?: string;
};

type ImageSearchHit = {
  score: number;
  listing_id?: string;
  image_url?: string;
};

type ServiceApiResponse = {
  ok: boolean;
  results?: ImageSearchHit[];
  error?: string;
};

type CombinedResponse = LegacyApiResponse | ServiceApiResponse;

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageSearchModal({ isOpen, onClose }: ImageSearchModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleCameraCapture = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera on mobile
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  }, [handleFileSelect]);

  const handleFileUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  }, [handleFileSelect]);

  const performSearch = useCallback(async () => {
    if (!selectedFile) return;

    setIsSearching(true);
    setError(null);

    try {
      const formData = new FormData();
  formData.append('file', selectedFile);

  const response = await fetch('/api/search/by-image', {
        method: 'POST',
        body: formData,
      });

  const data: CombinedResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      // Redirect to search page prioritizing visual matches (ids)
      if ('ids' in data && Array.isArray(data.ids) && data.ids.length > 0) {
        const idsParam = encodeURIComponent((data.ids as string[]).join(','));
        window.location.href = `/search?ids=${idsParam}`;
        return;
      }

      // Map image-search service response to ids if available
      if ('ok' in data && data.ok && Array.isArray(data.results) && data.results.length > 0) {
        const ids = (data.results as ImageSearchHit[])
          .map((r) => r.listing_id)
          .filter((x): x is string => typeof x === 'string');
        if (ids.length > 0) {
          const idsParam = encodeURIComponent(ids.join(','));
          window.location.href = `/search?ids=${idsParam}`;
          return;
        }
      }

      // Fallback: recognized terms
  if ('search_terms' in data && Array.isArray(data.search_terms) && data.search_terms.length > 0) {
        const searchQuery = data.search_terms.join(' ');
        window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
        return;
      }

      // Fallback if no search terms found
      window.location.href = '/search';

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan bij het zoeken');
    } finally {
      setIsSearching(false);
    }
  }, [selectedFile]);

  const resetSearch = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetSearch();
    onClose();
  }, [resetSearch, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Zoek op foto (AI)</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <p className="text-gray-600">
                Upload een foto en vind vergelijkbare zoekertjes met behulp van AI-herkenning
              </p>
            </div>

            {/* Upload Section */}
            <div className="card p-6 mb-6">
              {!selectedFile ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-4">
                          Sleep een foto hierheen of kies een optie hieronder
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <button
                            onClick={handleCameraCapture}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Neem foto
                          </button>
                          <button
                            onClick={handleFileUpload}
                            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            Upload foto
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Image Preview */}
                  <div className="text-center">
                    <div className="relative inline-block">
                      <Image
                        src={previewUrl!}
                        alt="Upload preview"
                        width={250}
                        height={250}
                        className="rounded-lg object-cover max-w-full h-auto"
                      />
                      <button
                        onClick={resetSearch}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition"
                        title="Verwijder foto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </p>
                  </div>

                  {/* Search Button */}
                  <div className="text-center">
                    <button
                      onClick={performSearch}
                      disabled={isSearching}
                      className="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isSearching ? (
                        <div className="flex items-center gap-2">
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Bezig met zoeken...
                        </div>
                      ) : (
                        'Zoek vergelijkbare zoekertjes'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-6">
                <p className="text-red-700">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
