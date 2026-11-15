import { useEffect, useRef } from 'react';
import type { Branch, Question } from '../content/posts';
import { session } from '../store/session';
import { attention } from '../store/interactions';
import './QuestionCard.css';

interface Props {
  question: Question;
  /** The branch the user picked, once they have answered. */
  chosen?: Branch;
  onAnswer: (branch: Branch) => void;
}

/** An inline question that sits in the post column. Answering is final. */
export default function QuestionCard({ question, chosen, onAnswer }: Props) {
  const ref = useRef<HTMLElement>(null);
  const answered = chosen !== undefined;
  const titleId = `qc-title-${question.id}`;

  // Note when the question first scrolls into view (for the final reveal), and tell the posts
  // while it is on screen so they stop counting time-on-screen.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.intersectionRatio >= 0.5;
        attention.setQuestionInView(question.id, visible);
        if (visible) session.recordQuestionShown(question.id);
      },
      { threshold: [0, 0.5] }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      attention.setQuestionInView(question.id, false);
    };
  }, [question.id]);

  return (
    <section
      className={`qc${answered ? ' answered' : ''}`}
      id={`question-${question.id}`}
      ref={ref}
      aria-labelledby={titleId}
    >
      <div className="qc-rule" aria-hidden="true" />
      <h2 className="qc-prompt" id={titleId}>
        {question.prompt}
      </h2>
      <div className="qc-options" role="group" aria-labelledby={titleId}>
        {question.answers.map((a) => {
          const isChosen = chosen === a.branch;
          return (
            <button
              key={a.branch}
              type="button"
              className={`qc-option${isChosen ? ' chosen' : ''}`}
              aria-pressed={isChosen}
              disabled={answered && !isChosen}
              onClick={() => !answered && onAnswer(a.branch)}
            >
              <span className="qc-letter" aria-hidden="true">
                {isChosen ? '✓' : a.branch.toUpperCase()}
              </span>
              <span className="qc-label">{a.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
