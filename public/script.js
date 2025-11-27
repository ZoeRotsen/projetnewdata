let map;
let markers = [];
let baseUrl="http://localhost:3000/api"

// Initialiser la carte
function initMap() {
  map = L.map('map').setView([40.7128, -74.0060], 12);

  // Ajouter un fond de carte OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  loadMarkers();
}

// Fonction de style pour les markers
function styleMap(p){
  return {
    color: "blue",
    radius: 1,
    fillOpacity: 0.8,
    weight: 2
  }
}


function loadMarkers() {
  // supprimer les marqueurs existants
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  fetch(`${baseUrl}/items`)
    .then(res => res.json())
    .then(points => {
      points.forEach(p => {
    
        if (p.address.coord.coordinates) {
          var [lng, lat] = p.address.coord.coordinates;

          var marker = L.circleMarker(
            [lat, lng],
            styleMap(p)
          ).addTo(map);
          

          marker.bindPopup(
            `<b>Nom:</b> ${p.name}`
          );

          markers.push(marker);
        }
      });
    });
}

initMap();