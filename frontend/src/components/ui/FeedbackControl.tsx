import React, { useState } from 'react';
import Button from './Button';

/**
 * The verdict deliberately still says *fraud*, while everything the system
 * produces says *anomaly*. That split is the point: software can only find
 * the unusual, and this is the one moment a person decides whether unusual
 * meant fraudulent. Naming it anything softer would lose the distinction
 * the whole design rests on.
 */
export type FeedbackVerdict = 'confirmed_fraud' | 'not_fraud' | 'need_more_info';

interface FeedbackControlProps {
  onSubmit: (verdict: FeedbackVerdict, note: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

const ACK: Record<FeedbackVerdict, string> = {
  confirmed_fraud: 'Recorded as confirmed fraud.',
  not_fraud: 'Recorded as a false positive.',
  need_more_info: 'Flagged for further investigation.',
};

/**
 * Analyst verdict on an alert.
 *
 * This is the product's only source of ground truth. The scorer is
 * unsupervised (see backend/ml/README.md) — it learns what is *unusual*,
 * never what is *fraudulent*. Only a human closing the loop here can say
 * which. Those verdicts accumulate into the labelled dataset that a
 * supervised model would need, so this control is the bridge between the
 * system as it ships and the system it can become.
 *
 * Kore (ch 5) on feedback: acknowledge on the spot, and say what the input
 * is for. Both are done below — the second is not decoration, it is the
 * honest reason an analyst should bother.
 */
const FeedbackControl: React.FC<FeedbackControlProps> = ({
  onSubmit,
  disabled = false,
  className = '',
}) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ack, setAck] = useState<string | null>(null);

  const submit = async (verdict: FeedbackVerdict) => {
    setSubmitting(true);
    try {
      await onSubmit(verdict, note);
      setAck(ACK[verdict]);
      setNote('');
    } finally {
      setSubmitting(false);
    }
  };

  if (ack) {
    return (
      <div className={`bg-mist rounded-cards p-20 ${className}`}>
        <p className="text-body font-sohne text-ink">{ack}</p>
        <p className="text-caption font-sohne text-slate mt-4">
          Thank you. Verdicts like this are what make a trained model possible later.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-mist rounded-cards p-20 ${className}`}>
      <h3 className="text-body font-sohne font-450 text-ink">Was this alert correct?</h3>
      <p className="text-caption font-sohne text-slate mt-4">
        Your verdict is recorded against this alert and becomes training data for future
        scoring. It does not change the current score.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for the audit trail"
        rows={2}
        disabled={disabled || submitting}
        className="w-full mt-12 border border-smoke/40 rounded-inputs px-12 py-8 text-caption font-sohne bg-paper text-ink placeholder:text-smoke"
      />
      <div className="flex flex-wrap gap-8 mt-12">
        <Button variant="filled" disabled={disabled || submitting} onClick={() => submit('confirmed_fraud')}>
          Confirm fraud
        </Button>
        <Button variant="ghost" disabled={disabled || submitting} onClick={() => submit('not_fraud')}>
          Not fraud
        </Button>
        <Button variant="ghost" disabled={disabled || submitting} onClick={() => submit('need_more_info')}>
          Need more info
        </Button>
      </div>
    </div>
  );
};

export default FeedbackControl;
