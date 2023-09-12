const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const SSLCommerzPayment = require("sslcommerz-lts");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
  // console.log(token);
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized token" });
    }
    req.decoded = decoded;
    // console.log(decoded);
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
    await client.connect();

    const usersCollection = client.db("tastyDB").collection("users");
    const reviewCollection = client.db("tastyDB").collection("reviews");
    const riderCollection = client.db("tastyDB").collection("rider");
    const partnerCollection = client.db("tastyDB").collection("partner");
    const customerCollection = client.db("tastyDB").collection("customer");
    const businessCollection = client.db("tastyDB").collection("business");
    const divisionCollection = client.db("tastyDB").collection("division");
    const districtsCollection = client.db("tastyDB").collection("districts");
    const upazilasCollection = client.db("tastyDB").collection("upazilas");
    const orderCollection = client.db("tastyDB").collection("orders");

    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    //dynamic city based restaurant api call
    // app.get("/api/restaurants", async (req, res) => {
    //   const location = req.query.location;
    //   console.log(`city name: ${location}`);
    //   if (!location) {
    //     res.send([]);
    //   }
    //   // const query = { locationOfOutlet: location };
    //   const query = {"locations.district": location};
    //   const result = await partnerCollection.find(query).toArray();
    //   res.send(result);
    // });

    //Location based api call
    app.get("/api/searched-location/:searchQuery", async (req, res) => {
      try {
        const searchQuery = req.params.searchQuery;
        console.log("Received searchQuery:", searchQuery);

        //I used $or operator to query for documents where any of the specified fields match the searchQuery.
        //I used regex operator to perform case insensitive search.
        const result = await partnerCollection
          .find({
            $or: [
              { "locations.division": { $regex: searchQuery, $options: "i" } },
              { "locations.district": { $regex: searchQuery, $options: "i" } },
              { "locations.upazila": { $regex: searchQuery, $options: "i" } },
            ],
          })
          .toArray();

        res.json(result);
      } catch (error) {
        res.status(500).json({
          error: "Error fetching location data from partner-collection",
        });
      }
    });

    // Single restaurant data API
    app.get("/singleRestaurant/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await partnerCollection.findOne(query);
      res.send(result);
    });

    //partner api
    app.get("/partners", async (req, res) => {
      const result = await partnerCollection.find().toArray();
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

    // Partner Apis

    // Api for getting restaurant data
    app.get("/restaurants", async (req, res) => {
      const status = req.query.status; // Get the "status" query parameter from the request

      // Define a filter object to filter documents based on the "status" field
      const filter = {};

      // If "status" query parameter is provided, add it to the filter
      if (status === "pending") {
        filter.status = "pending";
      }

      // Use the filter object in the find query if it's not empty
      const result = Object.keys(filter).length
        ? await partnerCollection.find(filter).toArray()
        : await partnerCollection.find().toArray();

      res.send(result);
    });

    //update restaurant status
    app.put("/restaurants/:id/status", async (req, res) => {
      const restaurantId = req.params.id; // Get the restaurant ID from the URL parameters
      const { status } = req.body; // Get the new status from the request body

      try {
        // Update the document by ObjectId
        const result = await partnerCollection.updateOne(
          { _id: new ObjectId(restaurantId) },
          { $set: { status: status } }
        );

        if (result.modifiedCount === 1) {
          res
            .status(200)
            .json({ message: "Restaurant status updated successfully" });
        } else {
          res.status(404).json({ message: "Restaurant not found" });
        }
      } catch (error) {
        console.error("Error updating restaurant status:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    //& Getting all menu's from a restaurant by partner email
    app.get("/restaurant-data", async (req, res) => {
      try {
        const email = req.query.email;
        console.log(email);
        const partner = await partnerCollection.findOne({ email: email });
        if (!partner) {
          return res.status(404).json({ error: "Partner not found" });
        }
        res.send(partner.menu);
      } catch (error) {
        console.error("Error fetching restaurant data:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //& Api for deleting single menu items by id
    app.delete("/delete-menu-item/:email/:menuItemId", async (req, res) => {
      try {
        const { email, menuItemId } = req.params;

        // Find the item before deleting it
        const foundMenuItem = await partnerCollection.findOne({
          email,
          "menu._id": new ObjectId(menuItemId),
        });

        if (!foundMenuItem) {
          return res.status(404).json({ error: "Menu item not found" });
        }
        const result = await partnerCollection.updateOne(
          { email },
          { $pull: { menu: { _id: new ObjectId(menuItemId) } } }
        );

        if (result.modifiedCount === 0) {
          return res.status(404).json({ error: "Menu item not found" });
        }

        res.status(200).json({
          message: "Menu item deleted successfully!",
          deletedItem: foundMenuItem._id,
        });
      } catch (error) {
        console.error("Error deleting menu item:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    //& Api for updating single menu items
    app.put("/update-menu-item/:email/:menuItemId", async (req, res) => {
      try {
        const { email, menuItemId } = req.params;
        const updatedData = req.body;
        const partner = await partnerCollection.findOne({ email });

        const menuItem = partner.menu.find(
          (item) => item._id.toString() === menuItemId
        );

        if (!menuItem) {
          return res
            .status(404)
            .json({ success: false, message: "Menu item not found" });
        }

        if (menuItem.email !== email) {
          return res.status(403).json({
            success: false,
            message: "Unauthorized to update this menu item",
          });
        }

        Object.assign(menuItem, updatedData);

        await partnerCollection.updateOne(
          { email },
          { $set: { menu: partner.menu } }
        );

        return res
          .status(200)
          .json({ success: true, message: "Menu item updated successfully" });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    app.post("/partner", verifyJwt, async (req, res) => {
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
          //& Generate a new ObjectId for the menu item
          const menuItemId = new ObjectId();
          data._id = menuItemId;

          const updatedMenu = [...(partnersData.menu || []), data];
          const result5 = await partnerCollection.updateOne(filter, {
            $set: { menu: updatedMenu },
          });
          res.send(result5);
        }
      }
    });

    //& Getting all the orders from the partner collection
    app.get("/orders/partner", async (req, res) => {
      try {
        const partnerEmail = req.query.email;
        const partner = await partnerCollection.findOne({
          email: partnerEmail,
        });

        if (!partner) {
          return res.status(404).json({ message: "Partner not found" });
        }
        const orders = partner.order;

        res.json(orders);
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
      }
    });

    // jwt apis
    app.post("/jwt", async (req, res) => {
      const email = req.body;
      // console.log(req.decoded);
      const token = jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // users apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const findEmail = await usersCollection.findOne({ email: user.email });
      if (user.email == findEmail?.email) {
        return res.send({ message: "already exist " });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.get("/userRole", verifyJwt, async (req, res) => {
      const { email } = req.query;
      const options = {
        projection: { role: 1 },
      };
      const result = await usersCollection.findOne({ email: email }, options);
      res.send(result);
    });
    // get specific user data
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      res.send(user);
    });

    // update the user data
    app.patch("/user/:email", async (req, res) => {
      const email = req.params.email;
      const data = req.body;
      console.log(data);
      const filter = { email: email };
      const updateDoc = {
        $set: {
          ...data,
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/user/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await usersCollection.deleteOne(filter);
      res.send(result);
    });

    // location apis
    app.get("/division", async (req, res) => {
      const result = await divisionCollection.find().toArray();
      res.send(result);
    });

    app.get("/districts", async (req, res) => {
      const { data } = req.query;
      const filter = {
        division_id: data,
      };
      const result = await districtsCollection.find(filter).toArray();
      res.send(result);
    });

    app.get("/upazila", async (req, res) => {
      const { data } = req.query;
      const filter = {
        district_id: data,
      };
      const result = await upazilasCollection.find(filter).toArray();
      res.send(result);
    });

    // give all menu, //!what is the useCase of this api?
    app.get("/allDishesMenu", async (req, res) => {
      const pipeline = [
        {
          $unwind: "$menu",
        },
        {
          $replaceRoot: { newRoot: "$menu" },
        },
      ];
      const result = await partnerCollection.aggregate(pipeline).toArray();
      res.send(result);
    });

    //all order data....
    app.get("/api/orders", async (req, res) => {
      try {
        const client = new MongoClient(uri);
        await client.connect();
        console.log("Connected to MongoDB");

        const pipeline = [
          {
            $unwind: "$order",
          },
          {
            $replaceRoot: { newRoot: "$order" },
          },
        ];
        const result = await partnerCollection.aggregate(pipeline).toArray();

        res.send(result);
      } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).send("Internal Server Error");
      } finally {
        // Close the MongoDB client connection
        // await client.close();
        console.log("MongoDB connection closed");
      }
    });

    // Update delivery status when accepted by rider
    app.put("/api/orders/accept/:orderId", async (req, res) => {
      const { orderId } = req.params;
      console.log(orderId);
      try {
        await client.connect();

        // Create a new instance of ObjectId using the 'new' keyword
        const objectId = new ObjectId(orderId);
        console.log(objectId);

        // Update the delivery status to "Accepted by Rider"
        const result = await partnerCollection.updateOne(
          { "order._id": objectId }, // Use the objectId instance
          { $set: { "order.$.delivery": "Received by Rider" } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Order not found" });
        }

        res
          .status(200)
          .json({ message: "Delivery status updated to Accepted by Rider" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      } finally {
        // await client.close();
      }
    });

    // Update delivery status when declined by rider
    app.put("/api/orders/decline/:orderId", async (req, res) => {
      const { orderId } = req.params;

      try {
        // await client.connect();

        // Create a new instance of ObjectId using the 'new' keyword
        const objectId = new ObjectId(orderId);

        // Update the delivery status to "Declined by Rider"
        const result = await partnerCollection.updateOne(
          { "order._id": objectId }, // Match the order with the specified orderId
          { $set: { "order.$.delivery": "pending" } } // Update the delivery status
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "Order not found" });
        }

        res
          .status(200)
          .json({ message: "Delivery status updated to Declined by Rider" });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      } finally {
        // await client.close();
      }
    });

    // SSL commerce payment
    const store_id = process.env.STORE_ID;
    const store_password = process.env.STORE_PASSWORD;
    const is_live = false;
    const tranId = new ObjectId().toString();
    app.post("/order", async (req, res) => {
      const orderData = req.body;
      const id = orderData?.restaurantId;

      const data = {
        total_amount: orderData.totalPrice,
        currency: "BDT",
        tran_id: tranId, // use unique tran_id for each api call
        success_url: `${process.env.SERVER_URL}payment/success/${tranId}`, //this is the reason why we need cant payment successfully from live site.....
        fail_url: `${process.env.SERVER_URL}payment/fail/${tranId}`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: orderData?.customerData?.name,
        cus_email: orderData?.customerData?.email,
        cus_add1: orderData?.homeAddress?.area,
        cus_add2: orderData?.homeAddress?.upazila,
        cus_city: orderData?.homeAddress?.district,
        cus_state: orderData?.homeAddress?.district,
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: orderData?.customerData?.phone,
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };

      const sslcz = new SSLCommerzPayment(store_id, store_password, is_live);
      sslcz.init(data).then(async (apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });

        const query = { _id: new ObjectId(id) };
        const findRestaurant = await partnerCollection.findOne(query);
        orderData._id = new ObjectId();
        orderData.paymentStatus = false;
        orderData.transactionId = tranId;
        if (!findRestaurant?.order) {
          const newOrder = [...(findRestaurant.order || []), orderData];
          const result1 = await partnerCollection.updateOne(query, {
            $set: { order: newOrder },
          });
          // res.send(result1);
        } else {
          const existingOrder = findRestaurant.order || [];
          const newOrder = [...existingOrder, orderData];

          const result = await partnerCollection.updateOne(query, {
            $set: { order: newOrder },
          });

          if (result.modifiedCount > 0) {
            // Redirect the user to the payment gateway
            let GatewayPageURL = apiResponse.GatewayPageURL;
            res.send({ url: GatewayPageURL });
            console.log("Redirecting to: ", GatewayPageURL);
          } else {
            // Handle the case where the update failed
            res.status(500).json({ message: "Failed to update order" });
          }
        }
      });

      app.post("/payment/success/:tranId", async (req, res) => {
        const tranId = req.params.tranId;
        // console.log(tranId);
        const newPaymentStatus = true;

        const result = await partnerCollection.updateOne(
          {
            // _id: new ObjectId(resturenId),
            "order.transactionId": tranId,
          },
          {
            $set: {
              "order.$.paymentStatus": newPaymentStatus,
              "order.$.delivery": "pending",
            },
          }
        );
        // console.log(result);
        if (result && result.modifiedCount > 0) {
          res.redirect(`${process.env.LIVE_URL}payment/success/${tranId}`);
        }
      });
      app.post("/payment/fail/:tranId", async (req, res) => {
        const tranId = req.params.tranId;
        const result = await partnerCollection.updateOne(
          { "order.tranjectionId": tranId },
          { $pull: { order: { tranjectionId: tranId } } }
        );
        if (result.modifiedCount > 0) {
          res.redirect(`${process.env.LIVE_URL}payment/fail`);
        }
      });
    });

    // generate client secret
    // stripe payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      if (price) {
        const amount = parseFloat(price * 100);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      }
    });

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
  console.log("Tasty drop running at port:", port);
});
