//Imports
import express from "express";
import { getData } from "./db.js";
import { postData } from "./db.js";
import { postDataForm } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (HTML, JS, CSS)
app.use(express.static(path.join(__dirname, "public")));

// Route API pour récupérer les données MongoDB
app.get("/data", async (req, res) => {
  try {
    const data = await getData();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
});


// Route API pour modifier les données MongoDB
app.post("/inject", async (req,res) => {
  try {
    var response = await postData(req.body);
    res.json(response);
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'écriture des données" });
  }
});

// Route API pour ajouter une entrée MongoDB
app.post("/add", async (req, res) => {
  try {
    (!req.body)
    console.log("Body reçu du formulaire :", req.body);
    const response = await postDataForm(req.body);
    console.log("Response de la base :", response)
    res.redirect("/");
  }catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'écriture des données" });
  }
});

// Lancement du serveur
const PORT = 3000;
app.listen(PORT, () => console.log(`Serveur en ligne : http://localhost:${PORT}`));
