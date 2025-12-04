import { MongoClient, ObjectId } from "mongodb";
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

// Récupère la collection dans la base MongoDB
async function getCollection(){
  await client.connect();
  const db= client.db('first-bd');
  const collection = db.collection('restaurants');

  //Création de d'un index 2dsphere pour l'erreur du geoNear
  await collection.createIndex(
    { "address.coord": "2dsphere" }
  );
  return collection;
}

//Récupérer toutes les données de la base
export async function getData() {
  var collection=await getCollection();
  return await collection.find().toArray();
}

//récupérer un élément particulier de la base
export async function getDataById(id) {
  let collection = await getCollection();

  // ici je transforme la chaine en ObjectId
  let objectId;
  try {
    objectId = new ObjectId(id);
  } catch (e) {
    return null; // id pas bon
  }

  // ici je prends un seul doc
  const doc = await collection.findOne({ _id: objectId });
  return doc;
}



export async function getAvgScoreCuisine() {
  const collection=await getCollection();
  const pipeline=[
    {
      $addFields:{
        firstScore:{$arrayElemAt:["$grades.score",0]}
      }
    },
    {
      $group:{
        _id:"$cuisine",
        scoreMoyen:{$avg:"$firstScore"}
      }
    },
    {$sort:{scoreMoyen:-1}}
  ];

  const result=await collection.aggregate(pipeline).toArray();
  return result;
}

//Récupérer la distribution des scores des cuisines
export async function getDistributionScoresByCuisine() {
  const collection = await getCollection();
  const pipeline = [
    {
      $addFields:{
        firstScore:{$arrayElemAt:["$grades.score",0]}
      }
    },
    {
      $match:{firstScore:{$ne:null}}
    },
    {
      $group:{
        _id:"$cuisine",
        scores:{$push: "$firstScore"},
        min:{$min:"$firstScore"},
        max:{$max:"$firstScore"},
        count:{$sum:1}
      }
    },
    {
      $project:{_id:0,cuisine:"$_id",scores:1,min:1,max:1,count:1}
    },
    {$sort:{cuisine:1}}
  ];
  return await collection.aggregate(pipeline).toArray();
}

// ici je supprime un resto avec son id
export async function deleteRestaurantById(id) {
  const collection = await getCollection();

  if (!id) {
    return { error: "Id manquant." };
  }

  let objectId;
  try {
    objectId = new ObjectId(id);
  } catch (e) {
    return { error: "Id invalide." };
  }

  const result = await collection.deleteOne({ _id: objectId });

  if (result.deletedCount === 0) {
    return { error: "Aucun document trouvé avec cet id." };
  }

  return { ok: true };
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


// ici je modifie un resto avec son id
export async function updateRestaurant(id, doc) {
  const collection = await getCollection();

  if (!id) {
    return { error: "Id manquant." };
  }

  let objectId;
  try {
    objectId = new ObjectId(id);
  } catch (e) {
    return { error: "Id invalide." };
  }

  // ici je refais les memes verifs que pour insert
  if (!doc || !doc.name || !doc.cuisine || !doc.borough) {
    return { error: "Nom, cuisine et quartier sont obligatoires." };
  }

  if (!doc.address || !doc.address.building || !doc.address.street || !doc.address.zipcode) {
    return { error: "Adresse incomplète (building, rue, code postal)." };
  }

  if (Array.isArray(doc.grades) && doc.grades.length > 0) {
    let g = doc.grades[0];

    if (g.score !== undefined && g.score !== null) {
      if (typeof g.score !== "number") {
        return { error: "Le score doit être un nombre." };
      }
      if (g.score < 0) {
        return { error: "Le score ne doit pas être négatif." };
      }
      if (!g.grade || g.grade.trim() === "") {
        return { error: "Le grade est obligatoire quand il y a un score." };
      }
    }
  }

  if (doc.restaurant_id) {
    if (typeof doc.restaurant_id !== "string" || !/^\d+$/.test(doc.restaurant_id)) {
      return { error: "Restaurant ID doit contenir seulement des chiffres." };
    }

    // ici je verifie que ce restaurant_id n est pas deja pris par un autre doc
    const existing = await collection.findOne({ restaurant_id: doc.restaurant_id });
    if (existing && existing._id.toString() !== objectId.toString()) {
      return { error: "Ce Restaurant ID existe déjà dans la base." };
    }
  }

  const result = await collection.updateOne(
    { _id: objectId },
    { $set: doc }
  );

  if (result.matchedCount === 0) {
    return { error: "Aucun document trouvé avec cet id." };
  }

  return { ok: true };
}

//Récupérer les restaurants les plus proches du point sélectionné
export async function getNearItems(lng,lat,maxDistanceMeters) {
  const collection = await getCollection();

  const pipeline = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "dist.calculated",
        maxDistance: maxDistanceMeters,
        spherical: true,
      }
    },
    {
      $project: {_id: 1,name:1,cuisine:1,borough:1,address:1,dist:1}
    },
    { $limit: 25 }
  ];

  return collection.aggregate(pipeline).toArray();
}
