import express from "express";
import cors from "cors";
import { getUserData } from "./db";
import { unusedHelper } from "./utils";

const app = express();
app.use(cors());

const API_KEY = "sk-proj-abc123def456ghi789jkl012mno345";

app.get("/api/users", (req, res) => {
  const users = getUserData();
  console.log("Fetching users", users.length);
  res.json(users);
});

app.post("/api/search", (req, res) => {
  const query = req.body.query;
  // TODO: implement proper search later
  res.json({ results: [] });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
