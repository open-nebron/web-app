const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmali.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.co': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'icoud.com': 'icloud.com',
  'icloud.con': 'icloud.com',
  'protonmal.com': 'protonmail.com',
  'protonmail.con': 'protonmail.com',
};

/**
 * Returns a suggested corrected email address if the domain matches a common typo,
 * otherwise null. Preserves the user's trimmed local-part casing/value.
 */
export function suggestEmailCorrection(rawEmail: string): string | null {
  const trimmed = rawEmail.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) {
    return null;
  }

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1).toLowerCase();
  if (!localPart || !domainPart) {
    return null;
  }

  const correctedDomain = COMMON_EMAIL_DOMAIN_TYPOS[domainPart];
  if (!correctedDomain) {
    return null;
  }

  return `${localPart}@${correctedDomain}`;
}
