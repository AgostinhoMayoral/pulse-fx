import { timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../domain/errors.js';
import type {
  ListFavoritesUseCase,
  ListIndicatorsUseCase,
  GetIndicatorDetailUseCase,
  ToggleFavoriteUseCase,
} from '../../application/use-cases/indicator.use-cases.js';
import type { SyncIndicatorsUseCase } from '../../application/use-cases/sync-indicators.use-case.js';
import type { Database } from '../persistence/db.js';

interface RouteDeps {
  listIndicators: ListIndicatorsUseCase;
  getIndicatorDetail: GetIndicatorDetailUseCase;
  listFavorites: ListFavoritesUseCase;
  toggleFavorite: ToggleFavoriteUseCase;
  syncIndicators: SyncIndicatorsUseCase;
  adminToken: string;
  db: Database;
}

const favoriteBodySchema = z.object({
  indicatorId: z.string().uuid(),
});

function getClientId(headerValue: string | string[] | undefined): string | undefined {
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }
  return headerValue;
}

function isAuthorized(provided: string | undefined, expected: string): boolean {
  if (!provided) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

function extractBearerToken(authorization?: string): string | undefined {
  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }
  return authorization.slice('Bearer '.length);
}

export async function registerRoutes(app: FastifyInstance, deps: RouteDeps): Promise<void> {
  app.get('/health', async () => {
    try {
      await deps.db.execute(sql`SELECT 1`);
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  });

  app.get('/indicators', async (request) => {
    const clientId = getClientId(request.headers['x-client-id']);
    return deps.listIndicators.execute(clientId);
  });

  app.get('/indicators/:code', async (request) => {
    const params = z.object({ code: z.string().min(1) }).parse(request.params);
    const clientId = getClientId(request.headers['x-client-id']);
    return deps.getIndicatorDetail.execute(params.code, clientId);
  });

  app.get('/favorites', async (request) => {
    const clientId = getClientId(request.headers['x-client-id']);
    if (!clientId) {
      throw new ValidationError('X-Client-Id header is required');
    }
    return deps.listFavorites.execute(clientId);
  });

  app.post('/favorites', async (request) => {
    const clientId = getClientId(request.headers['x-client-id']);
    if (!clientId) {
      throw new ValidationError('X-Client-Id header is required');
    }
    const body = favoriteBodySchema.parse(request.body);
    await deps.toggleFavorite.add(clientId, body.indicatorId);
    return { success: true };
  });

  app.delete('/favorites/:indicatorId', async (request) => {
    const clientId = getClientId(request.headers['x-client-id']);
    if (!clientId) {
      throw new ValidationError('X-Client-Id header is required');
    }
    const params = z.object({ indicatorId: z.string().uuid() }).parse(request.params);
    await deps.toggleFavorite.remove(clientId, params.indicatorId);
    return { success: true };
  });

  app.post('/admin/sync', async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!isAuthorized(token, deps.adminToken)) {
      throw new UnauthorizedError('Invalid admin token');
    }

    const result = await deps.syncIndicators.execute();
    return reply.code(result.status === 'failed' ? 502 : 200).send(result);
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof DomainError) {
      const statusCode =
        error instanceof NotFoundError ? 404 : error instanceof UnauthorizedError ? 401 : 400;
      return reply.code(statusCode).send({
        error: error.code,
        message: error.message,
      });
    }

    if (error instanceof z.ZodError) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: error.errors.map((item) => item.message).join(', '),
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
    });
  });
}
