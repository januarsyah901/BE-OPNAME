import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

// Import Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import customerRoutes from './routes/customerRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import categoryRoutes from './routes/categoryRoutes';
import sparepartRoutes from './routes/sparepartRoutes';
import stockRoutes from './routes/stockRoutes';
import stockMovementRoutes from './routes/stockMovementRoutes';
import opnameRoutes from './routes/opnameRoutes';
import transactionRoutes from './routes/transactionRoutes';
import reportRoutes from './routes/reportRoutes';
import notificationRoutes from './routes/notificationRoutes';
import settingRoutes from './routes/settingRoutes';
import workOrderRoutes from './routes/workOrderRoutes';

const app = express();

// Middleware
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "*"],
                fontSrc: ["'self'", "https:", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'self'"]
            }
        },
        crossOriginEmbedderPolicy: false
    })
);
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Swagger UI - gunakan CDN agar bisa jalan di Vercel serverless
const SWAGGER_UI_VERSION = '5.18.2';
const CDN_BASE = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;

const swaggerSetup = swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'AutoService API Docs',
    customCssUrl: `${CDN_BASE}/swagger-ui.css`,
    customJs: [
        `${CDN_BASE}/swagger-ui-bundle.js`,
        `${CDN_BASE}/swagger-ui-standalone-preset.js`
    ],
    swaggerOptions: {
        persistAuthorization: true,
        url: '/api/docs.json'
    }
});

// Route registrations
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/spare-parts', sparepartRoutes);
app.use('/api/v1/stock', stockRoutes);          // POST /stock/in, POST /stock/out
app.use('/api/v1/stock-movements', stockMovementRoutes); // GET /stock-movements
app.use('/api/v1/opnames', opnameRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/settings', settingRoutes);
app.use('/api/v1/work-orders', workOrderRoutes);

// Swagger UI & raw spec — di-mount SETELAH semua route API
// agar swagger-ui-express serve middleware tidak menginterceptor request API
app.get('/api/docs.json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
app.use('/api/docs', swaggerUi.serve, swaggerSetup);
// Redirect root → /api/docs untuk kemudahan akses
app.get('/', (_req: Request, res: Response) => {
    res.redirect('/api/docs');
});

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'SERVER_ERROR',
            message: err.message || 'Internal Server Error'
        }
    });
});

export default app;
