"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const startServer = () => {
    try {
        app_1.default.listen(env_1.config.port, () => {
            console.log(`🚀 Server is running on http://localhost:${env_1.config.port}`);
        });
    }
    catch (error) {
        console.error('Error starting server', error);
        process.exit(1);
    }
};
startServer();
