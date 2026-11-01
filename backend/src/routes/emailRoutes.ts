import { Router } from 'express';
import multer from 'multer';
import { EmailController } from '../controllers/emailController';
import { authMiddleware } from '../middleware/authMiddleware';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.post('/schedule', authMiddleware, EmailController.scheduleSingle);
router.post('/schedule-bulk', authMiddleware, EmailController.scheduleBulk);
router.post('/upload-csv', authMiddleware, upload.single('file'), EmailController.parseLeadFile);
router.get('/scheduled', authMiddleware, EmailController.getScheduledEmails);
router.get('/sent', authMiddleware, EmailController.getSentEmails);
router.delete('/:id', authMiddleware, EmailController.cancelEmail);
router.get('/stats', authMiddleware, EmailController.getStats);
router.get('/senders', authMiddleware, EmailController.getSenders);
router.post('/senders', authMiddleware, EmailController.createSender);

export default router;
