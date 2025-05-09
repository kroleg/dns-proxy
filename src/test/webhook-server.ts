import express, { Request, Response } from 'express';
import { createLogger } from '../logger.js';

const app = express();
const logger = createLogger('info');
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Store recent DNS resolutions in memory
const recentResolutions: Array<{
  hostname: string;
  ips: string[];
  timestamp: string;
}> = [];

// Endpoint to receive DNS resolution webhooks
app.post('/api/dns-resolutions', (req: Request, res: Response) => {
  const { hostname, ips, timestamp } = req.body;

  // Validate request
  if (!hostname || !Array.isArray(ips) || !timestamp) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  // Store the resolution
  recentResolutions.unshift({ hostname, ips, timestamp });
  // Keep only the last 100 resolutions
  if (recentResolutions.length > 100) {
    recentResolutions.pop();
  }

  // Log the resolution
  logger.info('Received DNS resolution:', { hostname, ips, timestamp });

  res.status(200).json({ message: 'Resolution recorded' });
});

// Endpoint to view recent resolutions
app.get('/api/dns-resolutions', (req: Request, res: Response) => {
  res.json(recentResolutions);
});

// Start the server
app.listen(port, () => {
  logger.info(`Webhook server listening on port ${port}`);
});
