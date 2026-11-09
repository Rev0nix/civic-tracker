import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function CivicMap({ latitude, longitude }) {
  // Retrieve the API key from Vite environment variables
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <MapContainer center={[latitude, longitude]} zoom={15} style={{ height: '400px', width: '100%' }}>
      {/* Google Maps Tile Layer Integration */}
      <TileLayer
        url={`https://maps.googleapis.com/maps/api/vt?lyrs=m&x={x}&y={y}&z={z}&key=${apiKey}`}
        attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
        maxZoom={20}
      />
      <Marker position={[latitude, longitude]}>
        <Popup>Issue Location</Popup>
      </Marker>
    </MapContainer>
  );
}