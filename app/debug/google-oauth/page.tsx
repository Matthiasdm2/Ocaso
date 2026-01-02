"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { getBaseUrl } from "@/lib/getBaseUrl";

export default function GoogleOAuthDebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const supabase = createClient();
  const siteUrl = getBaseUrl();

  function addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[Google OAuth Debug] ${message}`);
  }

  async function testGoogleOAuth() {
    setLogs([]);
    setError(null);
    setOauthUrl(null);

    addLog("Starting Google OAuth test...");

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
    const redirectTo = `${currentOrigin}/auth/callback`;

    addLog(`Current origin: ${currentOrigin}`);
    addLog(`Site URL: ${siteUrl}`);
    addLog(`Redirect to: ${redirectTo}`);

    // Check environment variables
    addLog("Checking environment variables...");
    const envVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET',
    };
    addLog(`NEXT_PUBLIC_SUPABASE_URL: ${envVars.NEXT_PUBLIC_SUPABASE_URL}`);
    addLog(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
    addLog(`NEXT_PUBLIC_SITE_URL: ${envVars.NEXT_PUBLIC_SITE_URL}`);

    try {
      addLog("Calling supabase.auth.signInWithOAuth...");
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        addLog(`❌ Error: ${oauthError.message}`);
        addLog(`Error name: ${oauthError.name}`);
        addLog(`Error status: ${oauthError.status}`);
        setError(`OAuth Error: ${oauthError.message}`);
        
        // Provide specific guidance based on error
        if (oauthError.message.includes('not enabled')) {
          setError(`OAuth Error: Google is not enabled in Supabase Dashboard. Go to Authentication → Providers → Google and enable it.`);
        } else if (oauthError.message.includes('redirect')) {
          setError(`OAuth Error: Redirect URL issue. Check that ${redirectTo} is in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs`);
        } else if (oauthError.message.includes('client')) {
          setError(`OAuth Error: Client ID/Secret issue. Check Google Cloud Console and Supabase Dashboard → Authentication → Providers → Google`);
        }
        return;
      }

      if (!data?.url) {
        addLog("❌ No redirect URL received");
        setError("No redirect URL received from Supabase. Check that Google OAuth is enabled and configured correctly.");
        return;
      }

      addLog(`✅ OAuth URL received: ${data.url}`);
      
      // Parse URL
      const url = new URL(data.url);
      addLog(`Hostname: ${url.hostname}`);
      addLog(`Pathname: ${url.pathname}`);
      addLog(`Provider param: ${url.searchParams.get('provider')}`);
      addLog(`Redirect to param: ${url.searchParams.get('redirect_to')}`);
      
      setOauthUrl(data.url);
      addLog("✅ Test completed successfully. Click 'Open OAuth URL' to test the redirect.");

    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addLog(`❌ Exception: ${errorMessage}`);
      setError(`Exception: ${errorMessage}`);
    }
  }

  function openOAuthUrl() {
    if (oauthUrl) {
      addLog("Opening OAuth URL in new window...");
      window.open(oauthUrl, '_blank', 'width=500,height=600');
    }
  }

  function redirectToOAuthUrl() {
    if (oauthUrl) {
      addLog("Redirecting to OAuth URL...");
      window.location.href = oauthUrl;
    }
  }

  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Google OAuth Debug Tool</h1>

      <div className="space-y-4">
        <button
          onClick={testGoogleOAuth}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Google OAuth
        </button>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="font-semibold text-red-800">{error}</p>
          </div>
        )}

        {oauthUrl && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <p className="font-semibold text-green-800 mb-2">✅ OAuth URL Generated</p>
            <div className="space-x-2">
              <button
                onClick={openOAuthUrl}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Open OAuth URL (Popup)
              </button>
              <button
                onClick={redirectToOAuthUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Redirect to OAuth URL
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Expected: Redirect to Google login page<br />
              If you stay on Supabase page: Google OAuth not configured correctly
            </p>
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h2 className="font-semibold mb-2">Debug Logs:</h2>
            <div className="bg-black text-green-400 p-3 rounded font-mono text-xs max-h-96 overflow-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h2 className="font-semibold mb-2">Checklist:</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Supabase Dashboard → Authentication → Providers → Google → Enabled: AAN</li>
            <li>Supabase Dashboard → Authentication → Providers → Google → Client ID: Ingevuld</li>
            <li>Supabase Dashboard → Authentication → Providers → Google → Client Secret: Ingevuld</li>
            <li>Supabase Dashboard → Authentication → Providers → Google → SAVE geklikt</li>
            <li>Google Cloud Console → OAuth 2.0 Client ID → Authorized redirect URIs: https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback</li>
            <li>Google Cloud Console → OAuth Consent Screen → Published of Testing mode</li>
            <li>Supabase Dashboard → Authentication → URL Configuration → Site URL: http://localhost:3000</li>
            <li>Supabase Dashboard → Authentication → URL Configuration → Redirect URLs: http://localhost:3000/auth/callback</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <h2 className="font-semibold mb-2">Direct Links:</h2>
          <ul className="space-y-1 text-sm">
            <li>
              <a href="https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/providers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Supabase Dashboard → Providers
              </a>
            </li>
            <li>
              <a href="https://supabase.com/dashboard/project/dmnowaqinfkhovhyztan/auth/url-configuration" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Supabase Dashboard → URL Configuration
              </a>
            </li>
            <li>
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Google Cloud Console → Credentials
              </a>
            </li>
            <li>
              <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Google Cloud Console → OAuth Consent Screen
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

