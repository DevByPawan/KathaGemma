import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFoundHandler } from '@/middlewares/error';
import storyRouter from '@/routes/story.routes';
import voiceRouter from '@/routes/voice.routes';
import cameraRouter from '@/routes/camera.routes';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend running',
  });
});

app.get('/api/version', (req, res) => {
  res.status(200).json({
    success: true,
    version: '1.0.0',
  });
});

app.use('/api/story', storyRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/camera', cameraRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
