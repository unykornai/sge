import { Router, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { verifyWebhookSignature, processWebhookEvent } from '../services/commerce';
import { logger } from '../services/logger';

const router = Router();

/**
 * Coinbase Commerce webhook endpoint
 * CRITICAL: Must use raw body for signature verification
 */
router.post(
  '/commerce/webhook',
  bodyParser.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-cc-webhook-signature'] as string;
      
      if (!signature) {
        logger.warn('Webhook missing signature header');
        return res.status(400).json({ error: 'Missing signature' });
      }
      
      const rawBody = req.body as Buffer;
      
      // Verify signature
      const isValid = verifyWebhookSignature(rawBody, signature);
      
      if (!isValid) {
        logger.warn({ signature }, 'Invalid webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      // Parse event from raw body
      const event = JSON.parse(rawBody.toString('utf8'));
      
      // Process event (idempotent)
      await processWebhookEvent(event);
      
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Webhook processing error');
      res.status(500).json({ error: 'Processing failed' });
    }
  }
);

export default router;
