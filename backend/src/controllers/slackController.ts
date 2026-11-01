import { Request, Response } from 'express';
import { slackService } from '../services/slackService';
import { prisma } from '../config/db';

export class SlackController {
  /**
   * Get Slack OAuth authorization URL
   */
  public static getAuthUrl(req: Request, res: Response): void {
    const userId = req.user?.id || 'default';
    const url = slackService.getOAuthUrl(userId);
    res.json({ url });
  }

  /**
   * Handle Slack OAuth callback
   */
  public static async oauthCallback(req: Request, res: Response): Promise<void> {
    const { code, state } = req.query;
    if (!code) {
      res.status(400).send('Missing code parameter');
      return;
    }

    try {
      const result = await slackService.handleOAuthCallback(code as string, state as string);
      res.redirect(`/dashboard?slack_connected=true&channel=${encodeURIComponent(result.channel || '')}`);
    } catch (err: any) {
      console.error('[SlackController] OAuth error:', err.message);
      res.redirect(`/dashboard?slack_error=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Set custom Slack webhook directly
   */
  public static async setWebhook(req: Request, res: Response): Promise<void> {
    const { webhookUrl, channel } = req.body;
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      res.status(400).json({ error: 'Please provide a valid Slack webhook URL (starts with https://hooks.slack.com/)' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const success = await slackService.setWebhook(userId, webhookUrl, channel);
    if (success) {
      res.json({ success: true, message: 'Slack webhook connected successfully!' });
    } else {
      res.status(500).json({ error: 'Failed to save Slack webhook' });
    }
  }

  /**
   * Get current Slack integration status
   */
  public static async getStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ connected: false });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    res.json({
      connected: !!(user?.slackWebhookUrl || user?.slackAccessToken),
      channel: user?.slackChannel || null,
      teamName: user?.slackTeamName || null,
      webhookConfigured: !!user?.slackWebhookUrl,
    });
  }

  /**
   * Disconnect Slack
   */
  public static async disconnect(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const success = await slackService.disconnect(userId);
    res.json({ success, message: 'Slack disconnected successfully' });
  }

  /**
   * Live Test Alert endpoint: Send a verifiable rate-limit alert to the connected Slack channel!
   */
  public static async testAlert(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    const { senderEmail = 'outreach@reachinbox.test', limit = 200 } = req.body;

    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

    const notified = await slackService.notifyRateLimitHit({
      userId,
      senderEmail,
      hourWindow: new Date().toISOString(),
      limit,
      count: limit,
      rescheduledTo: nextHour,
    });

    if (notified) {
      res.json({
        success: true,
        message: `Verifiable test alert successfully sent to your connected Slack channel for ${senderEmail}!`,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Slack is not connected yet. Please connect Slack via OAuth or enter an Incoming Webhook URL first.',
      });
    }
  }
}
