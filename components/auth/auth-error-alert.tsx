'use client';

interface AuthErrorAlertProps {
  message?: string;
}

/**
 * Form-level alert banner for authentication errors (invalid credentials,
 * rate limiting, network failures) so non-field issues are never hidden or
 * misattributed to a single field.
 */
export function AuthErrorAlert({ message }: AuthErrorAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
    >
      {message}
    </div>
  );
}
