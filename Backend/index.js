const express = require ('express');
const app = express();
const mongoose = require ('mongoose');
const cors = require ('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Validate environment variables
const validateEnv = require('./validateEnv');
validateEnv();

const port = process.env.PORT || 5000;
let dbConnected = false;

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    dbConnected = true;
    console.log("MongoDB Connected");
})
.catch(err => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
});

app.use(cors());
app.use(express.json());

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Allow embedding from same origin and socket.io
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; script-src 'self' https://cdn.socket.io; connect-src 'self' wss: ws: https://cdn.socket.io; " +
        "img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'"
    );
    next();
});

const authRoutes = require ('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const path = require('path');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html for root path and SPA routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Create server with Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`socket disconnected: ${socket.id}`);
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        dbConnected: dbConnected,
        uptime: process.uptime()
    });
});

// 404 handler - but serve index.html for non-API routes (SPA routing)
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Route not found', path: req.path });
    } else {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

server.listen(port, () => console.log(`server running on ${port}`));