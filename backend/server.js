const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const cloudinary = require('cloudinary').v2;
const http = require('http');

// Load environment variables
dotenv.config();

// Validate environment variables
console.log('\n========================================');
console.log('🔧 LMS BACKEND - Starting...');
console.log('========================================\n');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const feeRoutes = require('./routes/fees');
const attendanceRoutes = require('./routes/attendance');
const assignmentRoutes = require('./routes/assignments');
const certificateRoutes = require('./routes/certificates');
const taskRoutes = require('./routes/tasks');
const dailyTasksRoutes = require('./routes/dailyTasks');

// Import attendance lock function
const { lockTodayAttendance } = require('./controllers/attendanceController');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const origins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : ['http://localhost:5173', 'http://localhost:3000'];

const io = require('socket.io')(server, {
    cors: {
        origin: origins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

io.on('connection', (socket) => {
    console.log('🔌 New client connected');

    socket.on('join_task', (taskId) => {
        socket.join(taskId);
        console.log(`👤 User joined task room: ${taskId}`);
    });

    socket.on('send_message', (data) => {
        console.log(`💬 Message in room ${data.taskId}: ${data.text}`);
        io.to(data.taskId).emit('new_message', data);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected');
    });
});

// Middleware
app.use(cors({
    origin: origins,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB error:', err.message));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/daily-tasks', dailyTasksRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', socket: !!io });
});

cron.schedule('0 12 * * *', async () => {
    try {
        await lockTodayAttendance();
        console.log('✅ Attendance locked');
    } catch (error) {
        console.error('❌ Lock failed:', error);
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
