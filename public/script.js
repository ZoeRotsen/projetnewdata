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

function loadStats(type) {
  const content = document.getElementById("stats-content");

  if (type === "moyenneCuisine") {
    fetch(`${baseUrl}/items/moyenne/cuisine`)
      .then(r => r.json())
      .then(data => {
        console.log(data)
        content.innerHTML = renderMoyenneCuisine(data);
      });
  }

}

initMap();

document.getElementById("stats-select").addEventListener("change", e => {
  loadStats(e.target.value);
});

function renderMoyenneCuisine(data) {
  let html = "<b>Score moyen par cuisine :</b><br><br>";
  data.forEach(c => {
    html += `${c._id} : <span class="fw-bold">${c.scoreMoyen.toFixed(2)}</span><br>`;
  });
  return html;
}