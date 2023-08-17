const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');

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

const verifyJwt =(req,res,next)=>{
  const authorization = req.headers.authorization
  if(!authorization){
    return res.status(401).send({error : true , message:'unauthorized access'})
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token,process.env.JWT_SECREAT,(err,decoded)=>{
    if(err){
      return res.status(401).send({error: true , message : 'unauthorized token'})
    }
    req.decoded = decoded
    next()
  })
}


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
// console.log(process.env.JWT_SECREAT)

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const reviewCollection = client.db("tastyDB").collection("reviews");
    const usersCollection = client.db("tastyDB").collection("users");

    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // jwt apis
    app.post('/jwt',async (req,res)=>{
      const email = req.body 
      const token = jwt.sign({email},process.env.JWT_SECREAT,{ expiresIn: '1h' })
      res.send({token})
    })
    // users apis 
    app.post('/users',async(req,res)=>{
      const user = req.body
      console.log(user)
      const findEmail = await usersCollection.findOne({email : user.email })
      if(user.email == findEmail?.email){
        return res.send({message: "already exist "})
      }
      const result = await usersCollection.insertOne(user)
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
  res.send("Tasty drop on the way toooo!");
});
app.listen(port, () => {
  console.log("Tasty drop runnig at port ", port);
});
