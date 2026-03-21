import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import attendanceRoutes from './routes/attendance.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'Backend is running',
    routes: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      admin: {
        addStudent: 'POST /api/admin/add-student',
        addFaculty: 'POST /api/admin/add-faculty',
        getUsers: 'GET /api/admin/users',
        getUser: 'GET /api/admin/users/:uid',
        updateUser: 'PUT /api/admin/users/:uid',
        deleteUser: 'DELETE /api/admin/users/:uid'
      },
      attendance: {
        userAttendance: 'GET /api/attendance/user/:userId',
        allAttendance: 'GET /api/attendance/all',
        summary: 'GET /api/attendance/summary'
      }
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
