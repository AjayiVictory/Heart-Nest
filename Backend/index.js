const express = require ('express');
const app = express();
const mongoose = require ('mongoose');
const cors = require ('cors');
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

app.get('/', (req, res) => {
    res.send("API Running")
});

app.listen(port, () => console.log(`server running on ${port}`));