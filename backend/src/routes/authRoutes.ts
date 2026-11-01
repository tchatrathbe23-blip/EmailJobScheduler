import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/google/url', AuthController.getGoogleAuthUrl);
router.post('/google/callback', AuthController.googleCallback);
router.post('/demo', AuthController.loginDemo);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/logout', AuthController.logout);

export default router;
