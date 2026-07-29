/**
 * Conversation state for the analytics assistant.
 *
 * Turns the AG-UI event stream into something React can render: an ordered
 * list of turns, each carrying the assistant's text and the tool calls that
 * produced its figures.
 *
 * The event contract (backend/app/api/assistant.py, via Pydantic AI's AG-UI
 * adapter) is:
 *
 *   RUN_STARTED
 *   TOOL_CALL_START / TOOL_CALL_ARGS / TOOL_CALL_END   (zero or more)
 *   TOOL_CALL_RESULT                                   (one per call)
 *   TEXT_MESSAGE_START / TEXT_MESSAGE_CONTENT / TEXT_MESSAGE_END
 *   RUN_FINISHED
 *
 * Tool calls are kept on the turn rather than thrown away once the sentence
 * arrives. They are the provenance — which query produced which number — and
 * they are what `ToolResult` draws the charts from.
 */

import { useCallback, useRef, useState } from 'react';
import { HttpAgent } from '@ag-ui/client';
import { createAnalyticsAgent } from '../../lib/analyticsAgent';
import { ASSISTANT_ERRORS } from '../../lib/copy/assistant';
import { logger } from '../../lib/logger';

export interface ToolCall {
  id: string;
  name: string;
  /** JSON string from TOOL_CALL_RESULT; undefined while the query is running. */
  result?: string;
}

export interface Turn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  toolCalls: ToolCall[];
}

/** A stable id for a fresh thread. `crypto.randomUUID` is available in every
 * browser this product supports; the fallback keeps a non-secure-context dev
 * server (plain http on a LAN address) from breaking the page. */
function newThreadId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useAnalyticsChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>(newThreadId);

  // One agent per thread, kept across sends so it carries message history —
  // without this, every question would arrive with no memory of the last one
  // and follow-ups like "and which region?" could not work.
  const agentRef = useRef<HttpAgent | null>(null);
  const getAgent = useCallback(() => {
    if (!agentRef.current) agentRef.current = createAnalyticsAgent(threadId);
    return agentRef.current;
  }, [threadId]);

  const reset = useCallback(() => {
    agentRef.current = null;
    setThreadId(newThreadId());
    setTurns([]);
    setError(null);
  }, []);

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || running) return;

      setError(null);
      setRunning(true);

      const userTurn: Turn = { id: newThreadId(), role: 'user', text, toolCalls: [] };
      const assistantId = newThreadId();
      setTurns((prev) => [
        ...prev,
        userTurn,
        { id: assistantId, role: 'assistant', text: '', toolCalls: [] },
      ]);

      /** Applies an update to the in-flight assistant turn only. */
      const patch = (fn: (turn: Turn) => Turn) =>
        setTurns((prev) => prev.map((t) => (t.id === assistantId ? fn(t) : t)));

      const agent = getAgent();
      agent.messages = [
        ...agent.messages,
        { id: userTurn.id, role: 'user', content: text },
      ];

      try {
        await agent.runAgent(
          {},
          {
            onToolCallStartEvent: ({ event }) => {
              patch((t) => ({
                ...t,
                toolCalls: [
                  ...t.toolCalls,
                  { id: event.toolCallId, name: event.toolCallName },
                ],
              }));
            },
            onToolCallResultEvent: ({ event }) => {
              patch((t) => ({
                ...t,
                toolCalls: t.toolCalls.map((c) =>
                  c.id === event.toolCallId ? { ...c, result: event.content } : c,
                ),
              }));
            },
            // The buffer is authoritative: assigning it beats appending deltas
            // ourselves, which drifts if an event is ever replayed.
            onTextMessageContentEvent: ({ textMessageBuffer }) => {
              patch((t) => ({ ...t, text: textMessageBuffer }));
            },
          },
        );
      } catch (err: any) {
        logger.error('Analytics assistant run failed', err);
        const status = err?.status ?? err?.response?.status;
        setError(
          status === 401 || status === 403
            ? ASSISTANT_ERRORS.unauthorized
            : status === 503
              ? ASSISTANT_ERRORS.unavailable
              : ASSISTANT_ERRORS.generic,
        );
        // Drop the empty assistant turn — a blank bubble above an error
        // message reads as though the assistant answered with silence.
        setTurns((prev) =>
          prev.filter((t) => !(t.id === assistantId && !t.text && t.toolCalls.length === 0)),
        );
      } finally {
        setRunning(false);
      }
    },
    [getAgent, running],
  );

  return { turns, running, error, send, reset, threadId };
}
