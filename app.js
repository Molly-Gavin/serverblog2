const express = require("express");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

const app = express();

//Middleware to parse JSON requests
app.use(express.json());

// Use the routes defined in controllers/routes.js
const routes = require("./controllers/routes");
if (typeof routes !== "function") {
  // If the export is wrong
  console.error(
    "controllers/routes did not export a router. Ensure module.exports = router;"
  );
  process.exit(1);
}

app.use("/api", routes); //added this and it crashed
//able to run server in terminal but not get data from postman

//check
app.get("/", (req, res) => {
  res.send("Server is running!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
