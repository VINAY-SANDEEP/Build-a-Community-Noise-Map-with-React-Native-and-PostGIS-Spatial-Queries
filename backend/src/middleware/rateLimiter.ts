import { Request, Response, NextFunction } from 'express';

const rateLimitMap = new Map<string, number>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  if (rateLimitMap.has(ip)) {
    const lastRequestTime = rateLimitMap.get(ip)!;
    if (now - lastRequestTime < windowMs) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute before submitting again.'
      });
    }
  }

  rateLimitMap.set(ip, now);
  
  // Optional cleanup periodically to avoid Map growing infinitely
  if (Math.random() < 0.01) {
    const cutoff = now - windowMs;
    for (const [key, value] of rateLimitMap.entries()) {
      if (value < cutoff) rateLimitMap.delete(key);
    }
  }
  
  next();
};
