const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 4000;
const admin = require("firebase-admin");
require("dotenv").config();

// firebase configs
// index.js
const decoded = Buffer.from(process.env.VIT_FIREBASE_ADMIN, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// MidelWier
app.use(cors());
app.use(express.json());

const firebaseVerifyMidel = async (req, res, next) => {
  const hade = req.headers.authorization;
  if (!hade) {
    return res.status(401).send({ message: "Unother Access" });
  }
  const token = hade.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unother Access" });
  }

  try {
    const verify = await admin.auth().verifyIdToken(token);
    req.test_email = verify.email;
    console.log(verify);
    next();
  } catch {
    return res.status(401).send({ message: "Unother Access" });
  }
};

// Server Test
app.get("/", (req, res) => {
  res.send("My Freelance MarketPlace Api Running Now");
});

// MongoDB Connect
const uri = `mongodb+srv://${process.env.VIT_DATABASE_USER}:${process.env.VIT_DATABASE_PASSWOOORD}@clustermyfirstmongodbpr.2cecfoe.mongodb.net/?appName=ClusterMyFirstMongoDbProject`;
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
    const allDataDB = client.db("freelancing");
    const jobCollection = allDataDB.collection("allJobs");
    const accespetJob = allDataDB.collection("jobaccespet");

    // all Jobs Apis
    app.post("/jobs", firebaseVerifyMidel, async (req, res) => {
      if (!req.test_email) {
        return res.status(401).send({ message: "Unother Access" });
      }
      const data = req.body;
      const result = await jobCollection.insertOne(data);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.patch("/jobs/:id", async (req, res) => {
      // if (!req.test_email) {
      //   return res.status(401).send({ message: "Unother Access" });
      // }
      const id = req.params.id;
      const data = req.body;
      console.log({ id, data });
      const query = { _id: new ObjectId(id) };
      const seter = {
        $set: data,
      };
      const result = await jobCollection.updateOne(query, seter);
      res.send(result);
    });

    // letes 6 job now
    app.get("/letes", async (req, res) => {
      const data = jobCollection.find().sort({ create_at: -1 }).limit(6);
      const result = await data.toArray();
      res.send(result);
    });

    // Accespet Post
    app.post("/task", async (req, res) => {
      const data = req.body;
      const result = await accespetJob.insertOne(data);
      res.send(result);
    });
    app.get("/task", firebaseVerifyMidel, async (req, res) => {
      const query = {};
      if (req.query.email) {
        query.email = req.query.email;
      }
      if (req.query.email !== req.test_email) {
        return res.status(403).send({ message: "Not  access real user" });
      }
      const result = await accespetJob
        .find({ acceptsUserEmail: query.email })
        .toArray();
      res.send(result);

      console.log(result);
    });

    app.delete("/task/:id", firebaseVerifyMidel, async (req, res) => {
      if (req.query.email !== req.test_email) {
        return res.status(403).send({ message: "Not  access real user" });
      }
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await accespetJob.deleteOne(query);
      res.send(result);
      console.log(result);
    });

    // myadds Jobs Api
    app.get("/myadd", async (req, res) => {
      
      const query = {};
      if (req.query.email) {
        query.email = req.query.email;
      }
      const result = await jobCollection
        .find({ userEmail: query.email })
        .toArray();
      res.send(result);
      console.log("This is myadd api", result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`My Freelance MarketPlace Api running port : ${port}`);
});
