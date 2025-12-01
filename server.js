import express from "express";

import { getData, getScoreMoyenCuisine } from "./db.js";
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

// Route API pour renvoyer la moyenne par cuisine
app.get("/api/items/moyenne/cuisine", async (req, res) => {
  try {
    const data = await getScoreMoyenCuisine();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
});

// Route API pour renvoyer un point spécifique
app.get("/api/items/:id", async (req, res) => {
  try {
    const id = req.params.id;
    (!id)
    const data = await getData(id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
});


// Route API pour ajouter un point
app.post("/api/items", async (req,res) => {
  try {
    var response = await postData(req.body);
    res.json(response);
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'écriture des données" });
  }
});

// Route API pour modifier un point
app.put("/api/items/:id", async (req, res) => {
  try {
    const id = req.params.id;
    (!req.body && !id)
    console.log("Body reçu du formulaire :", req.body);
    const response = await postDataForm(req.body);
    console.log("Response de la base :", response)
    res.redirect("/");
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'écriture des données" });
  }
});

// Route API pour renvoyer un point spécifique
app.delete("/api/items/:id", async (req, res) => {
  try {
    const id = req.params.id;
    (!id)
    const data = await deleteById(id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
});

// Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur en ligne : http://localhost:${PORT}`));
