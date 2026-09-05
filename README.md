# 🏋️‍♂️ Assignment 08: Gym & Fitness Club Management REST API
> **Track:** Backend Development | **Level:** Beginner to Intermediate | **Estimated Time:** 5–7 Hours  
> **Tech Stack:** Node.js, Express.js, MongoDB, Mongoose, Passport.js (Local Strategy), Express-Session, dotenv

---
### Live Link : https://assignment-8-gym-management-api.onrender.com/
---

## 📌 1. Objective & Overview

Develop a full-featured backend API for a **Gym & Fitness Center Management System** using **MongoDB and Mongoose**. In this project, students will implement persistent membership lifecycle management (calculating plan expiry dates, subscription renewals, and membership status checks), class bookings with seat capacity constraints, and user authentication using **Passport.js**.

### Key Learning Outcomes:
- Designing Mongoose schemas with computed fields, date manipulation, and enum constraints.
- Managing relational links between **Members**, **Fitness Classes**, and **Trainers** using Mongoose references (`populate`).
- Implementing stateful session-based user authentication using Passport.js.
- Writing custom business logic to prevent over-enrollment in fitness classes.
- Utilizing Mongoose middleware (`pre-save` hooks) for automatic date calculations.

---

## 🛠️ 2. Tech Stack & Dependencies

```bash
# Initialize project
npm init -y

# Install dependencies
npm install express mongoose passport passport-local express-session bcryptjs dotenv cors

# Install dev dependencies
npm install -D nodemon
```

---

## 🗄️ 3. Database Schemas (Mongoose Models)

### 1. Member / User Model (`models/User.js`)
```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  membershipTier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze'
  },
  membershipStatus: {
    type: String,
    enum: ['active', 'expired', 'frozen'],
    default: 'active'
  },
  membershipExpiryDate: { type: Date, required: true },
  emergencyContact: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
```

### 2. Fitness Class Model (`models/FitnessClass.js`)
```javascript
const mongoose = require('mongoose');

const fitnessClassSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true }, // e.g., "HIIT Bootcamp", "Yoga Flow"
  trainerName: { type: String, required: true },
  scheduleDate: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, default: 60 },
  maxCapacity: { type: Number, required: true, min: 1 },
  enrolledMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('FitnessClass', fitnessClassSchema);
```

---

## 📋 4. API Endpoints Specification

### 🔐 Authentication (Passport-Local)

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | Register new member with chosen membership plan | `{"username":"fit_sam","email":"sam@fit.com","password":"mypassword","membershipTier":"Gold","durationMonths":3}` | `201 Created`<br>`400 Bad Request` |
| `POST` | `/api/auth/login` | Login via Passport Local | `{"username":"fit_sam","password":"mypassword"}` | `200 OK`<br>`401 Unauthorized` |
| `GET` | `/api/auth/me` | Fetch active member profile & remaining days | None | `200 OK`<br>`401 Unauthorized` |

### 🏋️‍♂️ Fitness Class & Booking Endpoints

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/classes` | Fetch all upcoming classes (supports `?trainer=John`) | None | `200 OK` |
| `GET` | `/api/classes/:id` | Get class details with enrolled members list | None | `200 OK`<br>`404 Not Found` |
| `POST` | `/api/classes` | Create a new workout class | `{"title":"Zumba Cardio","trainerName":"Maria","scheduleDate":"2026-04-15T09:00:00Z","maxCapacity":20}` | `201 Created`<br>`400 Bad Request` |
| `POST` | `/api/classes/:id/book` | Enroll logged-in user (Fails if class is full or user membership expired) | None | `200 OK`<br>`400 Class Full / Expired` |
| `DELETE` | `/api/classes/:id/cancel` | Cancel member booking from class | None | `200 OK` |

### 💳 Membership Management

| Method | Endpoint | Description | Request Body Example | Status Codes |
|---|---|---|---|---|
| `PATCH` | `/api/members/:id/renew` | Renew / extend membership expiry date | `{"additionalMonths": 6, "tier": "Platinum"}` | `200 OK`<br>`404 Not Found` |
| `GET` | `/api/members/expired` | Get list of all expired memberships | None | `200 OK` |

---

## 🏗️ 5. Project Folder Architecture

```text
assignment-08-gym-api/
├── config/
│   ├── db.js                # Mongoose connection
│   └── passport.js          # Passport Local strategy setup
├── controllers/
│   ├── authController.js    # Register with auto-expiry calculation
│   ├── classController.js   # Class CRUD & booking capacity logic
│   └── memberController.js  # Renewal & expired query handlers
├── middleware/
│   ├── authMiddleware.js    # Ensure session authentication
│   └── checkActiveMember.js # Check member is not expired
├── models/
│   ├── FitnessClass.js
│   └── User.js
├── routes/
│   ├── authRoutes.js
│   ├── classRoutes.js
│   └── memberRoutes.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## 🧪 6. Testing & Validation

1. Register a member with a 1-month membership and verify `membershipExpiryDate` is calculated exactly 30 days in the future.
2. Create a class with `maxCapacity = 2`.
3. Attempt to book 3 members into the class; verify the 3rd booking fails with `400 Bad Request: Class capacity reached`.
4. Test `/api/members/expired` to view members whose `membershipExpiryDate < new Date()`.

---

## 📊 7. Grading Rubric (100 Marks)

| Evaluation Component | Marks |
|---|:---:|
| **Mongoose Schemas, Date Handling & Hooks** | 25 |
| **Passport Session Authentication & Bcrypt Hashing** | 20 |
| **Fitness Class CRUD & Capacity Validation Logic** | 25 |
| **Membership Renewal & Expiry Checks** | 15 |
| **Code Modularity, Status Codes & Error Handling** | 15 |
| **Total Marks** | **100** |

---

## 📤 8. Submission Guidelines

- Submit GitHub repository: `itm-assignment-08-gym-api`.
- Include a Postman test suite with class booking and membership renewal requests.
