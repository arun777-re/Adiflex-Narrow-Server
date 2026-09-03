import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import http from 'http'
import cors from 'cors';
import { initSocket } from './socket/socket.js';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import salesOrderRoutes from './routes/salesOrderRoutes.js';
import productionRoutes from './routes/productionRoutes.js';
import dispatchRoutes from './routes/dispatchRoutes.js';
import productRoutes from './routes/productRoutes.js';
import fgRoutes from './routes/fgRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analysticsRoutes.js';
import activityRoutes from './routes/activityRoutes.js';



const app = express();

const server = http.createServer(app);

initSocket(server)


// Middleware
app.use(express.json());
app.use(cors({
origin:[
  "http://localhost:5173",
  "https://adiflex-narrow.vercel.app"
],
credentials:true
}));
app.use(morgan("combined"))

// Routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
app.use('/auth', authRoutes);
app.use('/sales-orders', salesOrderRoutes);
app.use('/production', productionRoutes);
app.use('/dispatch',dispatchRoutes);
app.use('/products',productRoutes);
app.use('/dashboard',dashboardRoutes);
app.use('/fg',fgRoutes);
app.use('/billing',billingRoutes);
app.use('/notifications',notificationRoutes);
app.use('/analytics',analyticsRoutes);
app.use('/activities',activityRoutes);
// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
	console.log(`Server is listening on port ${PORT}`);
});
