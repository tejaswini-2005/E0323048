require("dotenv").config();

const express = require("express");
const { Log } = require("../logging_middleware");

const app = express();
app.use(express.json());

app.use(async (req, res, next) => {
  await Log(
    "backend",
    "info",
    "middleware",
    `Incoming request: ${req.method} ${req.originalUrl}`
  );

  next();
});

app.get("/health", async (req, res) => {
  await Log("backend", "debug", "route", "Health check endpoint called");

  res.status(200).json({
    status: "ok",
    message: "Notification backend is running",
  });
});

app.post("/notifications", async (req, res) => {
  try {
    await Log("backend", "info", "handler", "Create notification request received");

    const { userId, message, priority } = req.body;

    if (!userId || typeof userId !== "string") {
      await Log(
        "backend",
        "error",
        "handler",
        "Invalid userId received while creating notification"
      );

      return res.status(400).json({
        error: "userId must be a string",
      });
    }

    if (!message || typeof message !== "string") {
      await Log(
        "backend",
        "error",
        "handler",
        "Invalid message received while creating notification"
      );

      return res.status(400).json({
        error: "message must be a string",
      });
    }

    if (priority && !["low", "medium", "high"].includes(priority)) {
      await Log(
        "backend",
        "warn",
        "handler",
        `Unsupported priority received: ${priority}`
      );

      return res.status(400).json({
        error: "priority must be low, medium, or high",
      });
    }

    await Log(
      "backend",
      "info",
      "service",
      `Notification created successfully for userId: ${userId}`
    );

    res.status(201).json({
      success: true,
      notification: {
        userId,
        message,
        priority: priority || "medium",
      },
    });
  } catch (error) {
    await Log(
      "backend",
      "fatal",
      "handler",
      `Unexpected failure while creating notification: ${error.message}`
    );

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

app.use(async (req, res) => {
  await Log(
    "backend",
    "warn",
    "route",
    `Route not found: ${req.method} ${req.originalUrl}`
  );

  res.status(404).json({
    error: "Route not found",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  await Log(
    "backend",
    "info",
    "config",
    `Notification backend started on port ${PORT}`
  );
});