"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const body_parser_1 = __importDefault(require("body-parser"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
// Import Routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const customerRoutes_1 = __importDefault(require("./routes/customerRoutes"));
const vehicleRoutes_1 = __importDefault(require("./routes/vehicleRoutes"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const sparepartRoutes_1 = __importDefault(require("./routes/sparepartRoutes"));
const stockRoutes_1 = __importDefault(require("./routes/stockRoutes"));
const opnameRoutes_1 = __importDefault(require("./routes/opnameRoutes"));
const transactionRoutes_1 = __importDefault(require("./routes/transactionRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const settingRoutes_1 = __importDefault(require("./routes/settingRoutes"));
const app = (0, express_1.default)();
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
// Swagger UI Documentation
app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default, {
    customSiteTitle: 'AutoService API Docs',
    swaggerOptions: { persistAuthorization: true }
}));
// Expose raw OpenAPI JSON spec
app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swagger_1.default);
});
// Route registrations
app.use('/api/v1/auth', authRoutes_1.default);
app.use('/api/v1/users', userRoutes_1.default);
app.use('/api/v1/customers', customerRoutes_1.default);
app.use('/api/v1/vehicles', vehicleRoutes_1.default);
app.use('/api/v1/categories', categoryRoutes_1.default);
app.use('/api/v1/spare-parts', sparepartRoutes_1.default);
app.use('/api/v1/stock', stockRoutes_1.default);
app.use('/api/v1/stock-movements', stockRoutes_1.default); // Can map properly later
app.use('/api/v1/opnames', opnameRoutes_1.default);
app.use('/api/v1/transactions', transactionRoutes_1.default);
app.use('/api/v1/reports', reportRoutes_1.default);
app.use('/api/v1/notifications', notificationRoutes_1.default);
app.use('/api/v1/settings', settingRoutes_1.default);
// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found'
        }
    });
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        error: {
            code: err.code || 'SERVER_ERROR',
            message: err.message || 'Internal Server Error'
        }
    });
});
exports.default = app;
