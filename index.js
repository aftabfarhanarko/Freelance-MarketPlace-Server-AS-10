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
    const reatingCollections = allDataDB.collection("reating");

    app.delete("/usersdelete/:id", async (req, res) => {
      try {
        const { id } = req.params; // params থেকে id বের করলাম
        // console.log("Deleting user w8ith ID:", id);

        const query = { _id: new ObjectId(id) };
        const result = await userCollections.deleteOne(query);
        // console.log("Delete result:", result);

        if (result.deletedCount === 1) {
          res
            .status(200)
            .send({ message: "User deleted successfully", ...result });
        } else {
          res.status(404).send({ message: "User not found" });
        }
      } catch (error) {
        console.error("Delete error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

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
      // console.log("This is user response:", data);

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

      // console.log(result);
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

    // User Updeat
    app.patch("/updeatNowUser/:id", async (req, res) => {
      const { id } = req.params;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const seter = {
        $set: data,
      };

      const result = await userCollections.updateOne(query, seter);
    });

    // Reating
    app.post("/reviews", async (req, res) => {
      const data = req.body;
      const result = await reatingCollections.insertOne(data);
      res.send(result);
    });

    app.get("/reviewsJobs/:id", async (req, res) => {
      try {
        // Extract id value properly from params
        const { id } = req.params;

        // Query to match jobId (assuming jobId is stored as a string)
        const query = { jobId: id };

        // Use find() returns a cursor, so convert to array to get documents
        const result = await reatingCollections.find(query).toArray();

        // Send the array of matching documents as JSON
        res.json(result);
      } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // Usere Profile Data
    app.get("/updeatProfile", async (req, res) => {
      const { email } = req.query;
      console.log(email);

      const result = await userCollections.findOne({ email: email });
      console.log(result);

      res.send(result);
    });

    app.patch("/updateUserData/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const data = req.body;

        const query = { _id: new ObjectId(id) };
        const update = {
          $set: data,
        };

        const result = await userCollections.updateOne(query, update);

        res.json(result);
      } catch (error) {
        console.error("User update error:", error);
        res.status(500).json({ message: "Failed to update user data" });
      }
    });

    app.get("/queryData", async (req, res) => {
      const { email } = req.query;
      // console.log(email);

      const result = await userCollections.findOne({ email: email });
      // console.log({ role: result.role }, email);

      res.send({ role: result.role });
    });

    app.patch("/roleUpdeat/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { role } = req.body; // ✅ body থেকে role নাও
        // console.log(id, role);

        const result = await userCollections.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: { role }, // ✅ only role string
          }
        );

        res.status(200).send(result);
        // console.log(result);
      } catch (error) {
        res.status(500).send({ message: "Update failed" });
      }
    });

    // Total Accepts Jobs Collections
    app.get("/adminjobs", async (req, res) => {
      const result = await accespetJob.find({}).toArray();

      res.status(200).json({
        message: "This is All User Accepted Jobs List",
        result,
      });
    });

    app.get("/alljobsShowDashbord", async (req, res) => {
      const { limit, skip } = req.query;
      const result = await jobCollection
        .find()
        .limit(Number(limit))
        .skip(Number(skip))
        .toArray();
      const count = await jobCollection.countDocuments();
      res.send({ result, count });
    });

    app.delete("/dashbordJobDelete/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/allusersPipeline", async (req, res) => {
      try {
        const result = await userCollections
          .aggregate([
            {
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
              $group: {
                _id: "$registerDate",
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                date: "$_id",
                count: 1,
              },
            },
            {
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

    app.get("/acceptsSallery", async (req, res) => {
      try {
        const pipeline = [
          {
            // Convert create_at string to Date
            $addFields: {
              createAtDate: { $dateFromString: { dateString: "$create_at" } },
              salaryDouble: { $toDouble: "$sallery" },
            },
          },
          {
            // Group by year, month, day extracted from createAtDate
            $group: {
              _id: {
                year: { $year: "$createAtDate" },
                month: { $month: "$createAtDate" },
                day: { $dayOfMonth: "$createAtDate" },
              },
              dailyCount: { $sum: 1 },
              dailySalarySum: { $sum: "$salaryDouble" },
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1,
              "_id.day": 1,
            },
          },
          {
            $project: {
              _id: 0,
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: {
                    $dateFromParts: {
                      year: "$_id.year",
                      month: "$_id.month",
                      day: "$_id.day",
                    },
                  },
                },
              },
              count: "$dailyCount",
              totalSalary: "$dailySalarySum",
            },
          },
        ];

        const dailyData = await accespetJob.aggregate(pipeline).toArray();

        // Total count and salary (convert sallery string to double)
        const totalAggregation = await accespetJob
          .aggregate([
            {
              $addFields: {
                salaryDouble: { $toDouble: "$sallery" },
                createAtDate: { $dateFromString: { dateString: "$create_at" } },
              },
            },
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                totalSalary: { $sum: "$salaryDouble" },
              },
            },
          ])
          .toArray();

        const totalCount = totalAggregation[0]?.totalCount || 0;
        const totalSalary = totalAggregation[0]?.totalSalary || 0;

        res.json({
          totalCount,
          totalSalary,
          dailyData,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.get("/allcountdata", async (req, res) => {
      try {
        // Count total jobs
        const totalJobs = await jobCollection.countDocuments();

        // Count total accepted jobs
        const totalAcceptedJobs = await accespetJob.countDocuments();

        // Count total users
        const totalUsers = await userCollections.countDocuments();

        // Sum total sallery in accespetJob collection
        const salaryAggregation = await accespetJob
          .aggregate([
            {
              $group: {
                _id: null,
                totalSalary: { $sum: { $toDouble: "$sallery" } },
              },
            },
          ])
          .toArray();

        const totalSalary = salaryAggregation[0]?.totalSalary || 0;

        // Return all counts and total salary in JSON
        res.json({
          totalJobs,
          totalAcceptedJobs,
          totalUsers,
          totalSalary,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    // NNew Pipeline
    app.get("/allusernadJob", async (req, res) => {
      try {
        // Get latest 4 jobs sorted by create_at descending
        const latestJobs = await jobCollection
          .find({})
          .sort({ create_at: -1 })
          .limit(4)
          .toArray();

        // Get latest 4 users sorted by createdAt descending
        const latestUsers = await userCollections
          .find({})
          .sort({ createdAt: -1 })
          .limit(4)
          .toArray();

        res.json({
          latestJobs,
          latestUsers,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
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

    // ============================================
    // COMPLETE BACKEND API CODE

    // Main Jobs API with all filters
    app.get("/jobs", async (req, res) => {
      try {
        const {
          search,
          category,
          sortBy,
          sortOrder,
          page = 1,
          limit = 12,
          minPrice,
          maxPrice,
        } = req.query;

        // Build query object
        let query = {};

        // Search filter (searches in title, description, company)
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { company: { $regex: search, $options: "i" } },
            { skills: { $regex: search, $options: "i" } },
          ];
        }

        // Category filter
        if (category && category !== "All") {
          query.category = category;
        }

        // Price range filter
        if (minPrice || maxPrice) {
          query.salary = {};
          if (minPrice) query.salary.$gte = Number(minPrice);
          if (maxPrice) query.salary.$lte = Number(maxPrice);
        }

        // Build sort object
        let sort = {};
        if (sortBy === "price") {
          sort.salary = sortOrder === "asc" ? 1 : -1;
        } else if (sortBy === "date") {
          sort.create_at = sortOrder === "asc" ? 1 : -1;
        } else {
          // Default sort by newest
          sort.create_at = -1;
        }

        // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Get total count for pagination
        const totalJobs = await jobCollection.countDocuments(query);
        const totalPages = Math.ceil(totalJobs / limitNum);

        // Fetch jobs with filters
        const jobs = await jobCollection
          .find(query)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .toArray();

        // Send response with pagination info
        res.send({
          success: true,
          data: jobs,
          pagination: {
            currentPage: pageNum,
            totalPages: totalPages,
            totalJobs: totalJobs,
            jobsPerPage: limitNum,
            hasNextPage: pageNum < totalPages,
            hasPrevPage: pageNum > 1,
          },
        });
      } catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch jobs",
          error: error.message,
        });
      }
    });

    // Get single job by ID
    app.get("/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await jobCollection.findOne(query);

        if (!result) {
          return res.status(404).send({
            success: false,
            message: "Job not found",
          });
        }

        res.send({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("Error fetching job:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch job",
          error: error.message,
        });
      }
    });

    // Get all categories (for dropdown)
    app.get("/categories", async (req, res) => {
      try {
        const categories = await jobCollection.distinct("category");
        res.send({
          success: true,
          data: categories,
        });
      } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch categories",
          error: error.message,
        });
      }
    });

    // Get price range (min and max salary from all jobs)
    app.get("/price-range", async (req, res) => {
      try {
        const minPrice = await jobCollection
          .find()
          .sort({ salary: 1 })
          .limit(1)
          .toArray();
        const maxPrice = await jobCollection
          .find()
          .sort({ salary: -1 })
          .limit(1)
          .toArray();

        res.send({
          success: true,
          data: {
            min: minPrice[0]?.salary || 0,
            max: maxPrice[0]?.salary || 10000,
          },
        });
      } catch (error) {
        console.error("Error fetching price range:", error);
        res.status(500).send({
          success: false,
          message: "Failed to fetch price range",
          error: error.message,
        });
      }
    });

    // Legacy endpoints for backward compatibility (optional)
    app.get("/filtersOn", async (req, res) => {
      try {
        const filter = req.query.filter;
        const query = filter && filter !== "All" ? { category: filter } : {};
        const result = await jobCollection
          .find(query)
          .sort({ create_at: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    app.get("/sorting", async (req, res) => {
      try {
        const result = await jobCollection.find().sort({ salary: 1 }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });

    app.get("/sorting2", async (req, res) => {
      try {
        const result = await jobCollection
          .find()
          .sort({ salary: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
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

    // Modifey jobs
    app.patch("/modifeyjobes/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;
        // console.log("Updeat Now", id,updatedData);
        

        const filter = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: {
            ...updatedData,
            updatedAt: new Date().toISOString(),
          },
        };

        const result = await jobCollection.updateOne(filter, updateDoc);

        res.json(result);
      } catch (error) {
        res.status(500).json({
          message: "Job update failed",
          error,
        });
      }
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
      // console.log(result);
    });
    app.get("/sorting2", async (req, res) => {
      const data = jobCollection.find().sort({ create_at: -1 });
      const result = await data.toArray();
      res.send(result);
      // console.log(result);
    });

    // Search Catagory
    app.get("/filtersOn", async (req, res) => {
      const data = req.query.filter;
      const result = await jobCollection.find({ category: data }).toArray();
      res.send(result);
      // console.log("Reques Fontend ", data);
    });
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`My Freelance MarketPlace Api running port : ${port}`);
});
