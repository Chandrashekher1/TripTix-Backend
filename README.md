#  TripTix - Backend API 

This is the backend server of **TripTix**, a real-time bus ticket booking platform built using **Node.js**, **Express.js**, **MongoDB**, and **Socket.io**. It handles API routes, authentication, database operations, seat locking via sockets, and payment integration with **Razorpay**.

---

## Endpoint APIs:

- https://triptix-backend-4ryx.onrender.com/api/v1/user/signup
- https://triptix-backend-4ryx.onrender.com/api/v1/login
- https://triptix-backend-4ryx.onrender.com/api/v1/user
- https://triptix-backend-4ryx.onrender.com/api/v1/route?
- https://triptix-backend-4ryx.onrender.com/api/v1/bus
- https://triptix-backend-4ryx.onrender.com/api/v1/seat
- https://triptix-backend-4ryx.onrender.com/
- https://triptix-backend-4ryx.onrender.com/api/v1/booking/book
- https://triptix-backend-4ryx.onrender.com/api/v1/payment/create-order

##  Features

-  **User Authentication (JWT)**
-  **CRUD for Bus and Seat Data**
- 🎟 **Seat Locking via Socket.io**
-  **Razorpay Payment Gateway Integration**
-  **Booking History & Passenger Management**

---

## 🧠 Technologies Used

- Server: Node.js, Express.js
- Databse: MongoDB, Mongoose
- Real-Time: Socket.io
- Auth: JWT, Bcrypt
- Payments: Razorpay API
- Others: dotenv, CORS


---

## 📁 Folder Structure

```
/TripTix
/config
- cloudinary.js
- db.js
- razorpay.js
- storage.js
/middleware
- admin.js
- auth.js
/models
- User.js
- Bus.js
- Seat.js
- booking.js
- routes.js
/routes
- auth.js
- booking.js
- buses.js
- payment.js
- route.js
- seat.js
- socket.js
- users.js

index.js
```


---

## ⚙️ Setup Instructions

### 1. 🔧 Prerequisites

- Node.js
- MongoDB installed or MongoDB Atlas account
- Razorpay account for API keys

### 2. 🚀 Installation

```bash
# Move to TripTix directory
cd TripTix

# Install dependencies
npm install

# Run server
node index.js
```
## Testing APIs
you can test the API using:
- Postman
- Frontend Integration

## Author
Chandrashekher Prasad

## License
MIT



