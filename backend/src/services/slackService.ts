import axios from 'axios';
import { prisma } from '../config/db';
import { config } from '../config/env';

interface RateLimitNotificationData {
  userId?: string | null;
  senderEmail: string;
  hourWindow: string;
  limit: number;
  count: number;
  rescheduledTo?: Date;
}

export class SlackService {
  /**
   * Generates the Slack OAuth V2 URL
   */
  public getOAuthUrl(state?: string): string {
    const scopes = ['incoming-webhook', 'chat:write'];
    const redirectUri = encodeURIComponent(config.slackRedirectUri);
    const scopeParam = encodeURIComponent(scopes.join(','));
    return `https://slack.com/oauth/v2/authorize?client_id=${config.slackClientId}&scope=${scopeParam}&redirect_uri=${redirectUri}&state=${encodeURIComponent(state || 'default')}`;
  }

  /**
   * Exchange code for Slack OAuth token
   */
  public async handleOAuthCallback(code: string, userId?: string): Promise<{ success: boolean; channel?: string; webhookUrl?: string }> {
    try {
      const response = await axios.post(
        'https://slack.com/api/oauth.v2.access',
        new URLSearchParams({
          code,
          client_id: config.slackClientId,
          client_secret: config.slackClientSecret,
          redirect_uri: config.slackRedirectUri,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      const data = response.data;
      if (!data.ok) {
        throw new Error(data.error || 'Slack OAuth exchange failed');
      }

      const webhookUrl = data.incoming_webhook?.url;
      const channel = data.incoming_webhook?.channel;
      const teamName = data.team?.name;
      const accessToken = data.access_token;

      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            slackAccessToken: accessToken,
            slackWebhookUrl: webhookUrl,
            slackChannel: channel,
            slackTeamName: teamName,
          },
        });
      }

      return { success: true, channel, webhookUrl };
    } catch (err: any) {
      console.error('[SlackService] OAuth exchange error:', err.message);
      throw err;
    }
  }

  /**
   * Connect or update Slack webhook directly
   */
  public async setWebhook(userId: string, webhookUrl: string, channelName?: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          slackWebhookUrl: webhookUrl,
          slackChannel: channelName || '#outreach-alerts',
        },
      });
      return true;
    } catch (err: any) {
      console.error('[SlackService] Error saving webhook:', err.message);
      return false;
    }
  }

  /**
   * Disconnect Slack
   */
  public async disconnect(userId: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          slackAccessToken: null,
          slackWebhookUrl: null,
          slackChannel: null,
          slackTeamName: null,
        },
      });
      return true;
    } catch (err: any) {
      console.error('[SlackService] Error disconnecting Slack:', err.message);
      return false;
    }
  }

  /**
   * Send Rate Limit Notification to Slack
   */
  public async notifyRateLimitHit(data: RateLimitNotificationData): Promise<boolean> {
    try {
      // 1. Determine target Slack Webhook
      let webhookUrl: string | null = null;
      let channelName: string | null = null;

      if (data.userId) {
        const user = await prisma.user.findUnique({
          where: { id: data.userId },
        });
        if (user?.slackWebhookUrl) {
          webhookUrl = user.slackWebhookUrl;
          channelName = user.slackChannel || '#outreach-alerts';
        }
      }

      // Fallback to global config webhook if user hasn't set one
      if (!webhookUrl && config.slackDefaultWebhookUrl) {
        webhookUrl = config.slackDefaultWebhookUrl;
      }

      if (!webhookUrl) {
        console.log(`[SlackService] Rate limit hit for sender ${data.senderEmail}, but Slack is not connected. Skipping notification.`);
        return false;
      }

      const rescheduledText = data.rescheduledTo 
        ? data.rescheduledTo.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'Next Hour Window';

      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 ReachInbox Rate Limit Reached',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:*\n\`${data.senderEmail}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n${data.limit} emails / hr`,
            },
            {
              type: 'mrkdwn',
              text: `*Current Count:*\n${data.count} emails`,
            },
            {
              type: 'mrkdwn',
              text: `*Next Execution Window:*\n${rescheduledText}`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕒 *Time:* ${new Date().toISOString()} | 🛡️ *Action:* Remaining pending jobs have been delayed to protect sender domain reputation.`,
            },
          ],
        },
      ];

      await axios.post(webhookUrl, {
        text: `🚨 Rate Limit Alert: Sender ${data.senderEmail} hit hourly limit of ${data.limit} emails. Subsequent emails rescheduled.`,
        blocks,
      });

      console.log(`[SlackService] Successfully delivered rate limit alert to Slack for sender ${data.senderEmail}`);

      // Record rate limit event
      await prisma.rateLimitEvent.create({
        data: {
          senderEmail: data.senderEmail,
          hourWindow: data.hourWindow,
          count: data.count,
          limit: data.limit,
          slackNotified: true,
          rescheduledTo: data.rescheduledTo,
        },
      });

      return true;
    } catch (err: any) {
      console.error('[SlackService] Failed to send Slack alert:', err.message);
      return false;
    }
  }
}

export const slackService = new SlackService();
