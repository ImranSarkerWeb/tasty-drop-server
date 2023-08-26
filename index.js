const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const port = process.env.PORT || 5000;

const morgan = require("morgan");

// middleware;
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(morgan("dev"));

const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  console.log(token);
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized token" });
    }
    req.decoded = decoded;
    console.log(decoded);
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h5nkbla.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
// console.log(process.env.JWT_SECRET)

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("tastyDB").collection("users");
    const reviewCollection = client.db("tastyDB").collection("reviews");
    const restaurantCollection = client.db("tastyDB").collection("dishsData");
    const riderCollection = client.db("tastyDB").collection("rider");
    const partnerCollection = client.db("tastyDB").collection("partner");
    const businessCollection = client.db("tastyDB").collection("business");

    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/api/restaurants", async (req, res) => {
      const location = req.query.location;
      console.log(`city name: ${location}`);
      if (!location) {
        res.send([]);
      }
      const query = { location: location };
      const result = await restaurantCollection.find(query).toArray();
      res.send(result);
    });

    //Search field API
    app.get("/api/all-restaurants", async (req, res) => {
      const result = await restaurantCollection.find().toArray();
      res.send(result);
    });

    // Single restaurant data API
    app.get("/singleRestaurant/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await restaurantCollection.findOne(query);
      res.send(result);
    });

    // business apis
    app.post("/business", verifyJwt, async (req, res) => {
      const data = req.body;
      const filter = { email: data?.email };
      const findUserusers = await usersCollection.findOne(filter);
      const updateDoc = {
        $set: {
          ...findUserusers,
          role: "business",
        },
      };
      const result1 = await usersCollection.updateOne(filter, updateDoc);
      const result2 = await businessCollection.insertOne(data);
      res.send({ result1, result2 });
      const isExistInRider = await riderCollection.findOne(filter);
      const isExistInPartner = await partnerCollection.findOne(filter);
      if (isExistInRider) {
        const result3 = await riderCollection.deleteOne(filter);
        res.send(result3);
      }
      if (isExistInPartner) {
        const result4 = await partnerCollection.deleteOne(filter);
        res.send(result4);
      }
    });
    // rider apis
    app.post("/rider", verifyJwt, async (req, res) => {
      const data = req.body;
      const filter = { email: data?.email };
      const findUserusers = await usersCollection.findOne(filter);
      const updateDoc = {
        $set: {
          ...findUserusers,
          role: "rider",
        },
      };
      const result1 = await usersCollection.updateOne(filter, updateDoc);
      const result2 = await riderCollection.insertOne(data);
      res.send({ result1, result2 });
      const isExistInBusiness = await businessCollection.findOne(filter);
      const isExistInPartner = await partnerCollection.findOne(filter);
      if (isExistInBusiness) {
        const result3 = await businessCollection.deleteOne(filter);
        res.send(result3);
      }
      if (isExistInPartner) {
        const result4 = await partnerCollection.deleteOne(filter);
        res.send(result4);
      }
    });

    // Partner apis for restaurants

    app.post("/partner", async (req, res) => {
      const data = req.body;
      const filter = { email: data?.email };
      const findUserusers = await usersCollection.findOne(filter);
      if (data.outletName) {
        const updateDoc = {
          $set: {
            ...findUserusers,
            role: "partner",
          },
        };
        const result1 = await usersCollection.updateOne(filter, updateDoc);
        const result2 = await partnerCollection.insertOne(data);
        res.send({ result1, result2 });
        const isExistInBusiness = await businessCollection.findOne(filter);
        const isExistInRider = await riderCollection.findOne(filter);
        if (isExistInBusiness) {
          const result3 = await businessCollection.deleteOne(filter);
          res.send(result3);
        }
        if (isExistInRider) {
          const result4 = await riderCollection.deleteOne(filter);
          res.send(result4);
        }
      } else {
        const partnersData = await partnerCollection.findOne(filter);

        // Add the entire data object to the menu array
        if (partnersData) {
          const updatedMenu = [...(partnersData.menu || []), data];
          const result5= await partnerCollection.updateOne(filter, {
            $set: { menu: updatedMenu },
          });
          res.send(result5)
        }
      }
    });

    // jwt apis
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      console.log(req.decoded);
      const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // users apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const findEmail = await usersCollection.findOne({ email: user.email });
      if (user.email == findEmail?.email) {
        return res.send({ message: "already exist " });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", verifyJwt, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Api for geting user roles
    app.get('/userRole',verifyJwt,async (req,res)=>{
      const {email} = req.query
      const options = {
        projection: {  role: 1 },
      }
      const result = await usersCollection.findOne({email: email},options)
      res.send(result)
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
