// Minimal leaflet-draw typings (rectangle only) to satisfy TS & lint
import 'leaflet';
declare module 'leaflet-draw';

declare global {
  // Expose Leaflet on window for leaflet-draw plugin
  interface Window { L: typeof L; }
}

declare module 'leaflet' {
  namespace Control {
    interface DrawConstructorOptions {
      draw?: {
        rectangle?: { shapeOptions?: L.PathOptions } | false;
        polygon?: false;
        polyline?: false;
        marker?: false;
        circle?: false;
        circlemarker?: false;
      };
      edit?: false;
    }
    class Draw extends Control {
      constructor(options?: DrawConstructorOptions);
    }
  }
  namespace Draw {
    namespace Event {
      // Event constant emitted on shape creation
      const CREATED: 'draw:created';
    }
    interface CreatedEvent extends L.LeafletEvent {
      layer: L.Layer; // We'll narrow in user code
      layerType: string;
    }
  }
}
