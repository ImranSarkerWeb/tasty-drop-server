//& Updating a restaurant info by it's id
app.put("/partner/:id", async (req, res) => {
  const partnerId = req.params.id;
  const data = req.body;
  try {
    const filter = { _id: new ObjectId(partnerId) };
    const updatedDoc = {
      $set: {
        ...data,
      },
    };
    const result = await partnerCollection.updateOne(filter, updatedDoc);
    if (result.modifiedCount > 0) {
      res.json({
        success: true,
        message: "Partner information updated successfully!",
        result,
      });
    } else {
      res
        .status(404)
        .json({ success: false, message: "Partner info not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

//& Getting all the orders from the order collection by restaurant id
app.get("/orders/partner/:id", async (req, res) => {
  try {
    const restaurantId = req.params.id;
    const partnerOrders = await orderCollection
      .find({
        restaurantId: restaurantId,
      })
      .toArray();

    if (!partnerOrders) {
      return res.status(404).json({ message: "Partner not found" });
    }

    res.json(partnerOrders);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
