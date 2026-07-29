import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { GeoDistributionPoint } from '../../types/soundbox';

const NAMIBIA_CENTER: [number, number] = [-22.9576, 17.0832];
const DEFAULT_ZOOM = 6;

interface HeatLayerProps {
  points: GeoDistributionPoint[];
  visible: boolean;
}

/**
 * Renders (and tears down) a leaflet.heat layer on the parent MapContainer.
 * react-leaflet has no first-class heat-layer component, so this drives
 * the underlying Leaflet layer imperatively via useMap().
 */
const HeatLayer: React.FC<HeatLayerProps> = ({ points, visible }) => {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!visible || points.length === 0) {
      return;
    }

    const weighted: Array<[number, number, number]> = points.map((p) => [
      p.lat as number,
      p.lng as number,
      Math.max(p.transactionCount, 1),
    ]);

    const heat = L.heatLayer(weighted, { radius: 30, blur: 20, maxZoom: 12 });
    heat.addTo(map);
    layerRef.current = heat;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, visible]);

  return null;
};

const activityColor = (transactionCount: number): string => {
  if (transactionCount === 0) return '#9CA3AF';
  if (transactionCount < 5) return '#10B981';
  if (transactionCount < 20) return '#F59E0B';
  return '#E6136C';
};

interface GeoDistributionMapProps {
  points: GeoDistributionPoint[];
  view: 'markers' | 'heatmap';
}

const GeoDistributionMap: React.FC<GeoDistributionMapProps> = ({ points, view }) => {
  const located = points.filter(
    (p): p is GeoDistributionPoint & { lat: number; lng: number } => p.lat !== null && p.lng !== null
  );

  return (
    <MapContainer
      center={NAMIBIA_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom
      style={{ height: '500px', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {view === 'markers' &&
        located.map((point) => (
          <CircleMarker
            key={point.merchantId}
            center={[point.lat, point.lng]}
            radius={8 + Math.min(point.transactionCount, 20)}
            pathOptions={{
              color: activityColor(point.transactionCount),
              fillColor: activityColor(point.transactionCount),
              fillOpacity: 0.6,
            }}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">{point.legalName}</p>
                <p>{point.merchantCode}</p>
                <p>{point.regionLabel ?? 'Unknown region'}</p>
                <p>{point.deviceCount} device(s)</p>
                <p>{point.transactionCount} transaction(s)</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      <HeatLayer points={located} visible={view === 'heatmap'} />
    </MapContainer>
  );
};

export default GeoDistributionMap;
