import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, SearchController.search);

export default router;
