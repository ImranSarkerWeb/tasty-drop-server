const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.port || 5000;

//middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Tasty drop on the way!");
});
app.listen(port, () => {
  console.log("Tasty drop runnig at port ", port);
});
