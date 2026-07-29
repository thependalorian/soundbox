// leaflet.heat has no bundled/published types. Minimal ambient declaration
// for the one function this project uses.
import * as L from 'leaflet';

declare module 'leaflet' {
  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: { [key: number]: string };
  }

  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatLayerOptions
  ): L.Layer;
}

declare module 'leaflet.heat';
