"use client";
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import BackBar from '@/components/BackBar';
import ListingCard from '@/components/ListingCard';

interface SearchResult {
  id: string;
  title: string;
  price: number | string;
  images: string[];
  main_photo: string | null;
  location: string | null;
  created_at: string;
  category_name?: string;
  subcategory_name?: string;
}

interface ApiResponse {
  success: boolean;
  recognized_category: string;
  search_terms: string[];
  results: SearchResult[];
  total_results: number;
  error?: string;
}

export default function ImageSearchPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recognizedCategory, setRecognizedCategory] = useState<string>('');
  const [searchTerms, setSearchTerms] = useState<string[]>([]);
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
      formData.append('image', selectedFile);

      const response = await fetch('/api/search/image', {
        method: 'POST',
        body: formData,
      });

      const data: ApiResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results);
      setRecognizedCategory(data.recognized_category);
      setSearchTerms(data.search_terms);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is iets misgegaan bij het zoeken');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedFile]);

  const resetSearch = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults([]);
    setRecognizedCategory('');
    setSearchTerms([]);
    setError(null);
  }, []);

  return (
    <div className="space-y-6">
      <BackBar />

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Zoek op foto (AI)</h1>
          <p className="text-gray-600">
            Upload een foto en vind vergelijkbare zoekertjes met behulp van AI-herkenning
          </p>
        </div>

        {/* Upload Section */}
        <div className="card p-6 md:p-8">
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
                    width={300}
                    height={300}
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">
                {results.length} vergelijkbare zoekertjes gevonden
              </h2>
              {recognizedCategory && (
                <p className="text-gray-600">
                  Erkend als: <span className="font-medium capitalize">{recognizedCategory}</span>
                  {searchTerms.length > 0 && (
                    <span className="ml-2">
                      (zoektermen: {searchTerms.slice(0, 3).join(', ')}{searchTerms.length > 3 ? '...' : ''})
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result) => (
                <ListingCard
                  key={result.id}
                  listing={{
                    id: result.id,
                    title: result.title,
                    price: typeof result.price === 'string' ? parseFloat(result.price) : result.price,
                    images: result.images,
                    created_at: result.created_at,
                    views: 0,
                    favorites_count: 0
                  }}
                />
              ))}
            </div>

            <div className="text-center">
              <Link
                href={`/search?q=${encodeURIComponent(searchTerms.join(' '))}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Bekijk alle resultaten
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}

        {/* No Results */}
        {results.length === 0 && !isSearching && selectedFile && !error && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Geen resultaten gevonden</h3>
            <p className="text-gray-600 mb-4">
              Probeer een andere foto of gebruik de tekstzoekfunctie
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Tekst zoeken
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
