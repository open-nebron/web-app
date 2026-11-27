interface AuthErrorShape {
  status?: number;
  message?: string;
  data?: {
    error?: {
      code?: string;
      message?: string;
    };
  };
}

/**
 * Maps an auth API error into a clear form-level error message for login/register UIs.
 */
export function getAuthFormErrorMessage(err: unknown, mode: 'login' | 'register'): string {
  const error = (err ?? {}) as AuthErrorShape;
  const code = error.data?.error?.code;
  const serverMessage = error.data?.error?.message;

  if (error.status === 0) {
    return 'Cannot reach the server. Please check your connection and try again.';
  }

  if (error.status === 429 || code === 'RATE_LIMIT_EXCEEDED') {
    return 'Too many attempts. Please wait a minute and try again.';
  }

  if (mode === 'login' && error.status === 401) {
    if (code === 'UNAUTHORIZED' && serverMessage) {
      return serverMessage;
    }
    return 'Invalid email or password. Check both your registered email address and password.';
  }

  if (mode === 'register' && error.status === 409) {
    return 'An account with this email already exists.';
  }

  if (serverMessage) {
    return serverMessage;
  }

  if (error.message) {
    return error.message;
  }

  return mode === 'login'
    ? 'Unable to sign in right now. Please try again.'
    : 'Unable to create your account right now. Please try again.';
}
