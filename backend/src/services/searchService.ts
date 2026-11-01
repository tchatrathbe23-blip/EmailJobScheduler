import { esClient, isElasticsearchAvailable } from '../config/elasticsearch';
import { config } from '../config/env';
import { prisma } from '../config/db';

export interface EmailDocument {
  id: string;
  userId?: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  batchId?: string | null;
  etherealPreviewUrl?: string | null;
}

export interface SearchParams {
  query?: string;
  status?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

export class SearchService {
  /**
   * Index or update an email document in Elasticsearch
   */
  public async indexEmail(email: EmailDocument): Promise<void> {
    if (!isElasticsearchAvailable) {
      return;
    }

    try {
      await esClient.index({
        index: config.elasticsearchIndex,
        id: email.id,
        document: {
          id: email.id,
          userId: email.userId || null,
          senderEmail: email.senderEmail,
          recipientEmail: email.recipientEmail,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          sentAt: email.sentAt || null,
          batchId: email.batchId || null,
          etherealPreviewUrl: email.etherealPreviewUrl || null,
        },
      });
    } catch (err: any) {
      console.warn(`[SearchService] Failed to index email ${email.id} to ES:`, err.message);
    }
  }

  /**
   * Delete an email document from Elasticsearch (if cancelled/deleted)
   */
  public async deleteEmail(id: string): Promise<void> {
    if (!isElasticsearchAvailable) return;
    try {
      await esClient.delete({
        index: config.elasticsearchIndex,
        id,
      });
    } catch (err: any) {
      console.warn(`[SearchService] Failed to delete email ${id} from ES:`, err.message);
    }
  }

  /**
   * Search emails across Elasticsearch with fallback to Prisma database
   */
  public async searchEmails(params: SearchParams): Promise<{ total: number; emails: any[]; source: 'elasticsearch' | 'database' }> {
    const { query, status, userId, limit = 20, offset = 0 } = params;

    if (isElasticsearchAvailable) {
      try {
        const mustClauses: any[] = [];
        const filterClauses: any[] = [];

        if (status) {
          filterClauses.push({ term: { status } });
        }

        if (userId) {
          filterClauses.push({ term: { userId } });
        }

        if (query && query.trim().length > 0) {
          mustClauses.push({
            multi_match: {
              query: query.trim(),
              fields: ['recipientEmail^3', 'subject^2', 'body', 'senderEmail'],
              fuzziness: 'AUTO',
            },
          });
        } else {
          mustClauses.push({ match_all: {} });
        }

        const response = await esClient.search({
          index: config.elasticsearchIndex,
          from: offset,
          size: limit,
          query: {
            bool: {
              must: mustClauses,
              filter: filterClauses,
            },
          },
          sort: [
            { scheduledAt: { order: 'desc' } },
          ],
        });

        const totalHits = typeof response.hits.total === 'number' 
          ? response.hits.total 
          : response.hits.total?.value || 0;

        const emails = response.hits.hits.map((hit) => hit._source);

        return {
          total: totalHits,
          emails,
          source: 'elasticsearch',
        };
      } catch (err: any) {
        console.warn('[SearchService] ES search error, falling back to database query:', err.message);
      }
    }

    // Database Fallback
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (userId) {
      whereClause.userId = userId;
    }
    if (query && query.trim().length > 0) {
      const q = query.trim();
      whereClause.OR = [
        { recipientEmail: { contains: q } },
        { subject: { contains: q } },
        { body: { contains: q } },
        { senderEmail: { contains: q } },
      ];
    }

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where: whereClause }),
      prisma.emailJob.findMany({
        where: whereClause,
        orderBy: { scheduledAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);

    return {
      total,
      emails,
      source: 'database',
    };
  }
}

export const searchService = new SearchService();
