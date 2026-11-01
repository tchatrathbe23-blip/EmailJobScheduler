import { parse } from 'csv-parse/sync';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

export function parseEmailsFromFile(fileContent: string): { emails: string[]; count: number; duplicatesRemoved: number } {
  const detectedEmails = new Set<string>();
  let totalDetected = 0;

  // 1. Try CSV Parsing first
  try {
    const records: string[][] = parse(fileContent, {
      skip_empty_lines: true,
      relax_column_count: true,
    });

    for (const row of records) {
      for (const cell of row) {
        const potentialEmail = cell.trim().toLowerCase();
        if (EMAIL_REGEX.test(potentialEmail)) {
          totalDetected++;
          detectedEmails.add(potentialEmail);
        }
      }
    }
  } catch {
    // If not valid CSV, fallback to line-by-line / regex scanner
  }

  // 2. Scan entire raw string with regex for any emails missed
  const matches = fileContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  for (const match of matches) {
    totalDetected++;
    detectedEmails.add(match.trim().toLowerCase());
  }

  const emails = Array.from(detectedEmails);
  const duplicatesRemoved = Math.max(0, totalDetected - emails.length);

  return {
    emails,
    count: emails.length,
    duplicatesRemoved,
  };
}
