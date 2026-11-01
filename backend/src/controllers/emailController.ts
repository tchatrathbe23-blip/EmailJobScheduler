import { Request, Response } from 'express';
import { schedulerService } from '../services/schedulerService';
import { searchService } from '../services/searchService';
import { prisma } from '../config/db';
import { parseEmailsFromFile } from '../utils/csvParser';
import { rateLimiter } from '../services/rateLimiter';

export class EmailController {
  /**
   * Schedule a single email
   */
  public static async scheduleSingle(req: Request, res: Response): Promise<void> {
    try {
      const { senderEmail, recipientEmail, subject, body, scheduledAt, delayBetweenEmails, hourlyLimit } = req.body;

      if (!senderEmail || !recipientEmail || !subject || !body || !scheduledAt) {
        res.status(400).json({ error: 'Missing required fields: senderEmail, recipientEmail, subject, body, scheduledAt' });
        return;
      }

      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        res.status(400).json({ error: 'Invalid scheduledAt timestamp' });
        return;
      }

      const email = await schedulerService.scheduleSingleEmail({
        userId: req.user?.id,
        senderEmail,
        recipientEmail,
        subject,
        body,
        scheduledAt: scheduledDate,
        delayBetweenEmails: delayBetweenEmails ? parseInt(delayBetweenEmails, 10) : 2000,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 200,
      });

      res.status(201).json({
        success: true,
        message: 'Email scheduled successfully',
        email,
      });
    } catch (err: any) {
      console.error('[EmailController] scheduleSingle error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Schedule bulk emails
   */
  public static async scheduleBulk(req: Request, res: Response): Promise<void> {
    try {
      const { senderEmail, recipientEmails, subject, body, startTime, delayBetweenEmails, hourlyLimit } = req.body;

      if (!senderEmail || !Array.isArray(recipientEmails) || recipientEmails.length === 0 || !subject || !body || !startTime) {
        res.status(400).json({ error: 'Missing required bulk schedule fields' });
        return;
      }

      const startDate = new Date(startTime);
      if (isNaN(startDate.getTime())) {
        res.status(400).json({ error: 'Invalid startTime timestamp' });
        return;
      }

      const result = await schedulerService.scheduleBulkEmails({
        userId: req.user?.id,
        senderEmail,
        recipientEmails,
        subject,
        body,
        startTime: startDate,
        delayBetweenEmails: delayBetweenEmails ? parseInt(delayBetweenEmails, 10) : 2000,
        hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 200,
      });

      res.status(201).json({
        success: true,
        message: `Successfully scheduled ${result.totalScheduled} emails`,
        ...result,
      });
    } catch (err: any) {
      console.error('[EmailController] scheduleBulk error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Parse uploaded CSV or TXT lead file
   */
  public static async parseLeadFile(req: Request, res: Response): Promise<void> {
    try {
      let fileContent = '';

      if (req.file) {
        fileContent = req.file.buffer.toString('utf-8');
      } else if (req.body.content) {
        fileContent = req.body.content;
      } else {
        res.status(400).json({ error: 'No file uploaded or content provided' });
        return;
      }

      const parsed = parseEmailsFromFile(fileContent);

      res.json({
        success: true,
        emails: parsed.emails,
        count: parsed.count,
        duplicatesRemoved: parsed.duplicatesRemoved,
        preview: parsed.emails.slice(0, 5),
      });
    } catch (err: any) {
      console.error('[EmailController] parseLeadFile error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * List scheduled emails (with search & pagination)
   */
  public static async getScheduledEmails(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '15', 10);
      const search = (req.query.search as string || '').trim();
      const offset = (page - 1) * limit;

      if (search) {
        const result = await searchService.searchEmails({
          query: search,
          limit,
          offset,
        });

        const scheduledOnly = result.emails.filter((e) => ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'].includes(e.status));
        res.json({
          emails: scheduledOnly,
          total: scheduledOnly.length,
          page,
          limit,
          source: result.source,
        });
        return;
      }

      const [total, emails] = await Promise.all([
        prisma.emailJob.count({
          where: {
            status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
          },
        }),
        prisma.emailJob.findMany({
          where: {
            status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] },
          },
          orderBy: { scheduledAt: 'asc' },
          skip: offset,
          take: limit,
        }),
      ]);

      res.json({
        emails,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      });
    } catch (err: any) {
      console.error('[EmailController] getScheduledEmails error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * List sent emails (with search & pagination)
   */
  public static async getSentEmails(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '15', 10);
      const search = (req.query.search as string || '').trim();
      const offset = (page - 1) * limit;

      if (search) {
        const result = await searchService.searchEmails({
          query: search,
          limit,
          offset,
        });

        const sentOnly = result.emails.filter((e) => ['SENT', 'FAILED'].includes(e.status));
        res.json({
          emails: sentOnly,
          total: sentOnly.length,
          page,
          limit,
          source: result.source,
        });
        return;
      }

      const [total, emails] = await Promise.all([
        prisma.emailJob.count({
          where: {
            status: { in: ['SENT', 'FAILED'] },
          },
        }),
        prisma.emailJob.findMany({
          where: {
            status: { in: ['SENT', 'FAILED'] },
          },
          orderBy: { sentAt: 'desc' },
          skip: offset,
          take: limit,
        }),
      ]);

      res.json({
        emails,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      });
    } catch (err: any) {
      console.error('[EmailController] getSentEmails error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Cancel / delete a scheduled email
   */
  public static async cancelEmail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await schedulerService.cancelEmail(id);
      if (success) {
        res.json({ success: true, message: 'Scheduled email cancelled successfully' });
      } else {
        res.status(404).json({ error: 'Email job not found' });
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Dashboard Overview Statistics
   */
  public static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const [scheduledCount, sentCount, failedCount, rateLimitedCount] = await Promise.all([
        prisma.emailJob.count({ where: { status: 'SCHEDULED' } }),
        prisma.emailJob.count({ where: { status: 'SENT' } }),
        prisma.emailJob.count({ where: { status: 'FAILED' } }),
        prisma.emailJob.count({ where: { status: 'RATE_LIMITED' } }),
      ]);

      const senders = await prisma.senderConfig.findMany();

      res.json({
        scheduled: scheduledCount,
        sent: sentCount,
        failed: failedCount,
        rateLimited: rateLimitedCount,
        totalProcessed: sentCount + failedCount,
        sendersCount: senders.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Get configured senders
   */
  public static async getSenders(req: Request, res: Response): Promise<void> {
    try {
      let senders = await prisma.senderConfig.findMany({
        orderBy: { email: 'asc' },
      });

      if (senders.length === 0) {
        // Seed standard ReachInbox senders
        const seeded = [
          { email: 'alex@reachinbox.test', displayName: 'Alex Rivera (Growth)', hourlyLimit: 100 },
          { email: 'sarah@reachinbox.test', displayName: 'Sarah Connor (Outreach)', hourlyLimit: 200 },
          { email: 'campaigns@reachinbox.test', displayName: 'Automated Lead Gen', hourlyLimit: 50 },
        ];
        for (const s of seeded) {
          await prisma.senderConfig.create({ data: s });
        }
        senders = await prisma.senderConfig.findMany();
      }

      // Append real-time hourly usage from Redis for each sender
      const sendersWithUsage = await Promise.all(
        senders.map(async (sender) => {
          const usage = await rateLimiter.getSenderUsage(sender.email);
          return {
            ...sender,
            currentHourSent: usage.currentCount,
            hourWindow: usage.hourWindow,
          };
        })
      );

      res.json({ senders: sendersWithUsage });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  /**
   * Add or update sender config
   */
  public static async createSender(req: Request, res: Response): Promise<void> {
    try {
      const { email, displayName, hourlyLimit } = req.body;
      if (!email) {
        res.status(400).json({ error: 'Sender email is required' });
        return;
      }

      const sender = await prisma.senderConfig.upsert({
        where: { email },
        update: {
          displayName: displayName || undefined,
          hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 200,
        },
        create: {
          email,
          displayName: displayName || email.split('@')[0],
          hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 200,
        },
      });

      res.status(201).json({ success: true, sender });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
