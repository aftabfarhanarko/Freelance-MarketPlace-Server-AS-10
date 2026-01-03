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
    // console.log(verify);
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
const uri = `mongodb+srv://${process.env.VIT_DATABASE_USER}:${process.env.VIT_DATABASE_PASSWORD}@clustermyfirstmongodbpr.2cecfoe.mongodb.net/?appName=ClusterMyFirstMongoDbProject`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const allDataDB = client.db("freelancing");
    const jobCollection = allDataDB.collection("allJobs");
    const accespetJob = allDataDB.collection("jobaccespet");
    // const reating = allDataDB.collection("reatingJob");
    const userCollections = allDataDB.collection("users");

    app.get("/categoryJob", async (req, res) => {
      try {
        const result = await jobCollection
          .aggregate([
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                category: "$_id",
                count: 1,
              },
            },
          ])
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    // User Data
    app.post("/users", async (req, res) => {
      const data = req.body;
      console.log("This is user response:", data);

      if (!data?.email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const isExisted = await userCollections.findOne({ email: data.email });
      if (isExisted) {
        return res.json({
          message: "Already user data saved in database",
        });
      }

      const result = await userCollections.insertOne(data); // নতুন ইউজার ইনসার্ট হচ্ছে
      res.send({
        message: "User data saved successfully",
        insertedId: result.insertedId,
      });

      console.log(result);
    });

    // All User
    app.get("/userData", firebaseVerifyMidel, async (req, res) => {
      if (!req.test_email) {
        return res.status(401).send({ message: "Unother Access" });
      }
      const result = await userCollections.find().toArray();
      res.json({
        message: "This is All User Data",
        result,
      });
    });

    // Total Accepts Jobs Collections
    app.get("/adminjobs", async (req, res) => {
      const result = await accespetJob.find({}).toArray();

      res.status(200).json({
        message: "This is All User Accepted Jobs List",
        result,
      });
    });

    app.get("/allusersPipeline", async (req, res) => {
      try {
        const result = await userCollections
          .aggregate([
            {
              // createdAt কে date এ convert করা
              $addFields: {
                registerDate: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: { $toDate: "$createdAt" },
                  },
                },
              },
            },
            {
              // প্রতিদিন অনুযায়ী group
              $group: {
                _id: "$registerDate",
                count: { $sum: 1 },
              },
            },
            {
              // সুন্দর response এর জন্য
              $project: {
                _id: 0,
                date: "$_id",
                count: 1,
              },
            },
            {
              // date অনুযায়ী sort
              $sort: { date: 1 },
            },
          ])
          .toArray();

        res.json({
          message: "Per day user registration count",
          result,
        });
      } catch (error) {
        res.status(500).json({
          message: "Something went wrong",
          error: error.message,
        });
      }
    });

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
      const result = await jobCollection
        .find()
        .sort({ create_at: -1 })
        .toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    // updeat
    app.patch("/updeat/:id", firebaseVerifyMidel, async (req, res) => {
      const id = req.params.id;
      const midelWearEmail = req.test_email;
      // console.log(midelWearEmail);

      const dataFetch = await jobCollection.findOne({ _id: new ObjectId(id) });

      if (!dataFetch) {
        return res.status(401).send({ message: " Job Not Found" });
      }

      if (dataFetch.userEmail !== midelWearEmail) {
        return res.send(401).send({ message: "Unauthorized  Access" });
      }

      const data = req.body;
      const edit = { _id: new ObjectId(id) };
      const seter = {
        $set: data,
      };
      const result = await jobCollection.updateOne(edit, seter);
      res.send(result);
    });

    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
      // console.log(result);
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

      // console.log(result);
    });

    app.delete("/task/:id", firebaseVerifyMidel, async (req, res) => {
      if (req.query.email !== req.test_email) {
        return res.status(403).send({ message: "Not  access real user" });
      }
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await accespetJob.deleteOne(query);
      res.send(result);
      // console.log("this is delet data now", { id }, { result });
      // console.log("this is delet data now", { id }, { result });
    });

    // myadds Jobs Api
    app.get("/myadd", firebaseVerifyMidel, async (req, res) => {
      if (req.query.email !== req.test_email) {
        return res.status(403).send({ message: "Not  access real user" });
      }
      const query = {};
      if (req.query.email) {
        query.email = req.query.email;
      }
      const result = await jobCollection
        .find({ userEmail: query.email })
        .toArray();
      res.send(result);
      // console.log("This is myadd api", result);
    });

    // sorting
    app.get("/sorting", async (req, res) => {
      const data = jobCollection.find().sort({ create_at: 1 });
      const result = await data.toArray();
      res.send(result);
      console.log(result);
    });
    app.get("/sorting2", async (req, res) => {
      const data = jobCollection.find().sort({ create_at: -1 });
      const result = await data.toArray();
      res.send(result);
      console.log(result);
    });

    // Search Catagory
    app.get("/filtersOn", async (req, res) => {
      const data = req.query.filter;
      const result = await jobCollection.find({ category: data }).toArray();
      res.send(result);
      console.log("Reques Fontend ", data);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`My Freelance MarketPlace Api running port : ${port}`);
});
