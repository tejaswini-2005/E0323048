/**
 * Stage 6 — Priority Inbox
 *
 * Fetches notifications from the API and returns the top N most important
 * unread notifications using a min-heap scored by:
 *
 *   score = typeWeight * recencyScore
 *
 *   typeWeight  : Placement=3, Result=2, Event=1
 *   recencyScore: 1 / (1 + hoursAgo)  — decays toward 0 with age
 *
 * A min-heap of size N maintains the top N efficiently as new notifications
 * arrive: O(log N) per insert vs O(M log M) for a full re-sort.
 */

require("dotenv").config();
const axios = require("axios");

const AUTH_TOKEN       = process.env.AUTH_TOKEN;
const NOTIFICATIONS_API = process.env.NOTIFICATIONS_API;

// ─── Type weights ─────────────────────────────────────────────────────────────
const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

// ─── Score a single notification ─────────────────────────────────────────────
function computeScore(notification) {
  const weight = TYPE_WEIGHT[notification.Type] || 1;
  const createdAt = new Date(notification.Timestamp.replace(" ", "T") + "Z");
  const hoursAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
  const recency = 1 / (1 + hoursAgo);
  return weight * recency;
}

// ─── Min-Heap (keyed by score) ────────────────────────────────────────────────
class MinHeap {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0];
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].score <= this.heap[i].score) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left  = 2 * i + 1;
      const right = 2 * i + 2;
      if (left  < n && this.heap[left].score  < this.heap[smallest].score) smallest = left;
      if (right < n && this.heap[right].score < this.heap[smallest].score) smallest = right;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// ─── Get top N notifications using min-heap ───────────────────────────────────
function getTopN(notifications, n = 10) {
  const heap = new MinHeap();

  for (const notif of notifications) {
    const score = computeScore(notif);
    const entry = { score, notif };

    if (heap.size() < n) {
      heap.push(entry);
    } else if (score > heap.peek().score) {
      // Replace the lowest-scored item in the heap
      heap.pop();
      heap.push(entry);
    }
  }

  // Extract all from heap and sort descending by score
  const result = [];
  while (heap.size() > 0) {
    result.push(heap.pop());
  }
  return result.reverse(); // highest score first
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    console.log("Fetching notifications from API...\n");

    const response = await axios.get(NOTIFICATIONS_API, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    const notifications = response.data.notifications;
    console.log(`Total notifications fetched: ${notifications.length}\n`);

    const top10 = getTopN(notifications, 10);

    console.log("===== PRIORITY INBOX — TOP 10 =====\n");
    console.log(
      `${"Rank".padEnd(6)}${"Type".padEnd(12)}${"Message".padEnd(35)}${"Timestamp".padEnd(22)}${"Score"}`
    );
    console.log("─".repeat(90));

    top10.forEach((entry, idx) => {
      const { notif, score } = entry;
      console.log(
        `${String(idx + 1).padEnd(6)}` +
        `${notif.Type.padEnd(12)}` +
        `${notif.Message.substring(0, 33).padEnd(35)}` +
        `${notif.Timestamp.padEnd(22)}` +
        `${score.toFixed(6)}`
      );
    });

    console.log("\n===== FULL DETAIL =====\n");
    top10.forEach((entry, idx) => {
      const { notif, score } = entry;
      console.log(`#${idx + 1}`);
      console.log(`  ID      : ${notif.ID}`);
      console.log(`  Type    : ${notif.Type}`);
      console.log(`  Message : ${notif.Message}`);
      console.log(`  Time    : ${notif.Timestamp}`);
      console.log(`  Score   : ${score.toFixed(6)}`);
      console.log();
    });

  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
    process.exit(1);
  }
}

main();
