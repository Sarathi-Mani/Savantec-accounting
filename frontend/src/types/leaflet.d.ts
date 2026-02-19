declare module 'leaflet' {
  const L: any;
  export default L;
  export const Map: any;
  export const Marker: any;
  export type LatLngExpression = any;
  export const Icon: any;
  export function map(...args: any[]): any;
  export function marker(...args: any[]): any;
  export function tileLayer(...args: any[]): any;
  export function icon(...args: any[]): any;
}
declare module 'leaflet/dist/leaflet.css';
declare module 'leaflet-rotatedmarker';
