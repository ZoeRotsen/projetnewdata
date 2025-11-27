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

export async function getData(id) {
  var collection = await getCollection();
  return await collection.find({"_id":id}).toArray();
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