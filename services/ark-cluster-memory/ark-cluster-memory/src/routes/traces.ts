import { Router } from 'express';
import { TraceStore, OTELSpan } from '../trace-store.js';
import { writeSSEEvent, startSSEHeartbeat } from '../sse.js';

export function createTracesRouter(traces: TraceStore): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const watch = req.query['watch'] === 'true';

    if (watch) {
      console.log('[TRACES] GET /traces?watch=true - starting SSE stream for all spans');

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const heartbeat = startSSEHeartbeat(res);

      let spanCount = 0;
      let lastLogTime = Date.now();

      const unsubscribe = traces.subscribeToAllSpans((span: OTELSpan) => {
        if (!writeSSEEvent(res, span)) {
          console.log('[TRACES-OUT] Client disconnected (write failed)');
          clearInterval(heartbeat);
          unsubscribe();
          return;
        }

        spanCount++;
        const now = Date.now();
        if (now - lastLogTime >= 1000) {
          console.log(`[TRACES-OUT] Streamed ${spanCount} spans`);
          lastLogTime = now;
        }
      });

      req.on('close', () => {
        console.log(`[TRACES-OUT] Client disconnected after ${spanCount} spans`);
        clearInterval(heartbeat);
        unsubscribe();
      });

      req.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ECONNRESET') {
          console.log('[TRACES-OUT] Client connection reset');
        } else {
          console.error('[TRACES-OUT] Client connection error:', error);
        }
        clearInterval(heartbeat);
        unsubscribe();
      });
    } else {
      try {
        const allTraces = traces.getAllTraces();
        res.json({
          total_traces: Object.keys(allTraces).length,
          total_spans: traces.getAllSpans().length,
          trace_ids: traces.getTraceIds()
        });
      } catch (error) {
        console.error('[TRACES] Failed to get traces:', error);
        const err = error as Error;
        res.status(500).json({ error: err.message });
      }
    }
  });

  router.get('/:trace_id', (req, res) => {
    const { trace_id } = req.params;
    const watch = req.query['watch'] === 'true';
    const fromBeginning = req.query['from-beginning'] === 'true';

    if (watch) {
      console.log(`[TRACES] GET /traces/${trace_id}?watch=true - starting SSE stream`);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const heartbeat = startSSEHeartbeat(res);

      let spanCount = 0;

      if (fromBeginning) {
        const existingSpans = traces.getSpans(trace_id);
        console.log(`[TRACES] Sending ${existingSpans.length} existing spans for trace ${trace_id}`);
        for (const span of existingSpans) {
          if (!writeSSEEvent(res, span)) {
            console.log(`[TRACES-OUT] Error writing existing span for trace ${trace_id}`);
            clearInterval(heartbeat);
            return;
          }
          spanCount++;
        }
      }

      const unsubscribe = traces.subscribeToTrace(trace_id, (span: OTELSpan) => {
        if (!writeSSEEvent(res, span)) {
          console.log(`[TRACES-OUT] Trace ${trace_id}: Client disconnected (write failed)`);
          clearInterval(heartbeat);
          unsubscribe();
          return;
        }
        spanCount++;
      });

      req.on('close', () => {
        console.log(`[TRACES-OUT] Trace ${trace_id}: Client disconnected after ${spanCount} spans`);
        clearInterval(heartbeat);
        unsubscribe();
      });

      req.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ECONNRESET') {
          console.log(`[TRACES-OUT] Trace ${trace_id}: Client connection reset`);
        } else {
          console.error(`[TRACES-OUT] Trace ${trace_id}: Client connection error:`, error);
        }
        clearInterval(heartbeat);
        unsubscribe();
      });
    } else {
      try {
        const spans = traces.getSpans(trace_id);
        if (spans.length === 0 && !traces.hasTrace(trace_id)) {
          res.status(404).json({ error: 'Trace not found' });
          return;
        }
        res.json({
          trace_id,
          span_count: spans.length,
          spans
        });
      } catch (error) {
        console.error(`[TRACES] Failed to get trace ${trace_id}:`, error);
        const err = error as Error;
        res.status(500).json({ error: err.message });
      }
    }
  });

  router.delete('/', (req, res) => {
    try {
      traces.purge();
      res.json({ status: 'success', message: 'Trace data purged' });
    } catch (error) {
      console.error('Trace purge failed:', error);
      res.status(500).json({ error: 'Failed to purge trace data' });
    }
  });

  return router;
}
