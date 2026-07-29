/**
 * The connection to the analytics agent.
 *
 * The backend (backend/app/api/assistant.py) speaks AG-UI — an event stream of
 * text deltas, tool calls and tool results — so the browser talks to Python
 * directly. There is no Node tier in this deployment and none is needed.
 *
 * `HttpAgent` is the AG-UI reference client. It is the same transport the
 * off-the-shelf chat kits use underneath; we drive it ourselves so the chat
 * surface is built from this product's own components (Card, StatCard, the
 * existing charts) rather than a foreign design system bolted onto the side.
 *
 * The agent is constructed per conversation, not once at module load: it
 * carries the thread's message history, and a session's token must be read at
 * the moment of use rather than captured at import.
 */

import { HttpAgent } from '@ag-ui/client';

/** Matches api.ts — one definition of where the API lives would be better, but
 * that module exports an axios instance, not the base URL. */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

/**
 * A new agent bound to one conversation thread.
 *
 * `threadId` becomes the conversation's id server-side, so passing a stable
 * value keeps a reopened thread appending to the same transcript rather than
 * starting a new one.
 *
 * The bearer token is read here rather than in a shared interceptor: api.ts's
 * axios interceptor covers axios only, and this request does not go through
 * axios. Missing that is what silently turns every answer into a 401.
 */
export function createAnalyticsAgent(threadId: string): HttpAgent {
  const token = localStorage.getItem('token');
  return new HttpAgent({
    url: `${API_BASE_URL}/assistant`,
    threadId,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
