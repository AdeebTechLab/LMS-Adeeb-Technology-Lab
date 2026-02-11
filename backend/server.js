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
const notificationRoutes = require('./routes/notifications');
const userNotificationRoutes = require('./routes/userNotifications');
const chatRoutes = require('./routes/chat');
const statsRoutes = require('./routes/stats');
const settingsRoutes = require('./routes/settings');
const liveClassRoutes = require('./routes/liveClass');
const directoryRoutes = require('./routes/directory');

// Import attendance lock function
const { lockTodayAttendance } = require('./controllers/attendanceController');

// Import installment generation functions
const { runInstallmentJob } = require('./scripts/generateInstallments');

const app = express();
const server = http.createServer(app);

// Socket.io Setup
const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://lms-adeeb-technology-lab.vercel.app',
    'https://lms-adeeb-technology-lab.onrender.com'
];

if (process.env.CLIENT_URL) {
    const envOrigins = process.env.CLIENT_URL.split(',');
    origins.push(...envOrigins);
}

const io = require('socket.io')(server, {
    cors: {
        origin: origins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('🔌 New client connected');

    socket.on('join_chat', (userId) => {
        const room = userId.toString();
        socket.join(room);
        socket.userId = room; // Store user identifier on socket
        console.log(`👤 User joined personal chat room: ${room}`);
    });

    socket.on('send_global_message', async (data) => {
        const targetRoom = data.recipientId.toString();
        const senderRoom = data.senderId.toString();

        console.log(`💬 Global Message from ${senderRoom} to ${targetRoom}: ${data.text}`);

        // Ensure recipient is in room if connected
        const socketsInRoom = io.sockets.adapter.rooms.get(targetRoom);
        if (!socketsInRoom || socketsInRoom.size === 0) {
            const allSockets = await io.fetchSockets();
            for (const s of allSockets) {
                if (s.userId === targetRoom) {
                    s.join(targetRoom);
                    console.log(`🔄 Auto-joined socket ${s.id} to room ${targetRoom}`);
                }
            }
        }

        // Emit to recipient
        io.to(targetRoom).emit('new_global_message', data);
        // Emit back to sender
        io.to(senderRoom).emit('new_global_message', data);
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

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
    req.setTimeout(30000);
    res.setTimeout(30000);
    next();
});

// Connect to MongoDB with optimized settings for serverless/deployment
mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 10000,
    retryWrites: true,
    retryReads: true,
    readPreference: 'primaryPreferred', // Prefer primary to avoid stale reads
    w: 'majority' // Write concern for data consistency
})
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB error:', err.message));

// Keep MongoDB connection alive
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected. Reconnecting...');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

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
app.use('/api/notifications', notificationRoutes);
app.use('/api/user-notifications', userNotificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/live-class', liveClassRoutes);
app.use('/api/directory', directoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', socket: !!io });
});

// Attendance auto-save & lock cron job - Runs daily at 12:00 AM (midnight)
// This saves and locks the PREVIOUS day's attendance, marking any unmarked students as absent
cron.schedule('0 0 * * *', async () => {
    console.log('🕛 Midnight cron triggered - Auto-saving attendance...');
    try {
        const result = await lockTodayAttendance();
        console.log(`✅ Daily attendance auto-save completed: ${result.processedCount} courses processed, ${result.createdCount} new records`);
    } catch (error) {
        console.error('❌ Attendance auto-save failed:', error);
    }
});

// Installment generation cron job - Runs daily at 1:00 AM
cron.schedule('0 1 * * *', async () => {
    try {
        console.log('🔄 Running daily installment job...');
        await runInstallmentJob();
        console.log('✅ Daily installment job completed');
    } catch (error) {
        console.error('❌ Installment job failed:', error);
    }
});

// 404 handler for unmatched routes
app.use('/api/*', (req, res) => {
    console.log(`⚠️ 404 Not Found: ${req.method} ${req.originalUrl}`);
    console.log(`   Headers:`, JSON.stringify(req.headers, null, 2).substring(0, 500));
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
        debug: {
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl
        }
    });
});

// Run installment job once on server startup (after 5 seconds delay)
setTimeout(async () => {
    try {
        console.log('🔄 Running startup installment check...');
        await runInstallmentJob();
        console.log('✅ Startup installment check completed');
    } catch (error) {
        console.error('❌ Startup installment check failed:', error);
    }
}, 5000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;
