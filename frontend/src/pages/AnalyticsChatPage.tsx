import React, { useEffect, useRef, useState } from 'react';
import { ArrowPathIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import ToolResult from '../components/Assistant/ToolResult';
import { useAnalyticsChat } from '../components/Assistant/useAnalyticsChat';
import Card from '../components/ui/Card';
import Tag from '../components/ui/Tag';
import { ASSISTANT, ASSISTANT_EXAMPLES, TOOL_LABEL } from '../lib/copy/assistant';
import assistantAvatar from '../assets/brand/buffr-icon.png';

/**
 * The analytics assistant.
 *
 * Its own page rather than a box on the dashboard, because the thing being
 * built is a conversation with artifacts in it — charts, tables, returns —
 * and that needs room and a scroll of its own. The single-turn composer this
 * replaces could only ever return a paragraph.
 *
 * Answers render the queries that produced them. That is not decoration: an
 * oversight officer acting on a figure has to be able to see it came from a
 * query against real data rather than from the model's memory.
 */

const ToolCallBlock: React.FC<{ name: string; result?: string }> = ({ name, result }) => (
  <div className="mt-16">
    <Tag className="mb-8 block">{TOOL_LABEL[name] ?? name}</Tag>
    {result === undefined ? (
      <Card className="p-16">
        <p className="text-caption font-sohne text-ash">{ASSISTANT.thinking}</p>
      </Card>
    ) : (
      <ToolResult toolName={name} content={result} />
    )}
  </div>
);

const AnalyticsChatPage: React.FC = () => {
  const { turns, running, error, send, reset } = useAnalyticsChat();
  const [question, setQuestion] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the stream. Without this the answer grows below the fold and the
  // reader has to chase it.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  const submit = (text?: string) => {
    const q = (text ?? question).trim();
    if (!q || running) return;
    send(q);
    setQuestion('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-16 mb-24">
        <div className="max-w-prose">
          <h1 className="text-heading font-signifier text-ink mb-8">{ASSISTANT.title}</h1>
          <p className="text-body font-sohne text-slate mt-8">{ASSISTANT.intro}</p>
        </div>
        {turns.length > 0 && (
          <button
            onClick={reset}
            className="shrink-0 inline-flex items-center gap-8 text-caption font-sohne text-slate hover:text-ink"
          >
            <ArrowPathIcon className="w-16 h-16" />
            {ASSISTANT.newThread}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-8 px-8">
        {turns.length === 0 && (
          <div className="max-w-prose">
            <p className="text-body font-sohne text-ink mb-16">{ASSISTANT.emptyHeading}</p>
            <div className="flex flex-wrap gap-8">
              {ASSISTANT_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => submit(ex)}
                  className="text-caption font-sohne text-slate bg-mist hover:bg-smoke/20 rounded-buttons px-12 py-8 text-left"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-32">
          {turns.map((turn) =>
            turn.role === 'user' ? (
              <div key={turn.id} className="flex justify-end">
                <p className="text-body font-sohne text-ink bg-mist rounded-cards px-20 py-12 max-w-prose">
                  {turn.text}
                </p>
              </div>
            ) : (
              /* The assistant's turns carry the mark; the reader's do not.
                 A question and an answer look alike once both are plain
                 paragraphs, and which of the two is machine-generated is not
                 a detail an oversight officer should have to infer. */
              <div key={turn.id} className="flex gap-16 max-w-3xl">
                <img
                  src={assistantAvatar}
                  alt=""
                  aria-hidden="true"
                  width={32}
                  height={32}
                  className="w-32 h-32 rounded-inputs shrink-0 mt-2"
                />
                <div className="min-w-0 flex-1">
                  {turn.toolCalls.map((call) => (
                    <ToolCallBlock key={call.id} name={call.name} result={call.result} />
                  ))}
                  {turn.text && (
                    <p className="text-body font-sohne text-ink whitespace-pre-line mt-16 first:mt-0">
                      {turn.text}
                    </p>
                  )}
                  {turn.toolCalls.length > 0 && turn.text && (
                    <p className="text-caption font-sohne text-ash mt-12">
                      Answered using:{' '}
                      {Array.from(
                        new Set(turn.toolCalls.map((c) => TOOL_LABEL[c.name] ?? c.name)),
                      ).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            ),
          )}
          {running && turns[turns.length - 1]?.toolCalls.length === 0 && !turns[turns.length - 1]?.text && (
            <p className="text-caption font-sohne text-ash">{ASSISTANT.thinking}</p>
          )}
        </div>

        {error && <p className="text-caption font-sohne text-status-danger mt-16">{error}</p>}
        <div ref={endRef} />
      </div>

      <div className="pt-20 mt-20 border-t border-mist">
        <div className="bg-paper border border-mist rounded-inputs p-16">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={ASSISTANT.placeholder}
            aria-label={ASSISTANT.placeholder}
            disabled={running}
            className="w-full text-body font-sohne text-ink placeholder:text-smoke outline-none bg-transparent disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-16">
            <p className="text-caption font-sohne text-ash">{ASSISTANT.provenance}</p>
            <button
              onClick={() => submit()}
              disabled={running || !question.trim()}
              aria-label={ASSISTANT.send}
              className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-brand-gradient-aa text-paper disabled:opacity-40"
            >
              <PaperAirplaneIcon className="w-16 h-16" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChatPage;
