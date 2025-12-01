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

//variable pour les graphiques
var chartInstance = null;

//Récupération des stats
function loadStats(type) {
  const content = document.getElementById("stats-content");
  const canvas = document.getElementById("stats-chart");
  const mode = document.getElementById("display-mode").value; // texte ou graphique

  //Affichage des moyennes des scores de chaque cuisine
  if (type === "AvgScoreCuisine") {
    fetch(`${baseUrl}/items/avg/cuisine`)
      .then(r => r.json())
      .then(data => {
        //Affichage en mode texte
        if (mode === "text") {
          content.style.display = "block";
          canvas.style.display = "none";
          content.innerHTML = showAvgCuisine(data);
        } else if (mode === "chart") { //Affichage en mode graphique
          content.style.display = "none";
          canvas.style.display = "block";

          const labels = data.map(avgCuisine => avgCuisine._id);
          const scores = data.map(avgCuisine => avgCuisine.scoreMoyen.toFixed(2));

          if (chartInstance) chartInstance.destroy();

          chartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [{
                label: 'Score moyen',
                data: scores,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              scales: { y: { beginAtZero: true } },
              plugins: { legend: { display: false } }
            }
          });
        }
      });
  } else {
    content.style.display = "none";
    canvas.style.display = "none";
  }
}

//Rendu de l'HTML pour la moyenne des cuisines
function showAvgCuisine(data) {
  var html = "<b>Score moyen par cuisine :</b><br><br>";
  data.forEach(avgCuisine => {
    html += `${avgCuisine._id} : <span class="fw-bold">${avgCuisine.scoreMoyen.toFixed(2)}</span><br>`;
  });
  return html;
}

//Initialisation des fonctions
initMap();

document.getElementById("stats-select").addEventListener("change", e => loadStats(e.target.value));
document.getElementById("display-mode").addEventListener("change", () => {
  const selectedStat = document.getElementById("stats-select").value;
  loadStats(selectedStat);
});
