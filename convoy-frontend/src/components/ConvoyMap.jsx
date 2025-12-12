import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ConvoyMap({ route, startPoint, endPoint, checkpoints = [], dangerPoints = [] }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map centered on start point
    const mapCenter = startPoint
      ? [startPoint.lat, startPoint.lon]
      : [28.6139, 77.209]; // Default: Delhi

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainer.current).setView(mapCenter, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    // Clear existing layers (except tiles)
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline || layer instanceof L.Circle) {
        mapRef.current.removeLayer(layer);
      }
    });

    // Add start marker (green)
    if (startPoint) {
      const startMarker = L.marker([startPoint.lat, startPoint.lon], {
        icon: L.icon({
          iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      })
        .bindPopup('Start Point')
        .addTo(mapRef.current);
    }

    // Add end marker (red)
    if (endPoint) {
      const endMarker = L.marker([endPoint.lat, endPoint.lon], {
        icon: L.icon({
          iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      })
        .bindPopup('End Point')
        .addTo(mapRef.current);
    }

    // Add route polyline (blue)
    if (route && route.length > 0) {
      L.polyline(route, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
      }).addTo(mapRef.current);
    }

    // Add danger/risk zones (red circles)
    if (dangerPoints && dangerPoints.length > 0) {
      dangerPoints.forEach((danger) => {
        // Choose color based on risk level
        let circleColor = '#ef4444'; // red for high
        let fillOpacity = 0.2;

        if (danger.risk_level === 'medium') {
          circleColor = '#f59e0b'; // orange
          fillOpacity = 0.15;
        } else if (danger.risk_level === 'low') {
          circleColor = '#fbbf24'; // yellow
          fillOpacity = 0.1;
        }

        // Draw circle for risk zone
        L.circle([danger.lat, danger.lon], {
          color: circleColor,
          fillColor: circleColor,
          fillOpacity: fillOpacity,
          radius: danger.radius_km * 1000, // Convert km to meters
          weight: 2,
        })
          .bindPopup(
            `<strong>⚠️ ${danger.name}</strong><br/>` +
            `Risk Level: <span style="color: ${circleColor}; font-weight: bold;">${danger.risk_level.toUpperCase()}</span><br/>` +
            `Distance from route: ${danger.distance_from_route_km || 0} km<br/>` +
            `Radius: ${danger.radius_km} km`
          )
          .addTo(mapRef.current);

        // Add marker at center of risk zone
        const dangerMarker = L.marker([danger.lat, danger.lon], {
          icon: L.icon({
            iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [20, 33],
            iconAnchor: [10, 33],
            popupAnchor: [1, -28],
            shadowSize: [33, 33],
          }),
        })
          .bindPopup(
            `<strong>⚠️ ${danger.name}</strong><br/>` +
            `Risk Level: <span style="color: ${circleColor}; font-weight: bold;">${danger.risk_level.toUpperCase()}</span><br/>` +
            `Distance from route: ${danger.distance_from_route_km || 0} km`
          )
          .addTo(mapRef.current);
      });
    }

    // Add checkpoints (different colors based on type)
    if (checkpoints && checkpoints.length > 0) {
      checkpoints.forEach((cp, idx) => {
        // Choose marker color based on checkpoint type
        let markerColor = 'orange';
        if (cp.checkpoint_type === 'military') markerColor = 'gold';
        if (cp.checkpoint_type === 'border') markerColor = 'violet';
        if (cp.checkpoint_type === 'rest_stop') markerColor = 'blue';
        if (cp.checkpoint_type === 'toll') markerColor = 'grey';
        if (cp.status === 'closed') markerColor = 'red';
        if (cp.status === 'congested') markerColor = 'yellow';

        const cpMarker = L.marker([cp.lat, cp.lon], {
          icon: L.icon({
            iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        })
          .bindPopup(
            `<strong>${cp.name || `Checkpoint ${cp.checkpoint_id}`}</strong><br/>` +
            `Type: ${cp.checkpoint_type || 'unknown'}<br/>` +
            `Status: ${cp.status || 'operational'}<br/>` +
            `Distance from route: ${cp.distance_to_route_km ? cp.distance_to_route_km + ' km' : 'N/A'}<br/>` +
            `Capacity: ${cp.current_load || 0}/${cp.capacity || 0} vehicles`
          )
          .addTo(mapRef.current);
      });
    }

    // Fit bounds to show all markers
    if ((startPoint || endPoint || checkpoints.length > 0) && mapRef.current) {
      const bounds = L.latLngBounds();
      if (startPoint) bounds.extend([startPoint.lat, startPoint.lon]);
      if (endPoint) bounds.extend([endPoint.lat, endPoint.lon]);
      if (checkpoints && checkpoints.length > 0) {
        checkpoints.forEach((cp) => bounds.extend([cp.lat, cp.lon]));
      }
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      // Cleanup on unmount
    };
  }, [route, startPoint, endPoint, checkpoints, dangerPoints]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-80 md:h-96 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden"
    />
  );
}
