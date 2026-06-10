# Stage 1

## Campus Notification Platform — REST API Design

### Overview

This document defines the REST API contract for the Campus Notification Platform. The platform delivers real-time notifications to students for three categories: **Placements**, **Events**, and **Results**.

---

## Base URL

```
https://api.campus.edu/v1
```

---

## Authentication

All endpoints require a JWT bearer token in the `Authorization` header.

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Notification Categories

| Value | Description |
|-------|-------------|
| `placement` | Job/internship placement updates |
| `event` | Campus events and workshops |
| `result` | Exam and assessment results |

---

## Endpoints

### 1. Get All Notifications for a User

Retrieves paginated notifications for the authenticated user, optionally filtered by category or read status.

```
GET /notifications
```

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by `placement`, `event`, or `result` |
| `isRead` | boolean | No | Filter by read status (`true` / `false`) |
| `page` | integer | No | Page number (default: `1`) |
| `limit` | integer | No | Items per page (default: `20`, max: `100`) |

**Request Headers**
```
Authorization: Bearer <jwt_token>
```

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_01HXZ8K2P",
        "category": "placement",
        "title": "Infosys Drive — Applications Open",
        "body": "Infosys is hiring 2024 batch students. Apply before June 20.",
        "isRead": false,
        "createdAt": "2026-06-10T08:00:00Z",
        "metadata": {
          "companyName": "Infosys",
          "deadline": "2026-06-20T23:59:00Z",
          "applyUrl": "https://campus.edu/placements/infosys-2024"
        }
      },
      {
        "id": "notif_01HXZ8K3Q",
        "category": "result",
        "title": "Semester 4 Results Published",
        "body": "Your Semester 4 results are now available on the portal.",
        "isRead": true,
        "createdAt": "2026-06-09T14:30:00Z",
        "metadata": {
          "semester": 4,
          "resultUrl": "https://campus.edu/results/sem4"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

### 2. Get a Single Notification

Retrieves full details of one notification by ID and marks it as read.

```
GET /notifications/:id
```

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Notification ID |

**Request Headers**
```
Authorization: Bearer <jwt_token>
```

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "notif_01HXZ8K2P",
    "category": "event",
    "title": "Tech Fest 2026 — Registration Open",
    "body": "Register now for Tech Fest 2026 happening on June 25–26.",
    "isRead": true,
    "createdAt": "2026-06-10T09:00:00Z",
    "metadata": {
      "eventDate": "2026-06-25T09:00:00Z",
      "venue": "Main Auditorium",
      "registrationUrl": "https://campus.edu/events/techfest2026"
    }
  }
}
```

**Response — 404 Not Found**
```json
{
  "success": false,
  "error": {
    "code": "NOTIFICATION_NOT_FOUND",
    "message": "Notification not found"
  }
}
```

---

### 3. Mark a Notification as Read

```
PATCH /notifications/:id/read
```

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Notification ID |

**Request Headers**
```
Authorization: Bearer <jwt_token>
```

**Request Body** — _(none required)_

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "id": "notif_01HXZ8K2P",
    "isRead": true,
    "readAt": "2026-06-10T10:15:00Z"
  }
}
```

---

### 4. Mark All Notifications as Read

```
PATCH /notifications/read-all
```

**Request Headers**
```
Authorization: Bearer <jwt_token>
```

**Request Body** _(optional — filter by category)_
```json
{
  "category": "placement"
}
```

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "updatedCount": 12
  }
}
```

---

### 5. Get Unread Notification Count

Used by the frontend to display the notification badge count.

```
GET /notifications/unread-count
```

**Request Headers**
```
Authorization: Bearer <jwt_token>
```

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "unreadCount": 7,
    "breakdown": {
      "placement": 3,
      "event": 2,
      "result": 2
    }
  }
}
```

---

### 6. Create a Notification _(Admin only)_

Sends a new notification to one or more users.

```
POST /notifications
```

**Request Headers**
```
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json
```

**Request Body**
```json
{
  "category": "event",
  "title": "Workshop on AI — June 15",
  "body": "Join us for a hands-on AI workshop on June 15 at Lab 3.",
  "recipientIds": ["user_01", "user_02"],
  "sendToAll": false,
  "metadata": {
    "eventDate": "2026-06-15T10:00:00Z",
    "venue": "Lab 3",
    "registrationUrl": "https://campus.edu/events/ai-workshop"
  }
}
```

**Request Body Schema**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | Yes | `placement`, `event`, or `result` |
| `title` | string | Yes | Short notification title (max 100 chars) |
| `body` | string | Yes | Full notification message (max 500 chars) |
| `recipientIds` | string[] | No | Target specific users |
| `sendToAll` | boolean | No | Send to all students (default: `false`) |
| `metadata` | object | No | Category-specific extra data |

**Response — 201 Created**
```json
{
  "success": true,
  "data": {
    "id": "notif_01HXZ9M4R",
    "category": "event",
    "title": "Workshop on AI — June 15",
    "recipientCount": 2,
    "createdAt": "2026-06-10T11:00:00Z"
  }
}
```

---

### 7. Delete a Notification _(Admin only)_

```
DELETE /notifications/:id
```

**Request Headers**
```
Authorization: Bearer <admin_jwt_token>
```

**Response — 200 OK**
```json
{
  "success": true,
  "data": {
    "message": "Notification deleted successfully"
  }
}
```

---

## Error Response Schema

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

| HTTP Status | Error Code | Meaning |
|-------------|------------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request body or parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOTIFICATION_NOT_FOUND` | Notification does not exist |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server error |

---

## Real-Time Notification Mechanism

### Approach — Server-Sent Events (SSE)

For real-time delivery, the platform uses **Server-Sent Events (SSE)**. SSE is preferred over WebSockets here because notifications are one-directional (server → client), simpler to implement, and work natively over HTTP without a separate protocol upgrade.

### SSE Endpoint

```
GET /notifications/stream
```

**Request Headers**
```
Authorization: Bearer <jwt_token>
Accept: text/event-stream
Cache-Control: no-cache
```

**Response — 200 OK (streaming)**
```
Content-Type: text/event-stream
```

The server sends events in this format:

```
id: notif_01HXZ8K2P
event: notification
data: {"id":"notif_01HXZ8K2P","category":"placement","title":"TCS Drive Open","body":"TCS is hiring 2024 batch.","createdAt":"2026-06-10T12:00:00Z"}

id: notif_01HXZ8K3Q
event: notification
data: {"id":"notif_01HXZ8K3Q","category":"result","title":"Sem 4 Results Out","body":"Check your results on the portal.","createdAt":"2026-06-10T12:05:00Z"}
```

A heartbeat ping is sent every 30 seconds to keep the connection alive:

```
: ping
```

### Frontend Integration (JavaScript)

```javascript
const evtSource = new EventSource('/notifications/stream', {
  headers: { Authorization: `Bearer ${token}` }
});

evtSource.addEventListener('notification', (event) => {
  const notification = JSON.parse(event.data);
  showNotificationBadge(notification);
});

evtSource.onerror = () => {
  // Reconnect automatically — SSE handles this natively
  console.warn('SSE connection lost, reconnecting...');
};
```

### Why SSE over WebSockets

| Factor | SSE | WebSockets |
|--------|-----|------------|
| Direction | Server → Client (sufficient here) | Bi-directional |
| Protocol | HTTP/1.1 | Separate WS upgrade |
| Auto-reconnect | Built-in | Manual |
| Complexity | Low | Higher |
| Load balancer support | Standard HTTP | Requires sticky sessions |

### Flow Summary

```
Student logs in
      │
      ▼
Frontend opens SSE connection → GET /notifications/stream
      │
      ▼
Server authenticates JWT, registers user stream
      │
      ▼
Admin creates notification → POST /notifications
      │
      ▼
Server pushes SSE event to all matching recipients instantly
      │
      ▼
Frontend receives event → updates notification badge & list
```

---

## Notification Data Model

```json
{
  "id": "string",
  "userId": "string",
  "category": "placement | event | result",
  "title": "string",
  "body": "string",
  "isRead": "boolean",
  "createdAt": "ISO 8601 datetime",
  "readAt": "ISO 8601 datetime | null",
  "metadata": "object | null"
}
```

---

# Stage 2

## Persistent Storage — Database Choice

### Recommended Database: PostgreSQL (Relational)

**Choice: PostgreSQL**

Notifications have a well-defined, consistent schema (studentID, type, message, isRead, createdAt). A relational database fits perfectly because:

- Queries are structured and predictable (fetch by student, filter by type, sort by date)
- ACID guarantees ensure no notification is lost or duplicated during bulk inserts
- Native support for enums, indexes, and partial indexes aligns directly with the access patterns
- 5,000,000 rows is comfortably within PostgreSQL's range with proper indexing

MongoDB would add unnecessary schema flexibility that isn't needed here and makes aggregation queries (unread counts, type breakdowns) more complex.

---

## Database Schema

```sql
-- Students table
CREATE TABLE students (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  batch       INT NOT NULL,
  createdAt   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notification type enum
CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');

-- Notifications table
CREATE TABLE notifications (
  id                SERIAL PRIMARY KEY,
  studentID         INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  notificationType  notification_type NOT NULL,
  title             VARCHAR(100) NOT NULL,
  body              VARCHAR(500) NOT NULL,
  isRead            BOOLEAN NOT NULL DEFAULT FALSE,
  metadata          JSONB,
  createdAt         TIMESTAMP NOT NULL DEFAULT NOW(),
  readAt            TIMESTAMP
);
```

---

## SQL Queries for Stage 1 REST APIs

**GET /notifications — fetch paginated notifications for a student**
```sql
SELECT id, notificationType, title, body, isRead, createdAt, metadata
FROM notifications
WHERE studentID = $1
  AND ($2::notification_type IS NULL OR notificationType = $2)
  AND ($3::boolean IS NULL OR isRead = $3)
ORDER BY createdAt DESC
LIMIT $4 OFFSET $5;
```

**GET /notifications/:id — fetch single notification**
```sql
SELECT * FROM notifications
WHERE id = $1 AND studentID = $2;
```

**PATCH /notifications/:id/read — mark one as read**
```sql
UPDATE notifications
SET isRead = TRUE, readAt = NOW()
WHERE id = $1 AND studentID = $2
RETURNING id, isRead, readAt;
```

**PATCH /notifications/read-all — mark all as read**
```sql
UPDATE notifications
SET isRead = TRUE, readAt = NOW()
WHERE studentID = $1
  AND isRead = FALSE
  AND ($2::notification_type IS NULL OR notificationType = $2);
```

**GET /notifications/unread-count — badge count with breakdown**
```sql
SELECT
  COUNT(*) FILTER (WHERE notificationType = 'Placement') AS placement,
  COUNT(*) FILTER (WHERE notificationType = 'Result')    AS result,
  COUNT(*) FILTER (WHERE notificationType = 'Event')     AS event,
  COUNT(*) AS total
FROM notifications
WHERE studentID = $1 AND isRead = FALSE;
```

**POST /notifications — insert notification for multiple students**
```sql
INSERT INTO notifications (studentID, notificationType, title, body, metadata)
SELECT
  UNNEST($1::int[]),
  $2::notification_type,
  $3,
  $4,
  $5::jsonb;
```

**DELETE /notifications/:id**
```sql
DELETE FROM notifications WHERE id = $1;
```

---

## Problems as Data Volume Increases

| Problem | Description |
|---------|-------------|
| **Slow queries** | Full table scans on 5M+ rows without indexes |
| **Write bottleneck** | Bulk inserts for 50,000 students per broadcast block the DB |
| **Storage growth** | Old read notifications accumulate forever |
| **Connection exhaustion** | Every page load opens a DB connection |

## Solutions

1. **Indexes** — Composite index on `(studentID, isRead, createdAt DESC)` covers the most common query pattern
2. **Archiving** — Move notifications older than 90 days to a `notifications_archive` table
3. **Connection pooling** — Use PgBouncer or pg-pool to reuse connections
4. **Async writes** — Use a message queue (Redis/RabbitMQ) for bulk inserts instead of synchronous DB writes
5. **Partitioning** — Partition the notifications table by `createdAt` month for faster range scans

---

# Stage 3

## Query Analysis

### Is the query accurate?

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

The query is **logically correct** but has two problems:

1. **`SELECT *`** — fetches all columns including `body`, `metadata`, and `readAt` which the list view doesn't need. This increases data transfer unnecessarily.
2. **`isRead = false`** — syntactically valid in PostgreSQL but the standard form is `isRead = FALSE`. Minor style issue, not a bug.

### Why is it slow?

Without indexes, PostgreSQL does a **full sequential scan** of all 5,000,000 rows, filtering and sorting in memory. Even if a student has only 100 unread notifications, the DB reads every single row first.

### What to change

**Step 1 — Add a composite index:**
```sql
CREATE INDEX idx_notifications_student_unread
ON notifications (studentID, isRead, createdAt DESC)
WHERE isRead = FALSE;
```

This is a **partial index** — it only indexes unread rows, keeping it small and fast.

**Step 2 — Select only needed columns:**
```sql
SELECT id, notificationType, title, createdAt
FROM notifications
WHERE studentID = 1042
  AND isRead = FALSE
ORDER BY createdAt DESC;
```

### Likely computation cost

| Before index | After index |
|-------------|-------------|
| Full seq scan — O(5,000,000) | Index seek — O(log N) + O(k) where k = unread rows for that student |
| ~800ms–2s | ~2–10ms |

---

## Should you add indexes on every column?

**No. This is bad advice.**

Reasons:
- Every index **slows down writes** (INSERT, UPDATE, DELETE) because PostgreSQL must update all indexes on every write
- With 50,000 students and frequent notification inserts, this causes serious write amplification
- Indexes consume disk space — indexing all columns of a 5M row table wastes GBs
- The query planner may choose a wrong index if too many exist, degrading performance further

**Rule:** Only index columns that appear in `WHERE`, `ORDER BY`, or `JOIN` clauses of frequent queries.

---

## Query — Placement notifications in the last 7 days

```sql
SELECT DISTINCT s.id, s.name, s.email
FROM notifications n
JOIN students s ON s.id = n.studentID
WHERE n.notificationType = 'Placement'
  AND n.createdAt >= NOW() - INTERVAL '7 days';
```

---

# Stage 4

## Problem

Every page load triggers a DB query for notifications. At 50,000 students with frequent logins, this creates thousands of redundant DB hits per minute for data that barely changes.

---

## Solution 1 — In-Memory Caching (Redis)

Cache each student's unread notification list in Redis with a short TTL.

```
Key:   notifications:unread:{studentID}
Value: JSON array of unread notifications
TTL:   60 seconds
```

On `PATCH /notifications/:id/read`, invalidate that student's cache key immediately.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| ~1ms reads vs ~50ms DB reads | Stale data up to TTL duration |
| Dramatically reduces DB load | Extra infrastructure (Redis) |
| Simple to implement | Cache invalidation logic needed |

---

## Solution 2 — HTTP Cache-Control Headers

For the `GET /notifications` response, add cache headers:

```
Cache-Control: private, max-age=30
ETag: "abc123hash"
```

The browser caches the response for 30 seconds. On subsequent loads, it sends `If-None-Match` — the server returns `304 Not Modified` if unchanged, with no DB query needed.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Zero server load on cache hit | Only works per-client (not shared) |
| Free — no extra infrastructure | 30s staleness window |

---

## Solution 3 — Unread Count Caching

The most frequently hit endpoint is `/notifications/unread-count` (called on every page load for the badge). Cache just the count:

```
Key:   notifications:count:{studentID}
Value: { total: 7, placement: 3, result: 2, event: 2 }
TTL:   120 seconds
```

Increment/decrement the cached count on write operations instead of invalidating.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Extremely fast badge loads | Counter drift risk if cache/DB desync |
| Avoids COUNT query entirely | Requires careful atomic updates |

---

## Solution 4 — Pagination + Lazy Loading

Instead of loading all notifications on page load, load only the first page (10–20 items). Load more only when the user scrolls.

**Tradeoffs:**
| Pro | Con |
|-----|-----|
| Reduces initial query size significantly | More complex frontend implementation |
| Works without extra infrastructure | Doesn't help with repeated page loads |

---

## Recommended Strategy

Use **Solution 1 (Redis) + Solution 3 (count caching)** together:
- Cache the unread count with TTL 120s (badge)
- Cache the first page of notifications with TTL 60s
- Invalidate/update cache on read/write events via SSE pipeline

---

# Stage 5

## Shortcomings in the Proposed Implementation

```
function notify_all(student_ids, message):
  for student_id in student_ids:
    send_email(student_id, message)   # calls Email API
    save_to_db(student_id, message)   # DB insert
    push_to_app(student_id, message)  # SSE push
```

**Problems:**

1. **Sequential loop** — Processes one student at a time. 50,000 students × ~50ms per iteration = ~41 minutes to complete
2. **No fault isolation** — If `send_email` fails for student 500, the loop stops. Students 501–50,000 get nothing
3. **Tight coupling** — Email, DB write, and SSE push are chained. One failure breaks all three for that student
4. **No retry mechanism** — A transient email API timeout causes permanent failure with no recovery
5. **Synchronous DB inserts** — 50,000 individual `INSERT` statements instead of a bulk insert hammers the DB

---

## Logs show send_email failed for 200 students midway — What now?

Without a queue, those 200 students are simply missed with no way to know which ones failed. The only recovery is re-running the entire job and risking duplicate notifications for the 49,800 who succeeded.

---

## Should saving to DB and sending email happen together?

**No.** They serve different purposes and have different failure modes:

- **DB save** = persistent record, must always succeed
- **Email send** = external API call, can fail transiently, should retry independently

Coupling them means a transient email failure can prevent the notification from ever being saved to the DB, causing data loss.

---

## Redesigned Architecture — Message Queue

```
Admin clicks "Notify All"
        │
        ▼
[API Server] — bulk insert all 50,000 rows to DB immediately
        │
        ▼
[API Server] — push one job per student onto a Redis/RabbitMQ queue
        │
        ▼
[Worker Pool — N workers running in parallel]
        │
        ├── Dequeue job for student_id
        ├── send_email(student_id, message)  ← retry up to 3x on failure
        ├── push_to_app(student_id, message) ← SSE push
        └── mark job as done
```

---

## Revised Pseudocode

```
function notify_all(student_ids: array, message: string):

  # Step 1: Bulk insert all notifications to DB immediately (single query)
  bulk_insert_notifications(student_ids, message)

  # Step 2: Enqueue one job per student (non-blocking)
  for student_id in student_ids:
    queue.push({ student_id, message, attempt: 0 })

  return { status: "queued", count: len(student_ids) }


# Worker function — runs in parallel across N worker processes
function worker():
  while true:
    job = queue.pop()  # blocking pop

    try:
      send_email(job.student_id, job.message)
      push_to_app(job.student_id, job.message)
      mark_job_done(job)

    except EmailAPIError:
      if job.attempt < 3:
        job.attempt += 1
        queue.push_with_delay(job, delay = 2 ^ job.attempt seconds)  # exponential backoff
      else:
        dead_letter_queue.push(job)  # log for manual review
        log_failure(job.student_id, "email failed after 3 retries")

    except SSEError:
      # SSE failure is non-critical — student will see it on next poll
      log_warning(job.student_id, "SSE push failed, notification in DB")
```

**Key improvements:**
| Issue | Fix |
|-------|-----|
| Sequential loop | Parallel workers (configurable pool size) |
| No fault isolation | Per-job try/catch, failures don't affect others |
| No retry | Exponential backoff, up to 3 retries |
| DB coupling | DB write happens first, independently |
| Unrecoverable failures | Dead letter queue for manual review |
| Duplicate risk on re-run | DB insert is idempotent (upsert by studentID + messageID) |

---

# Stage 6

## Priority Inbox — Approach

### Priority Score Formula

Each notification gets a score combining **type weight** and **recency**:

```
score = typeWeight × recencyScore

typeWeight:
  Placement = 3
  Result    = 2
  Event     = 1

recencyScore = 1 / (1 + hoursAgo)
  — gives 1.0 for brand-new, decays toward 0 as age increases
```

This ensures a recent Placement always beats an old Placement, and type weight breaks ties when recency is similar.

### Maintaining Top 10 Efficiently as New Notifications Arrive

A **min-heap of size N** (N=10 by default) is the optimal structure:

- Heap always holds the top N notifications
- When a new notification arrives, compute its score
- If score > heap minimum → replace the minimum → re-heapify (O(log N))
- Result: O(log N) per new notification instead of O(M log M) full re-sort

### Code

See `priority_inbox.js` in the `Question2/` folder.

The implementation:
1. Fetches notifications from the API
2. Scores each notification using type weight × recency decay
3. Uses a min-heap to extract top N efficiently
4. Prints the priority inbox as a formatted table
