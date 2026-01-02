"use client";

import { useEffect, useState } from "react";

import { getBaseUrl } from "@/lib/getBaseUrl";
import { createClient } from "@/lib/supabaseClient";

export default function OAuthDebugPage() {
  const [info, setInfo] = useState<string[]>([]);
  const supabase = createClient();
  const siteUrl = getBaseUrl();

  useEffect(() => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
    const redirectTo = `${currentOrigin}/auth/callback`;
    
    const debugInfo = [
      `Current URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      `Window Origin: ${typeof window !== 'undefined' ? window.location.origin : 'N/A'}`,
      `getBaseUrl(): ${siteUrl}`,
      `Redirect To: ${redirectTo}`,
      `NEXT_PUBLIC_SITE_URL: ${process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET'}`,
      `NEXT_PUBLIC_BASE_URL: ${process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET'}`,
      `NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}`,
    ];
    
    setInfo(debugInfo);
  }, [siteUrl]);

  async function testOAuth(provider: "google" | "facebook") {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
    const redirectTo = `${currentOrigin}/auth/callback`;
    
    console.log(`[OAuth Debug] Testing ${provider} with redirectTo:`, redirectTo);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { 
        redirectTo,
      },
    });
    
    if (error) {
      setInfo(prev => [...prev, `ERROR: ${error.message}`]);
    } else if (data?.url) {
      setInfo(prev => [...prev, `Redirect URL: ${data.url}`]);
      // Don't redirect automatically, let user see the URL
    }
  }

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">OAuth Debug Page</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="font-semibold mb-2">Debug Info:</h2>
        <ul className="space-y-1 text-sm">
          {info.map((line, i) => (
            <li key={i} className="font-mono">{line}</li>
          ))}
        </ul>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => testOAuth("google")}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Google OAuth
        </button>
        <button
          onClick={() => testOAuth("facebook")}
          className="px-4 py-2 bg-blue-600 text-white rounded ml-4"
        >
          Test Facebook OAuth
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2">Checklist:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Controleer of de redirect URL overeenkomt met wat er in Supabase Dashboard staat</li>
          <li>Ga naar Supabase Dashboard → Authentication → URL Configuration</li>
          <li>Zorg dat &quot;Redirect URLs&quot; bevat: <code className="bg-gray-200 px-1">{typeof window !== 'undefined' ? window.location.origin : siteUrl}/auth/callback</code></li>
          <li>Voor Google: Zorg dat Google Cloud Console → Authorized redirect URIs bevat: <code className="bg-gray-200 px-1">https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback</code></li>
          <li>Voor Facebook: Zorg dat Facebook App → Valid OAuth Redirect URIs bevat: <code className="bg-gray-200 px-1">https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback</code></li>
        </ol>
      </div>
    </div>
  );
}

