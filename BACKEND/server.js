import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import pool from './db.js';
import initDb from './initDb.js';
import authRoutes from './routes/authRoutes.js';

// Middleware



const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

initDb(); //Run database setup and table creation on server start



app.use('/api/auth', authRoutes);

app.get('/', (req,res)=>{
    res.send(`<h1>Hello Aman</h1>`);
});

app.listen(port,() => {
    console.log(`Server is listing on http://localhost:${port}.`);
});
