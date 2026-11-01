import { Request, Response } from 'express';
import { searchService } from '../services/searchService';

export class SearchController {
  public static async search(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string || req.query.query as string || '').trim();
      const status = req.query.status as string | undefined;
      const limit = parseInt(req.query.limit as string || '20', 10);
      const offset = parseInt(req.query.offset as string || '0', 10);

      const startTime = Date.now();
      const result = await searchService.searchEmails({
        query: q,
        status,
        userId: req.user?.id,
        limit,
        offset,
      });
      const durationMs = Date.now() - startTime;

      res.json({
        success: true,
        query: q,
        total: result.total,
        emails: result.emails,
        source: result.source,
        durationMs,
      });
    } catch (err: any) {
      console.error('[SearchController] search error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
}
