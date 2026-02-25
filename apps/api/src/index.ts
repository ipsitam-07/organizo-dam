import express from "express";
import { config } from "./config";
import { connectRedis } from "./services/redis";

const app = express();
app.use(express.json());

// Health check route
app.get("/health/auth", (_req, res) => {
  res.status(200).send("OK");
});

const startServer = async () => {
  try {
    await connectRedis();

    app.listen(config.port, () => {
      console.log(`Listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start:", error);
    process.exit(1);
  }
};

startServer();
