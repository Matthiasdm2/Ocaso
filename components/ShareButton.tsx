"use client";
import { useCallback, useState } from "react";

interface ShareButtonProps {
  title: string;
  url?: string;
  showSocialMedia?: boolean;
}

export default function ShareButton({
  title,
  url,
  showSocialMedia = false
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title;

  const onShare = useCallback(() => {
    if (showSocialMedia) {
      setShowModal(true);
      return;
    }

    // Default behavior: native share or copy URL
    if (navigator.share) {
      navigator.share({ title: shareTitle, url: shareUrl }).catch(()=>{});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(()=>{
        setCopied(true);
        setTimeout(()=> setCopied(false), 1800);
      }).catch(()=>{});
    }
  }, [shareTitle, shareUrl, showSocialMedia]);

  const shareToSocialMedia = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(shareTitle);

    let shareLink = '';

    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case 'tiktok':
        navigator.clipboard?.writeText(shareUrl);
        shareLink = `https://www.tiktok.com/`;
        break;
      case 'instagram':
        // Instagram heeft geen web share intent; open homepage na kopiëren
        navigator.clipboard?.writeText(shareUrl);
        shareLink = `https://www.instagram.com/`;
        break;
      case 'copy':
        navigator.clipboard?.writeText(shareUrl).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
        setShowModal(false);
        return;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
      setShowModal(false);
    }
  };

  return (
    <>
      <button
        aria-label={copied ? 'Gekopieerd' : 'Deel'}
        onClick={onShare}
        className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/90 border border-gray-200 hover:bg-white shadow-sm transition relative"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="block">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <path d="M8.7 11.1l6.6-3.2M15.3 16.1l-6.6-3.2" strokeLinecap="round"/>
        </svg>
        {copied && <span className="absolute -bottom-6 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white">✔</span>}
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Deel dit zoekertje</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => shareToSocialMedia('facebook')}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-sm">f</span>
                </div>
                <span className="text-xs">Facebook</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('twitter')}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </div>
                <span className="text-xs">Twitter</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('whatsapp')}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                </div>
                <span className="text-xs">WhatsApp</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('tiktok')}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 8.5c-2.7 0-4.9-2.2-4.9-4.9V3h-3.4v12.2c0 1.7-1.4 3.1-3.1 3.1S6.5 16.9 6.5 15.2s1.4-3.1 3.1-3.1c.3 0 .7.1 1 .2V9.1c-.3 0-.6-.1-1-.1-3 0-5.5 2.5-5.5 5.5S6.6 20 9.6 20s5.5-2.5 5.5-5.5V8.8c1.1 1 2.6 1.7 4.2 1.7h.7V8.5H21z" />
                  </svg>
                </div>
                <span className="text-xs">TikTok</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('instagram')}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 2C4.239 2 2 4.239 2 7v10c0 2.761 2.239 5 5 5h10c2.761 0 5-2.239 5-5V7c0-2.761-2.239-5-5-5H7zm10 2a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h10zm-5 3a5 5 0 100 10 5 5 0 000-10zm0 2.2a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6zM17.5 6.5a1 1 0 100 2 1 1 0 000-2z" />
                  </svg>
                </div>
                <span className="text-xs">Instagram</span>
              </button>

              <button
                onClick={() => shareToSocialMedia('copy')}
                className="flex flex-col items-center p-3 rounded-lg hover:bg-gray-50 transition col-span-3"
              >
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-xs">Kopieer link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
