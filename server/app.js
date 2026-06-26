require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./src/routes/auth.routes');
const leadsRoutes = require('./src/routes/leads.routes');
const employeesRoutes = require('./src/routes/employees.routes');
const adminRoutes = require('./src/routes/admin.routes');
const aiRoutes = require('./src/routes/ai.routes');
const activityRoutes = require('./src/routes/activity.routes');
const followupRoutes = require('./src/routes/followup.routes');
const pipelineRoutes = require('./src/routes/pipeline.routes');
const errorHandler = require('./src/middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/pipeline', pipelineRoutes);

app.use(errorHandler);

module.exports = app;
