import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

// Put the ID of the user you want to log in as here (e.g., 1, 2, or 3)
const USER_ID = 2;

const token = jwt.sign(
    { id: USER_ID },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
);

console.log("🔑 Here is your Master Token:");
console.log(token);