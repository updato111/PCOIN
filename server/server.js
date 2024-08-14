import express from "express";
import createError from "http-errors";
import cors from "cors";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import userRoutes from "./routes/users.route.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(join(__dirname, "uploads")));

app.use("/api/users", userRoutes);

app.use(async (req, res, next) => {
  next(createError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500);
  res.send({
    error: {
      status: err.statusCode || 500,
      message: err.message,
    },
  });
});

app.listen(3000, () => console.log("listening on port 3000"));
