import winston from 'winston';
import type { ProxyConfig } from '../types/config.js';

export function createLogger(config: Pick<ProxyConfig, 'logLevel'>) {
  return winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
      // winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });
}
