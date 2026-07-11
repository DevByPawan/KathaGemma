import dotenv from 'dotenv';
import path from 'path';

// Load env before loading App
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import { logger } from '@/utils/logger';

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

const shutdown = () => {
  logger.info('Shutting down server gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
