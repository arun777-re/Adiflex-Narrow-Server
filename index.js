import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import salesOrderRoutes from './routes/salesOrderRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import dispatchRoutes from './routes/dispatchRoutes.js';



const app = express();

// Middleware
app.use(express.json());
app.use(cors(

));
app.use(morgan("combined"))
console.log({
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  WOVEN_DATABASE_ID: process.env.WOVEN_DATABASE_ID,
  CROCHET_DATABASE_ID: process.env.CROCHET_DATABASE_ID,
});
// Routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
app.use('/auth', authRoutes);
app.use('/sales-orders', salesOrderRoutes);
app.use('/production', productionRoutes);
app.use('/dispatch',dispatchRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
