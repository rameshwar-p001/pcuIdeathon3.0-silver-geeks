import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import attendanceRoutes from './routes/attendance.js';
import collaborationRoutes from './routes/collaboration.js';
import facultyRoutes from './routes/faculty.js';
import aiRoutes from './routes/ai.js';

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
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/ai', aiRoutes);

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
        listFaculties: 'GET /api/admin/faculties',
        assignClassTeacher: 'POST /api/admin/assign-class-teacher',
        assignedClasses: 'GET /api/admin/assigned-classes',
        getUsers: 'GET /api/admin/users',
        getUser: 'GET /api/admin/users/:uid',
        updateUser: 'PUT /api/admin/users/:uid',
        deleteUser: 'DELETE /api/admin/users/:uid'
      },
      attendance: {
        userAttendance: 'GET /api/attendance/user/:userId',
        allAttendance: 'GET /api/attendance/all',
        summary: 'GET /api/attendance/summary'
      },
      collaboration: {
        listPosts: 'GET /api/collaboration/posts',
        createPost: 'POST /api/collaboration/posts',
        requestToJoin: 'POST /api/collaboration/posts/:postId/request',
        cancelRequest: 'POST /api/collaboration/posts/:postId/request/cancel',
        ownerDecision: 'POST /api/collaboration/posts/:postId/request/:joinerUid/decision'
      },
      faculty: {
        dashboard: 'GET /api/faculty/dashboard',
        createAssignment: 'POST /api/faculty/assignments',
        getTimetable: 'GET /api/faculty/timetable?classId=...',
        updateTimetable: 'PUT /api/faculty/timetable'
      },
      ai: {
        askDoubt: 'POST /api/ai/doubt'
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
