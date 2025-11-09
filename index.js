const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 4000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

// Server Test
app.get("/", (req, res) => {
  res.send("My Freelance MarketPlace Api Running Now");
});

// MongoDB Connect
const uri = `mongodb+srv://${process.env.VIT_DATABASE_USER}:${
  process.env.VIT_DATABASE_PASSWOOORD
}@clustermyfirstmongodbpr.2cecfoe.mongodb.net/?appName=ClusterMyFirstMongoDbProject`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});





async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
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

app.listen(port, () => {
  console.log(`My Freelance MarketPlace Api running port : ${port}`);
});
