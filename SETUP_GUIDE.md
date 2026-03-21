# Campus AI Portal - Setup Guide

## Current Status

✅ **Backend server is running on port 5000**  
⚠️ **Using Firestore REST API (limited functionality)**  
❌ **Authentication and user management features REQUIRE service account**

---

## What's Working Now

- ✅ Read-only Firestore operations (GET endpoints)
- ✅ Attendance monitoring views (get-only)
- ✅ User profile retrieval

## What's NOT Working Yet

- ❌ User login/registration (requires Auth SDK)
- ❌ Admin user management (create/edit/delete users)
- ❌ Student/Faculty account creation
- ❌ All POST, PUT, DELETE operations

---

## How to Enable Full Functionality

### Step 1: Get Firebase Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your **campus-8a535** project
3. Go to **Project Settings** (⚙️ icon in the top-left)
4. Click the **Service Accounts** tab
5. Click **"Generate a new private key"** button
6. A JSON file will download automatically
7. Save this file as `serviceAccount.json` in the `backend/` folder

### Step 2: Place the Service Account File

```
pcuIdeathon3.0-silver-geeks/
├── backend/
│   ├── serviceAccount.json        ← Place the downloaded file here
│   ├── package.json
│   ├── index.js
│   ├── .env
│   └── ...
```

### Step 3: Restart the Backend

Kill the currently running server and restart it:

```bash
# In PowerShell, in the backend folder
npm start
```

You should see:
```
✅ Firebase Admin SDK initialized
Server is running on port 5000
```

---

## What You Can Do Then

Once the service account is set up, you'll have full access to:

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create admin account
- `POST /api/auth/login` - Login and get authentication token
- `GET /api/auth/me` - Get current user profile

### Admin User Management (`/api/admin`)
- `POST /api/admin/add-student` - Create student account
- `POST /api/admin/add-faculty` - Create faculty account
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:uid` - Get specific user details
- `PUT /api/admin/users/:uid` - Update user details
- `DELETE /api/admin/users/:uid` - Delete user account

### Attendance Monitoring (`/api/attendance`)
- `GET /api/attendance/all` - View all attendance records
- `GET /api/attendance/user/:userId` - View specific user's attendance
- `GET /api/attendance/summary` - View attendance summary with percentages

---

## Environment Variables (Already Set)

The following are already configured in `backend/.env`:

```
PORT=5000
NODE_ENV=development
FIREBASE_API_KEY=AIzaSyAedalj8AmxMt8Nz6-nbbX6qNY0RIU-iDA
FIREBASE_AUTH_DOMAIN=campus-8a535.firebaseapp.com
FIREBASE_PROJECT_ID=campus-8a535
FIREBASE_STORAGE_BUCKET=campus-8a535.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=717676748693
FIREBASE_APP_ID=1:717676748693:web:54703a62487721b6b6e09c
```

Once you get the service account, you can optionally add these to `.env`:
```
FIREBASE_PRIVATE_KEY=your_private_key_here
FIREBASE_CLIENT_EMAIL=your_client_email_here
```

But it's easier to just place the `serviceAccount.json` file in the backend folder.

---

## Testing the API

### Without Service Account (Currently Working)

```bash
# Get all attendance records
curl http://localhost:5000/api/attendance/all

# Get user attendance
curl http://localhost:5000/api/attendance/user/someUserId
```

### After Adding Service Account

```bash
# Register admin
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123","name":"Admin"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Add student (requires admin token from login)
curl -X POST http://localhost:5000/api/admin/add-student \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name":"John Doe",
    "email":"john@example.com",
    "password":"password123",
    "enrollmentNumber":"2024001",
    "department":"CSE",
    "semester":"4"
  }'
```

---

## Next Steps

1. Get and place `serviceAccount.json` in the backend folder
2. Restart the backend server
3. Frontend integration can begin once auth is working

The frontend forms are ready but disconnected - they need to call the backend API endpoints once authentication is enabled.
