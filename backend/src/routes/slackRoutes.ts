import { Router } from 'express';
import { SlackController } from '../controllers/slackController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/auth-url', authMiddleware, SlackController.getAuthUrl);
router.get('/callback', SlackController.oauthCallback);
router.post('/webhook', authMiddleware, SlackController.setWebhook);
router.get('/status', authMiddleware, SlackController.getStatus);
router.post('/disconnect', authMiddleware, SlackController.disconnect);
router.post('/test-alert', authMiddleware, SlackController.testAlert);

export default router;
