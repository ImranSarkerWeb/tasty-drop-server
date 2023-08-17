const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const morgan = require("morgan");
const port = process.env.port || 5000;

// middleware
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h5nkbla.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Database collections

    const reviewCollection = client.db("tastyDB").collection("reviews");
    const restaurantCollection = client.db("tastyDB").collection("dishsData");
    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/api/restaurants', async (req, res) => {
      const location = req.query.location;
      console.log(`city name: ${location}`);
      if (!location) {
        res.send([]);
      }
      const query = { location: location };
      const result = await restaurantCollection.find(query).toArray();
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Tasty drop on the way!");
});
app.listen(port, () => {
  console.log("Tasty drop running at port:", port);
});
