'use client';

import { useState, useEffect, useRef } from 'react';

export function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length && timer.current) clearInterval(timer.current);
    }, 10);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [text]);

  return (
    <span className="whitespace-pre-wrap break-words">
      {displayed}
      {displayed.length < text.length && (
        <span
          className="ml-0.5 animate-[blink_0.9s_step-end_infinite]"
          style={{ borderRight: '2px solid #2a7a50' }}
        >
          &nbsp;
        </span>
      )}
    </span>
  );
}
