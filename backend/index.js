import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import attendanceRoutes from './routes/attendance.js';
import collaborationRoutes from './routes/collaboration.js';
import facultyRoutes from './routes/faculty.js';
import aiRoutes from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;













// Middleware
app.use(cors());
app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '10mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '10mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));

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
        aiPhotoMark: 'POST /api/attendance/ai-photo-mark',
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

// Ensure body parser errors are returned as JSON for frontend API helpers.
app.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Request payload is too large. Try recapturing face image and retry.',
      error: err.message,
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload',
      error: err.message,
    });
  }

  return next(err);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
