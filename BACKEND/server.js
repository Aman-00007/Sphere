import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import pool from './db.js';
import initDb from './initDb.js';

//Import all route modules
import authRoutes from './routes/authRoutes.js';
import bankRoutes from './routes/bankRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import queryRoutes from './routes/queryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import bankAccountRoutes from './routes/bankAccountRoutes.js';


const app = express();
const port = process.env.PORT || 3000;

//Global Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded documents statically so frontend can view them
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

//Run database setup and table creation on server start
initDb();



// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/banks", bankRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/queries", queryRoutes);
app.use("/api/accounts", bankAccountRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
    res.send(`<h1>Sphere FinTech API is running! 🚀</h1>`);
});

// Start server
app.listen(port, () => {
    console.log(`Server is listening on http://localhost:${port}.`);
});