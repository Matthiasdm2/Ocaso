"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { getBaseUrl } from "@/lib/getBaseUrl";

export default function TestOAuthPage() {
  const [status, setStatus] = useState<string>("");
  const [details, setDetails] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const supabase = createClient();
  const siteUrl = getBaseUrl();

  async function testOAuthFlow(provider: "google" | "facebook") {
    setStatus(`Testing ${provider}...`);
    setDetails(null);

    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : siteUrl;
    const redirectTo = `${currentOrigin}/auth/callback`;

    const testInfo = {
      timestamp: new Date().toISOString(),
      provider,
      currentOrigin,
      siteUrl,
      redirectTo,
      windowLocation: typeof window !== 'undefined' ? window.location.href : 'N/A',
    };

    console.log(`[OAuth Test] Starting test for ${provider}:`, testInfo);
    setDetails(testInfo);
    setStatus(`Calling signInWithOAuth for ${provider}...`);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setStatus(`❌ ${provider} Error: ${error.message}`);
        setDetails({
          ...testInfo,
          error: {
            message: error.message,
            status: error.status,
            name: error.name,
          },
        });
        return { provider, error, data: null };
      }

      if (!data?.url) {
        setStatus(`❌ ${provider}: No redirect URL received`);
        setDetails({
          ...testInfo,
          warning: "No URL returned from signInWithOAuth",
        });
        return { provider, error: null, data: null };
      }

      // Parse the URL to check its components
      const url = new URL(data.url);
      const urlDetails = {
        fullUrl: data.url,
        hostname: url.hostname,
        pathname: url.pathname,
        provider: url.searchParams.get('provider'),
        redirectToParam: url.searchParams.get('redirect_to'),
        allParams: Object.fromEntries(url.searchParams.entries()),
      };

      setStatus(`✅ ${provider}: OAuth URL generated successfully`);
      setDetails({
        ...testInfo,
        oauthUrl: urlDetails,
        nextStep: "Click the button below to test the actual redirect",
      });
      return { provider, error: null, data: urlDetails };
    } catch (e) {
      setStatus(`❌ ${provider} Exception: ${e instanceof Error ? e.message : String(e)}`);
      setDetails({
        ...testInfo,
        exception: e instanceof Error ? e.message : String(e),
      });
      return { provider, error: e, data: null };
    }
  }

  async function compareProviders() {
    setStatus("Comparing Google vs Facebook...");
    setComparison(null);

    const googleResult = await testOAuthFlow("google");
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    const facebookResult = await testOAuthFlow("facebook");

    const comparisonResult = {
      google: {
        hasUrl: !!googleResult.data,
        hasError: !!googleResult.error,
        errorMessage: googleResult.error?.message,
        url: googleResult.data?.fullUrl,
      },
      facebook: {
        hasUrl: !!facebookResult.data,
        hasError: !!facebookResult.error,
        errorMessage: facebookResult.error?.message,
        url: facebookResult.data?.fullUrl,
      },
      difference: {
        googleWorks: !!googleResult.data && !googleResult.error,
        facebookWorks: !!facebookResult.data && !facebookResult.error,
        bothWork: !!googleResult.data && !!facebookResult.data && !googleResult.error && !facebookResult.error,
      },
    };

    setComparison(comparisonResult);
    
    if (comparisonResult.difference.facebookWorks && !comparisonResult.difference.googleWorks) {
      setStatus("⚠️ Facebook werkt, maar Google niet. Dit wijst op een Google-specifieke configuratie probleem.");
    } else if (comparisonResult.difference.bothWork) {
      setStatus("✅ Beide providers werken correct!");
    }
  }

  function openOAuthUrl(url: string) {
    if (url) {
      window.location.href = url;
    }
  }

  return (
    <div className="container py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">OAuth Flow Test & Comparison</h1>

      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={() => testOAuthFlow("google")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Google
          </button>
          <button
            onClick={() => testOAuthFlow("facebook")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Facebook
          </button>
          <button
            onClick={compareProviders}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Compare Both
          </button>
        </div>

        {status && (
          <div className={`p-4 rounded ${
            status.startsWith('✅') ? 'bg-green-50 border border-green-200' :
            status.startsWith('❌') ? 'bg-red-50 border border-red-200' :
            status.startsWith('⚠️') ? 'bg-yellow-50 border border-yellow-200' :
            'bg-gray-50 border border-gray-200'
          }`}>
            <p className="font-semibold">{status}</p>
          </div>
        )}

        {comparison && (
          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <h2 className="font-semibold mb-2">Comparison Results:</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Google:</h3>
                <ul className="text-sm space-y-1">
                  <li>{comparison.google.hasUrl ? '✅' : '❌'} URL generated</li>
                  <li>{comparison.google.hasError ? '❌' : '✅'} No errors</li>
                  {comparison.google.errorMessage && (
                    <li className="text-red-600">Error: {comparison.google.errorMessage}</li>
                  )}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold">Facebook:</h3>
                <ul className="text-sm space-y-1">
                  <li>{comparison.facebook.hasUrl ? '✅' : '❌'} URL generated</li>
                  <li>{comparison.facebook.hasError ? '❌' : '✅'} No errors</li>
                  {comparison.facebook.errorMessage && (
                    <li className="text-red-600">Error: {comparison.facebook.errorMessage}</li>
                  )}
                </ul>
              </div>
            </div>
            {comparison.difference.facebookWorks && !comparison.difference.googleWorks && (
              <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded">
                <p className="font-semibold text-yellow-800">⚠️ Google Configuration Issue Detected</p>
                <p className="text-sm text-yellow-700 mt-2">
                  Facebook werkt, maar Google niet. Dit betekent dat:
                </p>
                <ul className="text-sm text-yellow-700 list-disc list-inside mt-2 space-y-1">
                  <li>Supabase configuratie werkt (want Facebook werkt)</li>
                  <li>Het probleem is specifiek voor Google OAuth</li>
                  <li>Mogelijke oorzaken:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>Google Client ID/Secret zijn incorrect in Supabase Dashboard</li>
                      <li>Google OAuth is niet enabled in Supabase Dashboard</li>
                      <li>Google Cloud Console heeft verkeerde redirect URI</li>
                      <li>Google OAuth consent screen is niet correct geconfigureerd</li>
                    </ul>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {details && (
          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h2 className="font-semibold mb-2">Test Details:</h2>
            <pre className="text-xs overflow-auto bg-white p-3 rounded border">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        )}

        {details?.oauthUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h2 className="font-semibold mb-2">Next Step:</h2>
            <p className="mb-4">
              Click the button below to test the actual OAuth redirect.
              You should be redirected to {details.provider === 'google' ? 'Google' : 'Facebook'} (not stay on Supabase page).
            </p>
            <button
              onClick={() => openOAuthUrl(details.oauthUrl.fullUrl)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Open {details.provider === 'google' ? 'Google' : 'Facebook'} OAuth URL
            </button>
            <p className="mt-2 text-sm text-gray-600">
              Expected: Redirect to {details.provider === 'google' ? 'Google' : 'Facebook'} login page<br />
              If you stay on Supabase page: {details.provider === 'google' ? 'Google' : 'Facebook'} OAuth not configured correctly
            </p>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h2 className="font-semibold mb-2">Google-Specific Troubleshooting:</h2>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Check Supabase Dashboard → Authentication → Providers → Google:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Enabled toggle moet AAN staan (groen)</li>
                <li>Client ID moet ingevuld zijn (geen spaties voor/na)</li>
                <li>Client Secret moet ingevuld zijn (geen spaties voor/na)</li>
                <li>Klik op SAVE na het invullen</li>
              </ul>
            </li>
            <li><strong>Check Google Cloud Console:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>OAuth 2.0 Client ID → Authorized redirect URIs</li>
                <li>Moet bevatten: <code className="bg-gray-100 px-1 rounded">https://dmnowaqinfkhovhyztan.supabase.co/auth/v1/callback</code></li>
                <li>Geen trailing slash!</li>
              </ul>
            </li>
            <li><strong>Check Google OAuth Consent Screen:</strong>
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Moet gepubliceerd zijn of in "Testing" mode</li>
                <li>Als Testing: voeg jezelf toe als test user</li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
