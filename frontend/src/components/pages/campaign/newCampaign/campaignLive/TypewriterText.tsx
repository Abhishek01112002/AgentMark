import { useEffect, useState } from 'react';

const TYPEWRITER_STRINGS = [
  'Drafting introduction paragraph based on Hook 2...',
  'Optimizing sentence length for readability...',
  'Injecting brand voice variables...',
  'Cross-referencing compliance guidelines...',
  'Generating Twitter variant sequence...',
  'Building LinkedIn thought-leadership post...',
];

interface TypewriterTextProps {
  activeAgent: { name: string } | null;
}

export function TypewriterText({ activeAgent }: TypewriterTextProps) {
  const [text, setText] = useState('');
  const [stringIndex, setStringIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!activeAgent) {
      if (text !== '') setText('');
      return;
    }
    const currentString = TYPEWRITER_STRINGS[stringIndex];
    let timeout: number;

    if (isDeleting) {
      if (text.length > 0) {
        timeout = window.setTimeout(() => {
          setText(currentString.substring(0, text.length - 1));
        }, 50);
      } else {
        setIsDeleting(false);
        setStringIndex((prev) => (prev + 1) % TYPEWRITER_STRINGS.length);
      }
    } else {
      if (text.length < currentString.length) {
        timeout = window.setTimeout(() => {
          setText(currentString.substring(0, text.length + 1));
        }, 100);
      } else {
        timeout = window.setTimeout(() => setIsDeleting(true), 3000);
      }
    }

    return () => clearTimeout(timeout);
  }, [text, isDeleting, stringIndex, activeAgent]);

  return <span style={{ color: '#F1F1F3' }}>{text}</span>;
}
