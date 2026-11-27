'use client';

import { suggestEmailCorrection } from '@/lib/email-typo';

interface EmailTypoHintProps {
  email: string;
  onAccept: (correctedEmail: string) => void;
}

/**
 * Displays a one-click correction prompt when the user types a common
 * email domain typo such as @gamil.com.
 */
export function EmailTypoHint({ email, onAccept }: EmailTypoHintProps) {
  const suggestion = suggestEmailCorrection(email);
  if (!suggestion) {
    return null;
  }

  return (
    <p className="text-xs text-muted-foreground" role="status">
      Did you mean{' '}
      <button
        type="button"
        onClick={() => onAccept(suggestion)}
        className="font-medium text-primary hover:underline underline-offset-2"
      >
        {suggestion}
      </button>
      ?
    </p>
  );
}
