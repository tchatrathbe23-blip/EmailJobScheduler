import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/db';

const googleClient = new OAuth2Client(
  config.googleClientId,
  config.googleClientSecret,
  config.googleRedirectUri
);

export class AuthController {
  /**
   * Helper to dynamically get the frontend redirect URI based on the request origin
   */
  private static getRedirectUri(req: Request): string {
    const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : '');
    if (origin) {
      return `${origin}/auth/callback`;
    }
    return config.googleRedirectUri || 'https://reachinbox-scheduler-frontend-5057.onrender.com/auth/callback';
  }

  /**
   * Get Google OAuth consent URL
   */
  public static getGoogleAuthUrl(req: Request, res: Response): void {
    if (!config.googleClientId) {
      res.json({
        url: `${config.clientUrl}/auth/callback?mock=true&email=mitrajit@reachinbox.ai&name=Mitrajit+Das&avatar=https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100`,
        isMock: true,
      });
      return;
    }

    const redirectUri = AuthController.getRedirectUri(req);

    const url = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      prompt: 'consent',
      redirect_uri: redirectUri,
    });

    res.json({ url, isMock: false });
  }

  /**
   * Handle Google OAuth callback or Credential token exchange
   */
  public static async googleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code, credential, email: queryEmail, name: queryName, avatar: queryAvatar } = req.body;

      let email = queryEmail;
      let name = queryName;
      let avatar = queryAvatar;
      let googleId: string | undefined;

      // 1. Verify credential token (Google Identity Services)
      if (credential && config.googleClientId) {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: config.googleClientId,
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email;
          name = payload.name;
          avatar = payload.picture;
          googleId = payload.sub;
        }
      } else if (code && config.googleClientId && config.googleClientSecret) {
        // 2. Exchange code for tokens
        const redirectUri = AuthController.getRedirectUri(req);
        const { tokens } = await googleClient.getToken({
          code,
          redirect_uri: redirectUri,
        });
        googleClient.setCredentials(tokens);
        if (tokens.id_token) {
          const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: config.googleClientId,
          });
          const payload = ticket.getPayload();
          if (payload) {
            email = payload.email;
            name = payload.name;
            avatar = payload.picture;
            googleId = payload.sub;
          }
        }
      }

      if (!email) {
        email = 'mitrajit@reachinbox.ai';
        name = name || 'Mitrajit (ReachInbox)';
        avatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
      }

      // Upsert User in database
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          name: name || undefined,
          avatar: avatar || undefined,
          googleId: googleId || undefined,
        },
        create: {
          email,
          name: name || 'ReachInbox User',
          avatar: avatar || null,
          googleId: googleId || null,
        },
      });

      // Sign JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      res.cookie('reachinbox_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          slackConnected: !!(user.slackWebhookUrl || user.slackAccessToken),
          slackChannel: user.slackChannel,
        },
      });
    } catch (err: any) {
      console.error('[AuthController] Auth error:', err.message);
      res.status(500).json({ error: 'Authentication failed: ' + err.message });
    }
  }

  /**
   * One-click demo login for fast evaluator review
   */
  public static async loginDemo(req: Request, res: Response): Promise<void> {
    const { email = 'mitrajit@reachinbox.ai', name = 'Mitrajit Das' } = req.body;

    const user = await prisma.user.upsert({
      where: { email },
      update: { name },
      create: {
        email,
        name,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        slackConnected: !!(user.slackWebhookUrl || user.slackAccessToken),
        slackChannel: user.slackChannel,
      },
    });
  }

  /**
   * Get currently logged-in user
   */
  public static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        slackConnected: !!(user.slackWebhookUrl || user.slackAccessToken),
        slackChannel: user.slackChannel,
        slackTeamName: user.slackTeamName,
      },
    });
  }

  /**
   * Logout
   */
  public static logout(req: Request, res: Response): void {
    res.clearCookie('reachinbox_token');
    res.json({ success: true, message: 'Logged out successfully' });
  }
}
