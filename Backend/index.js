const express = require ('express');
const app = express();
const mongoose = require ('mongoose');
const cors = require ('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const port = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

app.use(cors());
app.use(express.json());

const authRoutes = require ('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);

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

app.get('/', (req, res) => {
    res.send("API Running")
});

server.listen(port, () => console.log(`server running on ${port}`));