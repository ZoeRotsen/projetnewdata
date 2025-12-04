let map;
let markers = [];
let baseUrl="http://localhost:3000/api"


let allPoints = [];  // je garde tous les restos pour plus tard
let addMode = false;  // je dis si je suis en mode ajout
let addTempMarker = null;  // je garde le petit marker du nouveau resto
let addFormDataCache = null;  // je garde les infos du formulaire quand je vais cliquer sur la carte
let clusterGroup = null;  // groupe de clusters
let editMode = false;  // je dis si je suis en mode edit
let currentEditId = null;  // je garde l id du resto que je modifie

//longitute et latitude pour la recherche des points les plus proches
var lngForNear =null;
var latForNear=null;
var distanceCircle = null; //variable pour le rayon des point des points les plus proches
var chartInstance=null; //variable pour les graphiques

// je calcule le score moyen d un resto
function getAverageScore(point) {
  // je regarde si la liste existe
  if (!point.grades || !Array.isArray(point.grades) || point.grades.length === 0) {
    return null; // je dis rien si pas de note
  }

  let total = 0; // je mets la somme
  let count = 0; // je compte

  for (let i = 0; i < point.grades.length; i++) {
    let gradeItem = point.grades[i];
    let score = typeof gradeItem.score === "number" ? gradeItem.score : 0;
    total = total + score; // j ajoute la note
    count = count + 1;     // j ajoute 1
  }

  if (count === 0) {
    return null;
  }

  return total / count; // je fais la moyenne
}


// ici je prends l id du doc
function getDocId(doc) {
  if (!doc) {
    return null;
  }

  if (typeof doc._id === "string") {
    return doc._id;
  }

  if (doc._id && typeof doc._id === "object" && typeof doc._id.$oid === "string") {
    return doc._id.$oid;
  }

  return null;
}


// je choisis le style du point avec la note
function getStyleFromScore(avgScore) {
  // si pas de score je fais un petit point gris
  if (avgScore === null) {
    return {
      color: "#6c757d",
      fillColor: "#6c757d",
      radius: 4,
      fillOpacity: 0.7,
      weight: 1
    };
  }

  // je prends une couleur selon la note
  let color;

  // grosse note
  if (avgScore >= 20) {
    color = "#dc3545"; // rouge
  }
  // moyenne note
  else if (avgScore >= 10) {
    color = "#fd7e14"; // orange
  }
  // petite note
  else {
    color = "#198754"; // vert
  }

  // je fais le point plus gros quand la note monte
  return {
    color: color,
    fillColor: color,
    radius: 4 + avgScore / 5,
    fillOpacity: 0.7,
    weight: 1
  };
}



// Initialiser la carte
function initMap() {
  map = L.map('map').setView([40.7128, -74.0060], 12);

  // Ajouter un fond de carte OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  // je crée le groupe pour les clusters
  clusterGroup = L.markerClusterGroup({
    chunkedLoading: true // je charge par petits morceaux pour ne pas ramer
  });

  // j ajoute le groupe sur la carte
  map.addLayer(clusterGroup);
  loadMarkers();


  // je regarde quand un popup s ouvre
  map.on("popupopen", function(e) {
    let marker = e.popup._source;   // ici je prends le marker
    let doc = marker.restaurantDoc; // ici je prends les infos du resto

    if (!doc) {
      return;
    }

    let popupEl = e.popup.getElement();
    if (!popupEl) {
      return;
    }

    let editBtn = popupEl.querySelector(".edit-icon");
    let docId = getDocId(doc);

    if (editBtn) {
      editBtn.addEventListener("click", function() {
        openEditForm(doc, docId);
      });
    }

    var nearBtn = popupEl.querySelector(".popup-near-btn");
    if (nearBtn) {
        nearBtn.addEventListener("click", function () {
          let coords = doc.address.coord.coordinates;
          if (!coords) return;

          lngForNear = coords[0];
          latForNear = coords[1];

          var nearModal = new bootstrap.Modal(document.getElementById("near-modal"));
          nearModal.show();

      });
    }
  });

  // je regarde les clics sur la carte
  map.on("click", function(e) {
    // je sors si je ne suis pas en mode ajout
    if (!addMode) {
      return;
    }

    // je coupe le mode ajout apres le clic
    addMode = false;

    let lat = e.latlng.lat;
    let lng = e.latlng.lng;

    // je mets les nombres dans les cases du formulaire
    let latInput = document.getElementById("add-lat");
    let lngInput = document.getElementById("add-lng");

    if (latInput && lngInput) {
      latInput.value = lat.toFixed(6); // je garde 6 chiffres
      lngInput.value = lng.toFixed(6);
    }

    // je dessine un marker temporaire
    if (addTempMarker) {
      map.removeLayer(addTempMarker);
    }
    addTempMarker = L.marker([lat, lng]).addTo(map);

    // je remets les autres champs si je les ai gardés
    if (addForm && addFormDataCache) {
      let nameInput = document.getElementById("add-name");
      let cuisineInput = document.getElementById("add-cuisine");
      let boroughInput = document.getElementById("add-borough");
      let buildingInput = document.getElementById("add-building");
      let streetInput = document.getElementById("add-street");
      let zipcodeInput = document.getElementById("add-zipcode");
      let gradeInput = document.getElementById("add-grade");
      let scoreInput = document.getElementById("add-score");
      let restIdInput = document.getElementById("add-rest-id");

      if (nameInput) nameInput.value = addFormDataCache.name;
      if (cuisineInput) cuisineInput.value = addFormDataCache.cuisine;
      if (boroughInput) boroughInput.value = addFormDataCache.borough;
      if (buildingInput) buildingInput.value = addFormDataCache.building;
      if (streetInput) streetInput.value = addFormDataCache.street;
      if (zipcodeInput) zipcodeInput.value = addFormDataCache.zipcode;
      if (gradeInput) gradeInput.value = addFormDataCache.grade;
      if (scoreInput) scoreInput.value = addFormDataCache.score;
      if (restIdInput) restIdInput.value = addFormDataCache.restId;
    }

    // je reviens sur le formulaire
    if (addModal) {
      addModal.show();
    }
  });

}


// Fonction de style pour les markers
function styleMap(point) {
  let avgScore = getAverageScore(point); // je prends la moyenne
  return getStyleFromScore(avgScore);    // je donne le style
}


// je retire tous les points de la carte
function clearMarkers() {
  // je vide le groupe de clusters
  if (clusterGroup) {
    clusterGroup.clearLayers();
  }
  markers = []; // je vide la liste
}


// je dessine une liste de points
function drawMarkers(points) {
  clearMarkers(); // je nettoie

  for (let i = 0; i < points.length; i++) {
    let point = points[i];

    // je regarde si j ai des coord
    let coords = point.address && point.address.coord && point.address.coord.coordinates;

    if (coords && coords.length === 2) {
      let lng = coords[0];
      let lat = coords[1];

      let avgScore = getAverageScore(point);   // je calcule la note
      let style = styleMap(point);            // je prends le style

      let marker = L.circleMarker([lat, lng], style);

      // je prépare le texte
      let name = point.name || "No name";
      let cuisine = point.cuisine || "No cuisine";
      let borough = point.borough || "No borough";
      let scoreText = (avgScore !== null) ? avgScore.toFixed(1) : "N/A";

      marker.restaurantDoc = point; // ici je garde le resto
      marker.bindPopup(
        "<div class='fw-bold'>" + name + "</div>" + "<br>"+
        "<div class='small text-muted mb-1'>" +
        "<b>Cuisine: </b>"+ cuisine + "<br>"+
        "<b>Quartier: </b>" + borough +
        "</div>" +
        "<div class='d-flex justify-content-between align-items-end mt-2'>"+
          "<button class='btn btn-info btn-sm popup-near-btn mt-1'> Restaurants proches</button>"+
          "<img src='/icons/edit.png' class='edit-icon' title='Modifier restaurant' style='width:20px;height:20px;'>"+
        "</div>"

      );

      clusterGroup.addLayer(marker);  // j ajoute le point dans le cluster
      markers.push(marker); // je garde le marker
    }
  }
}



// je charge les points depuis l api
function loadMarkers() {

  fetch(baseUrl + "/items")
    .then(function(res) {
      return res.json();
    })
    .then(function(points) {
      allPoints = points;          // je garde tout
      buildFilterOptions(points);  // je remplis les select
      drawMarkers(points);         // je dessine tout
    })
    .catch(function(err) {
      console.error("Erreur loadMarkers :", err);

    });
}


// je remplis les listes de filtres
function buildFilterOptions(points) {
  let cuisineSelect = document.getElementById("filter-cuisine");
  let boroughSelect = document.getElementById("filter-borough");

  // je vérifie que le html existe
  if (!cuisineSelect || !boroughSelect) {
    return;
  }

  let cuisineSet = new Set(); // je garde chaque cuisine une fois
  let boroughSet = new Set(); // je garde chaque quartier une fois

  for (let i = 0; i < points.length; i++) {
    let point = points[i];

    if (point.cuisine) {
      cuisineSet.add(point.cuisine);
    }

    if (point.borough) {
      boroughSet.add(point.borough);
    }
  }

  // je vide les listes avant
  cuisineSelect.innerHTML = '<option value="">Toutes</option>';
  boroughSelect.innerHTML = '<option value="">Tous</option>';

  // je mets les cuisines
  cuisineSet.forEach(function(c) {
    let opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    cuisineSelect.appendChild(opt);
  });

  // je mets les quartiers
  boroughSet.forEach(function(b) {
    let opt = document.createElement("option");
    opt.value = b;
    opt.textContent = b;
    boroughSelect.appendChild(opt);
  });
}


//Récupération des stats
function loadStats(type) {
  var content=document.getElementById("stats-content");
  var canvas=document.getElementById("stats-chart");
  var displayMode=document.getElementById("display-mode").value;
  var chartOption = document.getElementById("display-mode").querySelector('option[value="chart"]');

  //Affichage des moyennes des scores de chaque cuisine
  if (type=="AvgScoreCuisine") {
    //Affichage de l'option graphique
    chartOption.style.display = "block";
    fetch(`${baseUrl}/items/avg/cuisine`)
      .then(r => r.json())
      .then(data => {
        if (displayMode=="text") {
          // Affichage en mode texte dans le panneau
          content.style.display="block";
          canvas.style.display="none";
          content.innerHTML=showAvgCuisine(data);

        } else if(displayMode=="chart") {
          //Affichage en mode graphique dans le modal
          content.style.display="none";
          canvas.style.display="none"; // on cache le canvas du panneau
          const modalCanvas=document.getElementById("modal-chart");

          const labels=data.map(avgCuisine=>avgCuisine._id);
          const scores=data.map(avgCuisine=>avgCuisine.scoreMoyen.toFixed(2));

          if (chartInstance) chartInstance.destroy();

          chartInstance=new Chart(modalCanvas, {
            type:'bar',
            data:{
              labels:labels,
              datasets:[{
                label:'Score moyen',
                data:scores,
                backgroundColor:'rgba(54, 162, 235, 0.7)',
                borderColor:'rgba(54, 162, 235, 1)',
                borderWidth:1
              }]
            },
            options: {
              responsive:true,
              scales: {y: {beginAtZero:true}},
              plugins: {legend: {display:false}}
            }
          });

          const modal= new bootstrap.Modal(document.getElementById('chartModal'));
          modal.show();
        }
      });
  //Affichage de la distribution des cuisines
  }else if(type=="DistScoreCuisine") {
    //Affichage de l'option graphique
    chartOption.style.display = "block";
    fetch(`${baseUrl}/items/dist/cuisine`)
      .then(r => r.json())
      .then(data => {

        //Récupération des données
        var dataArray=data.map(c => {      
          return {
            cuisine:c.cuisine,
            count:c.count,
            min:c.min,
            max:c.max
          };
        });
        //Affichage des résultats en mode texte
        if (displayMode=="text") {
          content.style.display="block";
          canvas.style.display="none";
          content.innerHTML=showDistCuisine(dataArray);
        //Affichage des résultats en mode graphique
        }else if(displayMode=="chart") {
          content.style.display="none";
          canvas.style.display="none";
          var modalCanvas=document.getElementById("modal-chart");

          var labels=dataArray.map(c => c.cuisine);
          var scores=dataArray.map(c => c.count);
          var min=dataArray.map(c => c.min);
          var max=dataArray.map(c => c.max);

          if(chartInstance) chartInstance.destroy();

          chartInstance=new Chart(modalCanvas, {
            type:'bar',
            data: {
              labels:labels,
              datasets: [
                {label:'Score min',data:min,backgroundColor:'rgba(255,99,132,0.5)',borderColor:'rgba(255,99,132,1)',borderWidth:1},
                {label:'Score max',data:max,backgroundColor:'rgba(75,192,192,0.5)',borderColor:'rgba(75,192,192,1)',borderWidth:1}
              ]
            },
            options:{responsive:true,scales:{y:{beginAtZero:true}}}
          });

          // Ouvrir le modal
          const modal=new bootstrap.Modal(document.getElementById('chartModal'));
          modal.show();
        }
      });
  }else if(type=="BestRestau") {
    //Pas d'option graphique pour cette stat
    chartOption.style.display = "none";
    fetch(`${baseUrl}/itemsBestRestau`)
      .then(r => r.json())
      .then(data => {
        content.style.display = "block";
        content.innerHTML = showBestRestaurants(data);
        //Zoom auto sur le premier restau de la liste
        if (data.length > 0) {
          const r = bestList[0].bestRestau;
          const [lng, lat] = r.coordinates;
          map.setView([lat, lng], 16);
        } 
      });
  //Si rien n'est sélectionné on n'affiche rien
  }else{
    content.style.display="none";
    canvas.style.display="none";
  }
}

//Afficher l'html pour la moyenne des cuisines
function showAvgCuisine(data) {
  let html=`<div id="statsResults"><h5>Score moyen par cuisine</h5>`;
  data.forEach(avgCuisine => {
    html+= `
      <div class="cuisine-item">
        <b>${avgCuisine._id}</b>
        Score moyen : <span class="score">${avgCuisine.scoreMoyen.toFixed(2)}</span>
      </div>
    `;
  });
  html+='<button id="avg-cancel" class="btn btn-danger mt-3" onclick="removeStats()">Annuler</button>';
  html+=`</div>`;
  return html;
}

//Afficher l'html de la distribution des cuisine
function showDistCuisine(data) {
  var html=`<div id="statsResults"><h5>Distribution des scores par cuisine</h5>`;
  data.forEach(distCuisine => {
    html+= `
      <div class="cuisine-item">
        <b>${distCuisine.cuisine}</b>
        <div>Nombre de scores : <span class="text-muted">${distCuisine.count}</span></div>
        <div>
          Min : <span class="min">${distCuisine.min}</span> | 
          Max : <span class="max">${distCuisine.max}</span>
        </div>
      </div>`;
  });
  html+='<button id="dist-cancel" class="btn btn-danger mt-3" onclick="removeStats()">Annuler</button>';
  html+=`</div>`;
  return html;
}

//Afficher l'html des points les plus proches dans le panneau
function showNearRestaurants(nearPoints) {
  var html=`<div id="statsResults"><h5>Restaurants trouvés à proximité</h5>`;
  if (!nearPoints.length) {
    html+="<div class='text-muted'>Aucun restaurant trouvé dans ce rayon.</div>";
  } else{
    nearPoints.forEach(p => {
      var name=p.name;
      var cuisine=p.cuisine;
      var dist=(p.dist.calculated/1000).toFixed(2)+" km";
      html+=`
        <div class="restaurant-item mb-2 p-2 border rounded"
             data-id="${p._id}"
             style="cursor:pointer;">
          <div class="fw-bold">${name}</div>
          <div class="text-muted small">${cuisine}</div>
          <div class="small">Distance : <b>${dist}</b></div>
        </div>`;
    });
    html+='<button id="near-cancel" class="btn btn-danger mt-3" onclick="removeStats()">Annuler</button>';
  }
  html+=`</div>`;
  return html;
}
//Afficher l'html pour le meilleur restaurant par cuisine
function showBestRestaurants(bestRestaurants) {
  var html=`<div id="statsResults"><h5>Meilleurs restaurants par cuisine</h5>`;

  if(!bestRestaurants.length){
    html+="<div class='text-muted'>Aucun résultat.</div>";
  }else{
    bestRestaurants.forEach(item => {
      if(item.bestRestau.score){//On filtre sur les score pas défini
        const restau=item.bestRestau;
        html+=`
          <div class="restaurant-item mb-2 p-2 border rounded"
              data-id="${item.bestRestau._id}"
              data-lng="${item.bestRestau.coordinates[0]}"
              data-lat="${item.bestRestau.coordinates[1]}"
              style="cursor:pointer;">
            <div class="fw-bold">${item.bestRestau.name}</div>
            <div class="text-muted small"><b>Cuisine : </b>${item.cuisine}</div>
            <div class="small">Score : <b>${item.bestRestau.score}</b></div>
          </div>`;
        }
      });
    html+=`<button id="best-cancel" class="btn btn-danger mt-3" onclick="removeStats()">Annuler</button>`;
  }

  html+=`</div>`;
  return html;
}

//On retire le texte des stats et les ajouts liés à la recherche des points lesplus proches
function removeStats(){
    //On efface le cercle
    if(distanceCircle){
      map.removeLayer(distanceCircle);
      distanceCircle = null;
    }
    markers.forEach(marker => {
      var point=marker.restaurantDoc;
      if (!point) return;

      var style=styleMap(point);
      marker.setStyle(style);
    });

    var statsTxt=document.getElementById("statsresults");
    var statsContent=document.getElementById("stats-content");
    if(statsTxt){
      statsTxt.remove();
    }
    statsContent.style.display="none";
    //Valeur du type d'affichage sur texte
    document.getElementById("display-mode").value="text";
    //On redessine les markers
    drawMarkers(allPoints);

}



// ici je remplis le formulaire pour modifier un resto
function openEditForm(doc, id) {
  if (!doc || !id) {
    return;
  }

  editMode = true;        // ici je dis que je suis en mode edition
  currentEditId = id;     // ici je garde l id

  let nameInput = document.getElementById("add-name");
  let cuisineInput = document.getElementById("add-cuisine");
  let boroughInput = document.getElementById("add-borough");
  let buildingInput = document.getElementById("add-building");
  let streetInput = document.getElementById("add-street");
  let zipcodeInput = document.getElementById("add-zipcode");
  let gradeInput = document.getElementById("add-grade");
  let scoreInput = document.getElementById("add-score");
  let restIdInput = document.getElementById("add-rest-id");
  let latInput = document.getElementById("add-lat");
  let lngInput = document.getElementById("add-lng");

  // je remplis les champs
  if (nameInput) nameInput.value = doc.name || "";
  if (cuisineInput) cuisineInput.value = doc.cuisine || "";
  if (boroughInput) boroughInput.value = doc.borough || "";

  if (doc.address) {
    if (buildingInput) buildingInput.value = doc.address.building || "";
    if (streetInput) streetInput.value = doc.address.street || "";
    if (zipcodeInput) zipcodeInput.value = doc.address.zipcode || "";
    if (doc.address.coord && Array.isArray(doc.address.coord.coordinates)) {
      let lng = doc.address.coord.coordinates[0];
      let lat = doc.address.coord.coordinates[1];
      if (latInput) latInput.value = lat;
      if (lngInput) lngInput.value = lng;
    }
  }

  if (Array.isArray(doc.grades) && doc.grades.length > 0) {
    let g = doc.grades[0];
    if (gradeInput) gradeInput.value = g.grade || "";
    if (scoreInput && typeof g.score === "number") scoreInput.value = g.score;
  } else {
    if (gradeInput) gradeInput.value = "";
    if (scoreInput) scoreInput.value = "";
  }

  if (restIdInput) restIdInput.value = doc.restaurant_id || "";

  // j affiche le bouton supprimer
  let deleteBtn = document.getElementById("form-delete-btn");
  if (deleteBtn) {
    deleteBtn.classList.remove("d-none");
  }

  // j ouvre le modal
  if (typeof bootstrap !== "undefined") {
    let addModalElement = document.getElementById("add-modal");
    let addModal = bootstrap.Modal.getOrCreateInstance(addModalElement);
    addModal.show();
  }
}


// je filtre les points selon les choix
function applyFilters() {
  if (!allPoints || allPoints.length === 0) {
    return; // je sors si j ai rien
  }

  let cuisineSelect = document.getElementById("filter-cuisine");
  let boroughSelect = document.getElementById("filter-borough");
  let minScoreInput = document.getElementById("filter-min-score");

  let cuisineValue = cuisineSelect ? cuisineSelect.value : "";
  let boroughValue = boroughSelect ? boroughSelect.value : "";
  let minScoreValue = NaN;

  if (minScoreInput && minScoreInput.value !== "") {
    minScoreValue = parseFloat(minScoreInput.value);
  }

  let filtered = []; // je garde les points qui passent

  for (let i = 0; i < allPoints.length; i++) {
    let point = allPoints[i];
    let ok = true; // je dis que le point est bon au début

    // je regarde la cuisine
    if (cuisineValue && point.cuisine !== cuisineValue) {
      ok = false;
    }

    // je regarde le quartier
    if (ok && boroughValue && point.borough !== boroughValue) {
      ok = false;
    }

    // je regarde le score mini
    if (ok && !isNaN(minScoreValue)) {
      let avgScore = getAverageScore(point);
      if (avgScore === null || avgScore < minScoreValue) {
        ok = false;
      }
    }

    if (ok) {
      filtered.push(point); // j ajoute le point
    }
  }

  drawMarkers(filtered); // je dessine la nouvelle liste
}

// je remets tout à zéro
function resetFilters() {
  let cuisineSelect = document.getElementById("filter-cuisine");
  let boroughSelect = document.getElementById("filter-borough");
  let minScoreInput = document.getElementById("filter-min-score");

  if (cuisineSelect) {
    cuisineSelect.value = "";
  }

  if (boroughSelect) {
    boroughSelect.value = "";
  }

  if (minScoreInput) {
    minScoreInput.value = "";
  }

  drawMarkers(allPoints); // je remets tous les points
}

//Dessiner le rayon de recherche pour les points les lus proches
function drawDistanceCircle(lng,lat,dist) {
  //Suppression de l'ancien cercle
  if (distanceCircle) {
    map.removeLayer(distanceCircle);
  }

  distanceCircle = L.circle([lat, lng], {
    radius: dist,
    color: "#0d6efd",
    fillOpacity: 0.2,
    weight: 1,
  }).addTo(map);
}

//Mettres les points les plus proches trouvés en bleu
function colorNearPoints(nearPoints) {
  clearMarkers();
  drawMarkers(allPoints)
  var nearSet = new Set(nearPoints.map(p => p._id));

  markers.forEach(marker => {
    var point = marker.restaurantDoc;
    if (!point || !point.address?.coord?.coordinates) return;

    var style = styleMap(point);

    if (nearSet.has(point._id)) {
  
      style.color = "#0d6efd";
      style.fillColor = "#0d6efd";
      style.radius += 3;
      style.weight = 2;
    }

    marker.setStyle(style);
  });
}


//Initialisation des fonctions et mise en place des écouteurs
initMap();

//Ouverture du panneau stats
document.getElementById("stats-open-btn").addEventListener("click", () => {
  document.getElementById("stats-panel").style.display = "block";
  document.getElementById("stats-open-btn").style.display = "none";
});

//Fermerture du panneau stats
document.getElementById("stats-close-btn").addEventListener("click", () => {
  document.getElementById("stats-panel").style.display = "none";
  document.getElementById("stats-open-btn").style.display = "block";
});


//Ecouteur sur le select des stats
document.getElementById("stats-select").addEventListener("change", e => loadStats(e.target.value));

// je branche le bouton appliquer
let filterApplyBtn = document.getElementById("filter-apply");
if (filterApplyBtn) {
  filterApplyBtn.addEventListener("click", function() {
    applyFilters();
  });
}

// je branche le bouton reset
let filterResetBtn = document.getElementById("filter-reset");
if (filterResetBtn) {
  filterResetBtn.addEventListener("click", function() {
    resetFilters();
  });
}

//Ecouteur sur le select du mode d'affichage
document.getElementById("display-mode").addEventListener("change", () => {
  const selectedStat=document.getElementById("stats-select").value;
  loadStats(selectedStat);
});

//Ecouteur sur la slide pour sélectionner la distance
document.getElementById("near-range").addEventListener("input", e => {
  document.getElementById("near-range-value").textContent = e.target.value;
});

//Ecouteur sur le bouton Recherche des points à proximité
document.getElementById("near-launch").addEventListener("click", async () => {
  var distance=document.getElementById("near-range").value;

  var urlNear=`${baseUrl}/itemsNear?lng=${encodeURIComponent(lngForNear)}&lat=${encodeURIComponent(latForNear)}&dist=${encodeURIComponent(distance)}`;
  console.log(urlNear);

  var points=await fetch(urlNear).then(r => r.json());

  colorNearPoints(points);
  drawDistanceCircle(lngForNear, latForNear, distance);

  // On zoom sur le premier point trouvé
  if (points.length>0) {
    const coords=points[0].address.coord.coordinates;
    map.setView([coords[1], coords[0]], 18);
  }

  var nearModalEl=document.getElementById("near-modal");
  var nearModal=bootstrap.Modal.getInstance(nearModalEl) || new bootstrap.Modal(nearModalEl);
  nearModal.hide();

  var content=document.getElementById("stats-content");
  content.style.display = "block";
  content.innerHTML = showNearRestaurants(points);
});

// Écouteur sur les restaurants proches trouvés et fonctionne aussi pour le meilleur restau par cuisine
document.getElementById("stats-content").addEventListener("click", function(e) {
  let item = e.target.closest(".restaurant-item");
  if (!item) return;

  const id = item.getAttribute("data-id");

  const marker = markers.find(m => {
    const doc = m.restaurantDoc;
    return doc && (doc._id == id || doc.restaurant_id == id);
  });

  if (marker) {
    clusterGroup.zoomToShowLayer(marker, () => {
      const pos = marker.getLatLng();
      map.setView(pos, 18);
      marker.openPopup();
    });
  }
});


// je récupère les éléments du formulaire
let addOpenBtn = document.getElementById("add-open");
let addModalElement = document.getElementById("add-modal");
let addForm = document.getElementById("add-form");

// je crée le modal Bootstrap
let addModal = null;
if (addModalElement) {
  // je fais le modal avec bootstrap
  addModal = new bootstrap.Modal(addModalElement);
}


// je recupere le bouton supprimer dans le modal
let deleteBtn = document.getElementById("form-delete-btn");

if (deleteBtn) {
  deleteBtn.addEventListener("click", function() {
    // ici je verifie que je suis bien en mode edition
    if (!editMode || !currentEditId) {
      alert("Pas de restaurant a supprimer.");
      return;
    }

    // ici je demande si on est sur
    let ok = confirm("Tu veux vraiment supprimer ce restaurant ?");
    if (!ok) {
      return;
    }

    // ici je parle avec l api pour supprimer
    fetch(baseUrl + "/items/" + encodeURIComponent(currentEditId), {
      method: "DELETE"
    })
    .then(function(res) {
      return res.json();
    })
    .then(function(data) {
      console.log("Delete response:", data);
      if (data && data.error) {
        alert(data.error);
        return;
      }
      if (map) {
        map.closePopup();
      }

      // ici je ferme la fenetre
      if (addModal) {
        addModal.hide();
      }

      // ici je remets les infos a zero
      editMode = false;
      currentEditId = null;

      // ici je recharge les points
      loadMarkers();
    })
    .catch(function(err) {
      console.error("Erreur delete:", err);
      alert("Erreur lors de la suppression.");
    });
  });
}



// je récupère le bouton pour choisir sur la carte
let addPickMapBtn = document.getElementById("add-pick-map");

if (addPickMapBtn) {
  addPickMapBtn.addEventListener("click", function() {
    // je garde les infos du formulaire
    addFormDataCache = {
      name: document.getElementById("add-name") ? document.getElementById("add-name").value : "",
      cuisine: document.getElementById("add-cuisine") ? document.getElementById("add-cuisine").value : "",
      borough: document.getElementById("add-borough") ? document.getElementById("add-borough").value : "",
      building: document.getElementById("add-building") ? document.getElementById("add-building").value : "",
      street: document.getElementById("add-street") ? document.getElementById("add-street").value : "",
      zipcode: document.getElementById("add-zipcode") ? document.getElementById("add-zipcode").value : "",
      grade: document.getElementById("add-grade") ? document.getElementById("add-grade").value : "",
      score: document.getElementById("add-score") ? document.getElementById("add-score").value : "",
      restId: document.getElementById("add-rest-id") ? document.getElementById("add-rest-id").value : ""
    };

    // je dis que le prochain clic sur la carte est pour le resto
    addMode = true;

    if (addModal) {
      addModal.hide(); // je ferme la fenetre pour voir la carte
    }
  });
}


// je gère le clic sur le bouton "Ajouter un restaurant"
if (addOpenBtn && addModal) {
  addOpenBtn.addEventListener("click", function() {
    // je dis que je ne suis pas encore en mode clic carte
    addMode = false;
    addFormDataCache = null; // je vide la mémoire

    // je dis que je ne suis pas en mode edit
    editMode = false;
    currentEditId = null;

    // je cache le bouton supprimer
    let deleteBtn = document.getElementById("form-delete-btn");
    if (deleteBtn) {
      deleteBtn.classList.add("d-none");
    }

    // je vide le formulaire
    if (addForm) {
      addForm.reset();
    }

    // j enleve le vieux marker si il existe
    if (addTempMarker) {
      map.removeLayer(addTempMarker);
      addTempMarker = null;
    }

    addModal.show(); // j ouvre la petite fenetre
  });
}


// je coupe le mode ajout quand on ferme le modal
if (addModalElement) {
  addModalElement.addEventListener("hidden.bs.modal", function() {
    // je ne touche pas a addMode. J enleve juste le marker si on annule tout
    if (!addMode && addTempMarker) {
      map.removeLayer(addTempMarker);
      addTempMarker = null;
    }
  });
}


// je gère l envoi du formulaire
if (addForm) {
  addForm.addEventListener("submit", function(e) {
    e.preventDefault(); // j empeche le rechargement

    // je prends les valeurs du formulaire
    let nameInput = document.getElementById("add-name");
    let cuisineInput = document.getElementById("add-cuisine");
    let boroughInput = document.getElementById("add-borough");
    let buildingInput = document.getElementById("add-building");
    let streetInput = document.getElementById("add-street");
    let zipcodeInput = document.getElementById("add-zipcode");
    let gradeInput = document.getElementById("add-grade");
    let scoreInput = document.getElementById("add-score");
    let restIdInput = document.getElementById("add-rest-id");
    let latInput = document.getElementById("add-lat");
    let lngInput = document.getElementById("add-lng");

    // je lis les champs
    let nameValue = nameInput ? nameInput.value : "";
    let cuisineValue = cuisineInput ? cuisineInput.value : "";
    let boroughValue = boroughInput ? boroughInput.value : "";
    let buildingValue = buildingInput ? buildingInput.value : "";
    let streetValue = streetInput ? streetInput.value : "";
    let zipcodeValue = zipcodeInput ? zipcodeInput.value : "";
    let gradeValue = gradeInput ? gradeInput.value : "";
    let scoreValue = scoreInput && scoreInput.value !== "" ? Number(scoreInput.value) : null;
    let restIdValue = restIdInput ? restIdInput.value : "";
    let latValue = latInput && latInput.value !== "" ? Number(latInput.value) : null;
    let lngValue = lngInput && lngInput.value !== "" ? Number(lngInput.value) : null;

    // je verifie les champs importants
    if (!nameValue || !cuisineValue || !boroughValue) {
      alert("Nom, cuisine et quartier sont obligatoires.");
      return;
    }

    if (latValue === null || lngValue === null || isNaN(latValue) || isNaN(lngValue)) {
      alert("Clique sur la carte pour choisir la position.");
      return;
    }

    // je verifie que l adresse n est pas vide
    if (!buildingValue || !streetValue || !zipcodeValue) {
      alert("Bâtiment, rue et code postal sont obligatoires.");
      return;
    }

    // je verifie le score (pas negatif)
    if (scoreValue !== null) {
      if (isNaN(scoreValue)) {
        alert("Le score doit être un nombre.");
        return;
      }
      if (scoreValue < 0) {
        alert("Le score ne doit pas être négatif.");
        return;
      }
      // je verifie que le grade est rempli si il y a un score
      if (!gradeValue) {
        alert("Le grade est obligatoire quand il y a un score.");
        return;
      }
    }

    // je verifie le format de restaurant_id (si rempli)
    if (restIdValue !== "") {
      // je veux seulement des chiffres
      let idIsOnlyDigits = /^\d+$/.test(restIdValue);
      if (!idIsOnlyDigits) {
        alert("Restaurant ID doit contenir seulement des chiffres.");
        return;
      }

      // je verifie qu il n existe pas deja dans la liste
      for (let i = 0; i < allPoints.length; i++) {
        let p = allPoints[i];
        if (p.restaurant_id && p.restaurant_id === restIdValue) {
          let pid = getDocId(p);

          // si je suis en edition et que c est le meme doc, je laisse passer
          if (editMode && currentEditId && pid === currentEditId) {
            continue;
          }

          alert("Ce Restaurant ID existe déjà dans la base.");
          return;
        }
      }
    }

    // je fais le doc comme dans MongoDB
    let newDoc = {
      name: nameValue,
      borough: boroughValue,
      cuisine: cuisineValue,
      address: {
        building: buildingValue,
        street: streetValue,
        zipcode: zipcodeValue,
        coord: {
          type: "Point",
          coordinates: [lngValue, latValue] // je mets [lng, lat]
        }
      },
      grades: []
    };

    // je mets une note si il y en a une
    if (gradeValue !== "" || scoreValue !== null) {
      newDoc.grades.push({
        date: new Date().toISOString(), // je mets la date du jour
        grade: gradeValue,
        score: scoreValue
      });
    }

    // je mets l id si il est rempli
    if (restIdValue !== "") {
      newDoc.restaurant_id = restIdValue;
    }

    // ici je choisis POST ou PUT selon le mode
    let url = baseUrl + "/items";
    let method = "POST";

    if (editMode && currentEditId) {
      url = baseUrl + "/items/" + encodeURIComponent(currentEditId);
      method = "PUT";
    }

    fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(newDoc)
    })
      .then(function(res) {
        return res.json();
      })
      .then(function(data) {
        console.log("Save response:", data);

        if (data && data.error) {
          alert(data.error);
          return;
        }

        if (addModal) {
          addModal.hide();
        }

        // je remets les flags a zero
        editMode = false;
        currentEditId = null;

        loadMarkers();
      })
      .catch(function(err) {
        console.error("Erreur save:", err);
        alert("Erreur lors de l'enregistrement du restaurant.");
      });
  });
}


