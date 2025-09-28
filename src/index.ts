import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'CarBrain AI Assistant',
    timestamp: new Date().toISOString(),
    architecture: 'Clean Architecture'
  });
});

app.listen(PORT, () => {
  console.log(`CarBrain AI Assistant server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;