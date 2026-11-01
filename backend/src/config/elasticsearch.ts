import { Client } from '@elastic/elasticsearch';
import { config } from './env';

export let isElasticsearchAvailable = false;

export const esClient = new Client({
  node: config.elasticsearchNode,
  requestTimeout: 3000,
  maxRetries: 1,
});

export async function initElasticsearch(): Promise<void> {
  try {
    const health = await esClient.cluster.health();
    isElasticsearchAvailable = true;
    console.log(`[Elasticsearch] Connected. Cluster status: ${health.status}`);

    // Create index if it doesn't exist
    const exists = await esClient.indices.exists({ index: config.elasticsearchIndex });
    if (!exists) {
      await esClient.indices.create({
        index: config.elasticsearchIndex,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipientEmail: { type: 'keyword' },
              subject: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              batchId: { type: 'keyword' },
              etherealPreviewUrl: { type: 'keyword' },
            },
          },
        },
      });
      console.log(`[Elasticsearch] Created index '${config.elasticsearchIndex}'`);
    }
  } catch (error: any) {
    isElasticsearchAvailable = false;
    console.warn(`[Elasticsearch] Not reachable at ${config.elasticsearchNode} (${error.message}). Search service will seamlessly fall back to DB indexing.`);
  }
}
