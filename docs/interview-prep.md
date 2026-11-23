# Interview Prep — Race Condition, Concurrency, Atomicity, Idempotency

> These notes are based on your TripTix project. Always explain with your own project — it shows real-world experience, not just textbook knowledge.

---

## How to Open (The Setup Answer)

When an interviewer asks *"Tell me about a challenging problem you solved"* or *"How did you handle concurrent requests?"*, start like this:

> "In my TripTix project — a bus ticket booking app — I had to solve a classic distributed systems problem. Multiple users could select the same seat at the same time. If I didn't handle it correctly, two people would end up with tickets for the same seat. That forced me to think about race conditions, atomic transactions, and idempotency together."

That one sentence grabs attention because it's a real problem with real consequences.

---

## Concept 1 — Race Condition

### How to explain it
> "A race condition happens when two operations read the same data, both see it as valid, and both write — but only one of them should have been allowed to. The bug comes from the **timing**, not the logic. Each operation is correct on its own. The problem is they ran at the same time."

### Your TripTix example to give
> "User A and User B both open the seat selection page for the same bus. Both see Seat 7 as available. Both click book within milliseconds. Without protection, both reads return 'available', both writes go through, and now two people have a confirmed ticket for the same seat."

### One-line definition to remember
> **"Two operations, same stale read, both think they won — only one should have."**

---

## Concept 2 — Concurrency

### How to explain it
> "Concurrency is not a problem by itself — it's just reality. Node.js is single-threaded but non-blocking. While it's waiting for a database response from one request, it starts processing another. So ten requests can genuinely overlap in time even on one server. The challenge is making sure they don't step on each other."

### Your TripTix example to give
> "On the seat selection page, everyone viewing the same trip is connected via Socket.io. When someone locks a seat, I broadcast that update to all of them in real time. That means multiple lock requests for the same seat can hit the server within the same event loop tick."

### One-line definition to remember
> **"Multiple operations overlapping in time — not a bug, just something you have to design around."**

---

## Concept 3 — Optimistic Concurrency (How you solved the race condition)

### How to explain it
> "I solved the race condition using optimistic concurrency. Instead of locking the seat upfront before the user even selects it — which would be expensive — I only check at the moment of writing. The database update includes a condition: only update this seat if its status is still 'available'. If two users try to lock the same seat, MongoDB processes them one at a time internally. The first one wins and changes the status. The second one's condition fails because the status is now 'locked', so its modifiedCount comes back as zero. I detect that and return an error to that user."

### Key point to stress
> "I'm not locking any database rows upfront. I'm letting the write itself fail if the data changed. That's the 'optimistic' part — I assume no conflict will happen, but I verify at write time."

### One-line definition to remember
> **"Don't lock early. Put the condition inside the write. Let the database reject the loser."**

---

## Concept 4 — Atomicity

### How to explain it
> "Atomicity means a group of operations is treated as one single unit. Either all of them succeed together, or none of them are applied at all. There's no in-between state."

### Your TripTix example to give
> "When a payment is verified, I need to do three things: create a Booking, update the Payment status to 'completed', and mark the TripSeats as 'booked'. If I did these three separately and the server crashed after step one, I'd have a Booking with no confirmed Payment and seats still showing as locked. The system would be in a broken half-state. I wrapped all three in a MongoDB session transaction. If anything fails at any step, MongoDB rolls everything back automatically. The user retries and it works cleanly."

### One-line definition to remember
> **"All or nothing — never half. A crash mid-way leaves zero trace."**

---

## Concept 5 — Idempotency

### How to explain it
> "Idempotency means you can call the same operation multiple times and get the same result, without any extra side effects from the repeated calls. It's critical for any action that involves money or booking — because networks drop, frontends retry, and you can never guarantee a request was received exactly once."

### Your TripTix example to give
> "After the user pays, the frontend sends a verify request to my backend. The backend processes it and responds. But if the network drops before the response arrives, the frontend doesn't know if it succeeded. It retries. Without protection, the second call would try to create a duplicate Booking and double-update the seats. I handle this by checking the payment status first. If it's already 'completed', I skip all the writes and just return the existing booking. The user gets the same response either way. No duplicates."

### One-line definition to remember
> **"Calling it twice is the same as calling it once. Safe to retry."**

---

## Follow-Up Questions an Interviewer Will Ask

### On Race Conditions
- **"What's the difference between a race condition and a deadlock?"**
  > Race condition: two operations compete and both try to win. Deadlock: two operations each wait for the other to release something — both freeze forever. Race conditions cause wrong data. Deadlocks cause hangs.

- **"How did you test that your race condition fix actually works?"**
  > Honest answer: you can send two simultaneous lock requests for the same seat (using Promise.all with two fetch calls) and verify only one succeeds. For production-level testing, tools like k6 or Artillery can simulate concurrent load.

- **"Can race conditions happen even in single-threaded Node.js?"**
  > Yes. Single-threaded means one piece of JS runs at a time, but I/O operations (DB queries, network calls) are async. Between the `await` of a read and the `await` of a write, another request's code can run. That gap is exactly where a race condition lives.

---

### On Concurrency
- **"What's the difference between concurrency and parallelism?"**
  > Concurrency: multiple tasks are in progress at the same time, taking turns on one resource. Parallelism: multiple tasks literally run at the exact same instant on separate CPU cores. Node.js is concurrent, not parallel (unless you use Worker Threads or multiple processes).

- **"How does Node.js handle thousands of concurrent requests if it's single-threaded?"**
  > The event loop. When a request hits a database query, Node doesn't sit and wait — it registers a callback and moves on to the next request. When the DB responds, the callback is queued. This is why Node is fast for I/O-heavy work but bad for CPU-heavy work.

---

### On Atomicity & Transactions
- **"MongoDB is a NoSQL database — does it even support transactions?"**
  > Yes, since MongoDB 4.0 for replica sets and 4.2 for sharded clusters. It supports multi-document ACID transactions using sessions. That's exactly what I used — `mongoose.startSession()` and `session.withTransaction()`.

- **"What's ACID?"**
  > **A**tomicity — all or nothing. **C**onsistency — data stays valid before and after. **I**solation — concurrent transactions don't see each other's partial state. **D**urability — once committed, it survives crashes.

- **"Why not just use a single document instead of a transaction?"**
  > Single document writes are always atomic in MongoDB without transactions. But my case involves three separate collections — Payment, Booking, TripSeat. When you need multiple documents across multiple collections to be updated together, you need a session transaction.

- **"What happens to the MongoDB session if your Node server crashes during the transaction?"**
  > The session is never committed. MongoDB automatically aborts the transaction on its side when the connection drops. No partial data is written. This is the whole point of ACID durability.

- **"What's the difference between a session and a transaction in Mongoose?"**
  > A session is the connection context. A transaction lives inside a session. You start the session first, then start a transaction within it. `withTransaction()` handles starting, committing, and retrying on transient errors automatically.

---

### On Idempotency
- **"What HTTP methods are inherently idempotent?"**
  > GET, PUT, DELETE, HEAD, OPTIONS are idempotent by design. POST is not — sending the same POST twice is supposed to create two things. But you can *make* a POST idempotent by checking for existing state before writing, which is what I did in the verify endpoint.

- **"How do payment gateways like Stripe handle idempotency?"**
  > They let you send an `Idempotency-Key` header with every request. If you send the same key twice, Stripe returns the cached result of the first call. Razorpay uses the `orderId` for this — once an order is created, every payment against that orderId is tracked.

- **"What's the difference between idempotency and retry logic?"**
  > Retry logic is what the *client* does — it resends the request if it doesn't get a response. Idempotency is what the *server* guarantees — that retries are safe. You need both. Retries without idempotency cause duplicates. Idempotency without retries means failed operations are just lost.

---

### On Your Architecture Specifically
- **"Why did you store a 'pending' payment before the user actually pays?"**
  > Two reasons. First, audit trail — if something goes wrong, I can see what was attempted. Second, the verify endpoint uses it to look up the transaction context (tripId, seatIds, userId, amount) using just the orderId that Razorpay returns. I never trust the frontend to send that data again after payment — I read it from my own database record.

- **"What if Razorpay's server goes down during order creation?"**
  > The `razorpay.orders.create()` call throws an error. I catch it, return 500, and no Payment record is saved. The user can try again safely.

- **"What if the user closes the browser right after Razorpay charges them but before verify is called?"**
  > The payment exists on Razorpay's side but not confirmed on mine. The PaymentModel record stays 'pending'. The seats stay 'locked' and expire after 5 minutes back to 'available'. The user sees no booking. This is the case for a **webhook** — Razorpay can call your backend directly to confirm payment, independent of the frontend. That's the production-grade addition I haven't built yet.

- **"Why use Socket.io to broadcast after payment instead of just letting the next fetch pick it up?"**
  > Without the broadcast, all other users watching the seat layout would only see the seat status update on their next manual refresh or the next 15-second lock expiry sweep. With Socket.io, all connected clients see the seat turn 'booked' within milliseconds of payment confirmation — real-time consistency without polling.

---

## The Closing Line for Any of These Answers

After explaining any concept, always close with:

> "I didn't just read about this — I ran into this problem in my own project, debugged it, and had to reason through the solution. That's why I'm confident about how it works in practice."

That line alone sets you apart from candidates who only know the theory.
