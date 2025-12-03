import { MongoClient } from "mongodb";
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

// Récupère la collection dans la base MongoDB
async function getCollection(){
  await client.connect();
  const db = client.db('first-bd');
  const collection = db.collection('restaurants');
  return collection;
}

export async function getData() {
  var collection = await getCollection();
  return await collection.find().toArray();
}

export async function getDataById(id) {
  var collection = await getCollection();
  return await collection.find({"_id":id}).toArray();
}

export async function getAvgScoreCuisine() {
  const collection = await getCollection();
  const pipeline = [
    {
      $addFields: {
        firstScore: { $arrayElemAt: ["$grades.score", 0] }
      }
    },
    {
      $group: {
        _id: "$cuisine",
        scoreMoyen: { $avg: "$firstScore" }
      }
    },
    { $sort: { scoreMoyen: -1 } }
  ];

  const result = await collection.aggregate(pipeline).toArray();
  return result;
}

export async function getDeleteById(id) {
  var collection = await getCollection();
  return await collection.deleteOne({"_id":id})
}

export async function insertRestaurant(doc) {
  // ici je prends la collection
  var collection = await getCollection();

  // ici je verifie que le doc existe et que les champs importants sont la
  if (!doc || !doc.name || !doc.cuisine || !doc.borough) {
    return { error: "Nom, cuisine et quartier sont obligatoires." };
  }

  // ici je verifie l adresse
  if (!doc.address || !doc.address.building || !doc.address.street || !doc.address.zipcode) {
    return { error: "Adresse incomplète (building, rue, code postal)." };
  }

  // ici je verifie le score et le grade (si il y a une note)
  if (Array.isArray(doc.grades) && doc.grades.length > 0) {
    let g = doc.grades[0];

    // si il y a un score, je verifie qu il n est pas negatif
    if (g.score !== undefined && g.score !== null) {
      if (typeof g.score !== "number") {
        return { error: "Le score doit être un nombre." };
      }
      if (g.score < 0) {
        return { error: "Le score ne doit pas être négatif." };
      }
      // si il y a un score, je veux un grade
      if (!g.grade || g.grade.trim() === "") {
        return { error: "Le grade est obligatoire quand il y a un score." };
      }
    }
  }

  // ici je verifie restaurant_id si il est present
  if (doc.restaurant_id) {
    // je veux seulement des chiffres dans restaurant_id
    if (typeof doc.restaurant_id !== "string" || !/^\d+$/.test(doc.restaurant_id)) {
      return { error: "Restaurant ID doit contenir seulement des chiffres." };
    }

    // je verifie qu il n existe pas deja dans la base
    const existing = await collection.findOne({ restaurant_id: doc.restaurant_id });
    if (existing) {
      return { error: "Ce Restaurant ID existe déjà dans la base." };
    }
  }

  // ici j ajoute dans la base
  const result = await collection.insertOne(doc);
  return result;
}


/*export async function postData(p){
  var collection = await getCollection();
  return await collection.insertMany(p);
}

export async function postDataForm(r){
  var collection = await getCollection();

  const {
    name,
    cuisine,
    pollution,
    lng,
    lat
  } = r;

  if (!name || !cuisine || !pollution || !lng || !lat) {
    return "Champs manquants.";
  }

  const doc = {
    name: name,
    cuisine: cuisine,
    pollution: pollution,
    location: {
      type: "Point",
      coordinates: [lng,lat]
    }
  };

  return await collection.insertOne(doc);
}*/