require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const NOTIFICATIONS_API = process.env.NOTIFICATIONS_API;
const PORT = process.env.PORT || 3000;

// SSE clients map: studentID -> res
const sseClients = new Map();

// ─── Helper: fetch notifications from upstream API ───────────────────────────
async function fetchNotifications() {
  const response = await axios.get(NOTIFICATIONS_API, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
  });
  // Normalise field names to camelCase internally
  return response.data.notifications.map((n) => ({
    id: n.ID,
    type: n.Type,           // Placement | Result | Event
    message: n.Message,
    timestamp: n.Timestamp,
    isRead: false,
  }));
}

// ─── Helper: push SSE event to a student ─────────────────────────────────────
function pushSSE(studentId, notification) {
  const client = sseClients.get(String(studentId));
  if (client) {
    client.write(`id: ${notification.id}\n`);
    client.write(`event: notification\n`);
    client.write(`data: ${JSON.stringify(notification)}\n\n`);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /notifications — list all, with optional ?type= and ?isRead= filters
app.get("/notifications", async (req, res) => {
  try {
    const { type, isRead, page = 1, limit = 20 } = req.query;
    let notifications = await fetchNotifications();

    if (type) {
      notifications = notifications.filter(
        (n) => n.type.toLowerCase() === type.toLowerCase()
      );
    }
    if (isRead !== undefined) {
      const readFlag = isRead === "true";
      notifications = notifications.filter((n) => n.isRead === readFlag);
    }

    const total = notifications.length;
    const start = (Number(page) - 1) * Number(limit);
    const paginated = notifications.slice(start, start + Number(limit));

    res.json({
      success: true,
      data: {
        notifications: paginated,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: err.message } });
  }
});

// GET /notifications/unread-count — badge counts per type
app.get("/notifications/unread-count", async (req, res) => {
  try {
    const notifications = await fetchNotifications();
    const unread = notifications.filter((n) => !n.isRead);

    const breakdown = { Placement: 0, Result: 0, Event: 0 };
    unread.forEach((n) => {
      if (breakdown[n.type] !== undefined) breakdown[n.type]++;
    });

    res.json({
      success: true,
      data: {
        unreadCount: unread.length,
        breakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: err.message } });
  }
});

// GET /notifications/stream — SSE real-time stream
app.get("/notifications/stream", (req, res) => {
  const studentId = req.query.studentId || "default";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.set(String(studentId), res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(String(studentId));
  });
});

// GET /notifications/:id — single notification by ID
app.get("/notifications/:id", async (req, res) => {
  try {
    const notifications = await fetchNotifications();
    const notification = notifications.find((n) => n.id === req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found" },
      });
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: err.message } });
  }
});

// PATCH /notifications/:id/read — mark one as read (simulated)
app.patch("/notifications/:id/read", async (req, res) => {
  try {
    const notifications = await fetchNotifications();
    const notification = notifications.find((n) => n.id === req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: "NOTIFICATION_NOT_FOUND", message: "Notification not found" },
      });
    }

    const readAt = new Date().toISOString();
    res.json({
      success: true,
      data: { id: req.params.id, isRead: true, readAt },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: err.message } });
  }
});

// PATCH /notifications/read-all — mark all as read (simulated)
app.patch("/notifications/read-all", (req, res) => {
  res.json({ success: true, data: { updatedCount: 20, message: "All notifications marked as read" } });
});

// POST /notifications — create & broadcast notification (admin)
app.post("/notifications", async (req, res) => {
  try {
    const { type, message, recipientIds = [], sendToAll = false } = req.body;

    if (!type || !message) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "type and message are required" },
      });
    }

    const validTypes = ["Placement", "Result", "Event"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: `type must be one of: ${validTypes.join(", ")}` },
      });
    }

    const newNotification = {
      id: `notif_${Date.now()}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      isRead: false,
    };

    // Push via SSE to all connected clients or specific recipients
    const targets = sendToAll
      ? Array.from(sseClients.keys())
      : recipientIds.map(String);

    targets.forEach((studentId) => pushSSE(studentId, newNotification));

    res.status(201).json({
      success: true,
      data: {
        ...newNotification,
        recipientCount: targets.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: err.message } });
  }
});

// DELETE /notifications/:id — delete notification (admin)
app.delete("/notifications/:id", (req, res) => {
  res.json({ success: true, data: { message: "Notification deleted successfully" } });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Campus Notification API running on http://localhost:${PORT}`);
});
