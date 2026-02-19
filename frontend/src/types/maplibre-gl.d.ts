declare module 'maplibre-gl' {
  export class Map {
    constructor(options: any);
    [key: string]: any;
  }
  export class Marker {
    constructor(options?: any);
    [key: string]: any;
  }
  export class Popup {
    constructor(options?: any);
    [key: string]: any;
  }
  export class NavigationControl {
    constructor(options?: any);
  }
  export class LngLatBounds {
    constructor(...args: any[]);
    [key: string]: any;
  }
  const maplibregl: any;
  export default maplibregl;
}
declare module 'maplibre-gl/dist/maplibre-gl.css';
