require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const imageRoutes = require('./routes/images');
const logRoutes = require('./routes/logs');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10kb' }));
app.use(generalLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/', imageRoutes);
app.use('/logs', logRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
