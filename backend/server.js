require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const gatewayRoutes = require('./routes/gateway');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // In production, replace with specific origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Docs only exist when explicitly enabled
if (process.env.ENABLE_DOCS === 'true') {
  const spec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: { title: 'MedIntel API', version: '1.0.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    apis: ['./routes/*.js'],
  });
  // Mounted at /docs, NOT under /api, so Nginx never forwards it
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}

// Serve Uploaded Files static folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', gatewayRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the MedIntel API Gateway' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server gateway' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[Express Backend] API Gateway running on port ${PORT}`);
});
