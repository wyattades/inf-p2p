import * as fs from 'fs/promises';
import type { NextApiRequest, NextApiResponse } from 'next';
import { match as matchRoute, MatchFunction } from 'path-to-regexp';
// import { Redis } from '@upstash/redis';

// const redis = new Redis({
//   url: process.env.UPSTASH_URL!,
//   token: process.env.UPSTASH_TOKEN!,
// });

// const syncState = new (class {
//   cacheAt = 0;
//   cached: string | null = null;

//   async get() {
//     if (Date.now() - this.cacheAt < 600) {
//       return this.cached;
//     } else {
//       this.cached = null;
//       this.cacheAt = 0;
//     }

//     this.cacheAt = Date.now();
//     return (this.cached = await redis.get('wordle-state'));
//   }

//   async set(val: string) {
//     this.cacheAt = 0;
//     this.cached = null;
//     await redis.set('wordle-state', val, {
//       ex: 60 * 10, // expire in 10 minutes
//     });
//   }
// })();

type Ctx<ReqBody = unknown> = {
  req: NextApiRequest;
  res: NextApiResponse;
  params: Record<string, string>;
  body: ReqBody;
};

// const isDev = process.env.NODE_ENV === 'development';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

class RouteBuilder {
  routes: {
    methods: HttpMethod[] | null;
    pattern: string;
    handler: (ctx: Ctx<any>) => Promise<void> | void;
    match: MatchFunction<Record<string, string>>;
  }[] = [];

  constructor(readonly basePath = '') {}

  add<ReqBody = unknown>(
    method: HttpMethod | HttpMethod[] | '*',
    pattern: string,
    handler: (ctx: Ctx<ReqBody>) => void,
  ) {
    this.routes.push({
      methods:
        method === '*' ? null : Array.isArray(method) ? method : [method],
      pattern,
      handler,
      match: matchRoute<Record<string, string>>(this.basePath + pattern),
    });
    return this;
  }

  handler = async (req: NextApiRequest, res: NextApiResponse) => {
    const url = req.url!;
    const method = req.method!.toUpperCase() as HttpMethod;

    for (const h of this.routes) {
      if (h.methods && !h.methods.includes(method)) continue;
      const m = h.match(url);
      if (!m) continue;

      // const data = await syncState.get();

      const ctx: Ctx = {
        req,
        res,
        params: m.params,
        body: req.body,
        // query: req.query,
      };

      await h.handler(ctx);

      return;
    }

    res.status(404).end('Not Found');
  };
}

// a file system backed queue
const queue = new (class Queue<T = any> {
  private data: T[] = [];

  constructor(readonly filePath = 'tmp/queue.json') {}

  async push(next: T) {
    await this.syncFromFile();
    this.data.push(next);
    await this.syncToFile();
  }

  async pop() {
    await this.syncFromFile();
    const next = this.data.shift();
    await this.syncToFile();
    return next;
  }

  private async syncFromFile() {
    this.data = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
  }
  private async syncToFile() {
    await fs.writeFile(this.filePath, JSON.stringify(this.data));
  }
})();

export default new RouteBuilder('/api/p2p').add<{
  client_id: string;
  sdp: string;
}>('POST', '/connect', async (ctx) => {
  const { client_id, sdp } = ctx.body;

  const other = await queue.pop();
  await queue.push({ client_id, sdp, timestamp: Date.now() });

  if (other) {
    ctx.res.json({
      client_id: other.client_id,
      sdp: other.sdp,
    });
  } else {
    ctx.res.json({
      nothing: true,
    });
  }
}).handler;
