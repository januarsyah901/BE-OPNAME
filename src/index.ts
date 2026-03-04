import app from './app';
import { config } from './config/env';

const startServer = () => {
    try {
        app.listen(config.port, () => {
            console.log(`🚀 Server is running on http://localhost:${config.port}`);
        });
    } catch (error) {
        console.error('Error starting server', error);
        process.exit(1);
    }
};

startServer();
