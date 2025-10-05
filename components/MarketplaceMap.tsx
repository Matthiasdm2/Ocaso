"use client";
/* eslint-disable import/no-named-as-default-member, simple-import-sort/imports */

// Side-effect & style imports (order matters for CSS)
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet/dist/leaflet.css";

// Framework & libs
import type { LatLng, Layer, LeafletEvent, Map as LeafletMap, Rectangle as LeafletRectangle } from "leaflet";
import L from "leaflet";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle as LeafletCircle, Marker as LeafletMarker, Popup as LeafletPopup, MapContainer, TileLayer } from "react-leaflet";

// Prevent default icon issues in Leaflet when using webpack
// (Leaflet tries to load images from relative paths)
// We'll inline a simple circle marker instead of default icon.
const markerHtmlStyles = (color: string) => `
  background-color: ${color};
  width: 14px;
  height: 14px;
  display: block;
  left: -7px;
  top: -7px;
  position: relative;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 2px rgba(0,0,0,0.4);
`;

function simpleDivIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<span style="${markerHtmlStyles(color)}" />`,
    iconSize: [14, 14],
  });
}

type MapListing = {
  id: string;
  title: string;
  price?: number;
  latitude?: number | null;
  longitude?: number | null;
  location?: string | null;
};

type Props = {
  listings: MapListing[];
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
};


export default function MarketplaceMap({ listings, centerLat, centerLng, radiusKm }: Props) {
  const [hydrated, setHydrated] = useState(false);
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [pluginReady, setPluginReady] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  useEffect(() => setHydrated(true), []);

  // Dynamisch leaflet-draw laden (vermijdt "L is not defined" bij SSR bundling)
  useEffect(() => {
    if (typeof window === 'undefined') return;
  (window as Window & { L: typeof L }).L = L; // expose voor plugin
    let cancelled = false;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - module decl aanwezig in custom d.ts
  import('leaflet-draw')
      .then(() => { if (!cancelled) setPluginReady(true); })
      .catch(err => { console.error('[MarketplaceMap] Fout laden leaflet-draw', err); });
    return () => { cancelled = true; };
  }, []);
  const center: [number, number] | undefined = useMemo(() => {
    if (typeof centerLat === 'number' && typeof centerLng === 'number') return [centerLat, centerLng];
    // fallback: average of listing coords
    const coords = listings.filter(l => typeof l.latitude === 'number' && typeof l.longitude === 'number');
    if (coords.length) {
      const avgLat = coords.reduce((s,l)=>s+(l.latitude as number),0)/coords.length;
      const avgLng = coords.reduce((s,l)=>s+(l.longitude as number),0)/coords.length;
      return [avgLat, avgLng];
    }
    return undefined;
  }, [centerLat, centerLng, listings]);

  const bounds = L.latLngBounds([]);
  listings.forEach(l => {
    if (typeof l.latitude === 'number' && typeof l.longitude === 'number') bounds.extend([l.latitude, l.longitude]);
  });
  if (bounds.isValid() && listings.length > 0) {
    // expand small bounds
  if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
      const pad = 0.02;
      bounds.extend([bounds.getNorthEast().lat + pad, bounds.getNorthEast().lng + pad]);
      bounds.extend([bounds.getSouthWest().lat - pad, bounds.getSouthWest().lng - pad]);
    }
  }

  // Helper to set area param
  const applyBBox = useCallback((southWest: LatLng, northEast: LatLng) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('clat'); params.delete('clng'); params.delete('radius'); // remove radius filters when area active
    params.set('area', `bbox:${southWest.lat.toFixed(5)},${southWest.lng.toFixed(5)},${northEast.lat.toFixed(5)},${northEast.lng.toFixed(5)}`);
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const clearArea = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('area');
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const enableDraw = useCallback((map: LeafletMap) => {
    // Dynamically access Draw control injected by leaflet-draw
    const DrawCtor = (L as unknown as { Control?: { Draw?: new (o: unknown) => L.Control } }).Control?.Draw;
    if (!DrawCtor) {
      // Fail gracefully if plugin not loaded for some reason
      // eslint-disable-next-line no-console
      console.warn('[MarketplaceMap] leaflet-draw plugin niet beschikbaar – gebied selecteren uitgeschakeld');
      return;
    }
    try {
      const drawControl = new DrawCtor({
        draw: {
          polygon: false,
          polyline: false,
          marker: false,
          circle: false,
          circlemarker: false,
          rectangle: { shapeOptions: { color: '#2563eb', weight: 1 } },
        },
        edit: false,
      });
      map.addControl(drawControl);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[MarketplaceMap] Fout bij initialiseren Draw control', e);
      return;
    }

    interface DrawCreatedEvent extends LeafletEvent { layer: Layer }
    map.on('draw:created', (evt: LeafletEvent) => {
      const e = evt as DrawCreatedEvent;
      const layer = e.layer as Layer | undefined;
      const isRectangle = (ly: Layer | undefined): ly is LeafletRectangle => !!ly && (ly as LeafletRectangle).getBounds !== undefined;
      if (isRectangle(layer)) {
        const rect = layer;
        const b = rect.getBounds();
        applyBBox(b.getSouthWest(), b.getNorthEast());
        map.removeLayer(rect);
      }
    });
  }, [applyBBox]);

  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && mapRef.current && drawEnabled && pluginReady) {
      enableDraw(mapRef.current);
      initializedRef.current = true;
    }
  }, [enableDraw, drawEnabled, pluginReady]);

  if (!hydrated) return <div className="h-96 w-full flex items-center justify-center text-sm text-gray-500">Kaart laden…</div>;
  if (!center) return <div className="h-40 w-full flex items-center justify-center text-sm text-gray-500">Geen coördinaten beschikbaar</div>;

  return (
    <div className="h-96 w-full rounded-xl overflow-hidden border border-gray-200 relative">
      <div className="absolute top-2 left-2 z-[500] flex gap-2">
        <button
          type="button"
          onClick={() => setDrawEnabled((d: boolean) => !d)}
          disabled={!pluginReady}
          className={`px-2 py-1 rounded text-[11px] shadow border ${!pluginReady ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : drawEnabled ? 'bg-primary text-white border-primary' : 'bg-white/90 text-gray-700 hover:bg-white'}`}
        >{!pluginReady ? 'Laden…' : drawEnabled ? 'Rechthoek tool actief' : 'Teken gebied'}</button>
        <span className="bg-white/90 backdrop-blur px-2 py-1 rounded text-[11px] text-gray-600 shadow hidden md:inline">{drawEnabled ? 'Klik en sleep om rechthoek te tekenen' : 'Activeer om gebied te kiezen'}</span>
        {searchParams.get('area') && (
          <button onClick={clearArea} className="text-[11px] px-2 py-1 rounded bg-white shadow hover:bg-gray-50 border border-gray-200">Wis gebied</button>
        )}
      </div>
      <MapContainer
        center={center}
        zoom={10}
        style={{ height: "100%", width: "100%" }}
        bounds={bounds.isValid() ? bounds : undefined}
  scrollWheelZoom={true}
  ref={mapRef as unknown as React.RefObject<LeafletMap>}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {typeof centerLat === 'number' && typeof centerLng === 'number' && typeof radiusKm === 'number' && (
          <LeafletCircle
            center={[centerLat, centerLng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.08 }}
          />
        )}
        {listings.filter(l => typeof l.latitude === 'number' && typeof l.longitude === 'number').map(l => (
          <LeafletMarker key={l.id} position={[l.latitude as number, l.longitude as number]} icon={simpleDivIcon('#dc2626')}>
            <LeafletPopup>
              <div className="space-y-1 text-sm">
                <a href={`/listings/${l.id}`} className="font-semibold text-primary hover:underline line-clamp-2 block max-w-[160px]">{l.title}</a>
                {typeof l.price === 'number' && <div className="text-gray-700 font-medium">€ {l.price}</div>}
                {l.location && <div className="text-gray-500">{l.location}</div>}
              </div>
            </LeafletPopup>
          </LeafletMarker>
        ))}
      </MapContainer>
    </div>
  );
}
