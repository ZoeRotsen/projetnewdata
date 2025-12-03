import express from "express";

import {
  getData,
  getAvgScoreCuisine,
  insertRestaurant,
  getDataById,
  updateRestaurant,
  deleteRestaurantById
} from "./db.js";

import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, "public")));

// Route API pour renvoyer tous les points
app.get("/api/items", async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
});


// Route API pour ajouter un restaurant
app.post("/api/items", async (req, res) => {
  try {
    console.log("Body reçu du formulaire :", req.body); // je regarde ce qui arrive

    const result = await insertRestaurant(req.body);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    // je renvoie le resultat de l insert
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout du restaurant" });
  }
});



// Route API pour renvoyer la moyenne par cuisine
app.get("/api/items/avg/cuisine", async (req, res) => {
  try {
    const data = await getAvgScoreCuisine();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({error:"Erreur lors de la récupération des données"});
  }
});


// Route API pour renvoyer un point spécifique
app.get("/api/items/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const data = await getDataById(id);

    if (!data) {
      return res.status(404).json({ error: "Restaurant non trouvé" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
});


// Route API pour modifier un restaurant
app.put("/api/items/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const doc = req.body;

    console.log("Update reçu pour id :", id, "doc:", doc);

    const result = await updateRestaurant(id, doc);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la modification du restaurant" });
  }
});


// Route API pour supprimer un restaurant
app.delete("/api/items/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await deleteRestaurantById(id);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression du restaurant" });
  }
});


// Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur en ligne : http://localhost:${PORT}`));
