import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface RawEmail {
  id: number;
  from: string;
  subject: string;
  html: string | null;
  text: string | null;
  date: Date | null;
}

/**
 * Se connecte à la boîte Gmail en IMAP, ouvre le libellé configuré et
 * renvoie les FETCH_LIMIT messages les plus récents, déjà parsés.
 *
 * La boîte est ouverte en lecture seule (EXAMINE) : le serveur IMAP ne peut
 * donc pas marquer les messages comme lus, ce qui permet de relancer le
 * script à volonté pendant la phase de test.
 */
export async function fetchRecentEmails(): Promise<RawEmail[]> {
  const { IMAP_HOST, IMAP_PORT, IMAP_USER, IMAP_PASSWORD, IMAP_MAILBOX, FETCH_LIMIT } =
    process.env;

  if (!IMAP_HOST || !IMAP_USER || !IMAP_PASSWORD || !IMAP_MAILBOX) {
    throw new Error(
      "Variables IMAP manquantes : vérifie IMAP_HOST, IMAP_USER, IMAP_PASSWORD et IMAP_MAILBOX dans .env",
    );
  }

  const limit = Number(FETCH_LIMIT ?? 10);

  const client = new ImapFlow({
    host: IMAP_HOST,
    port: Number(IMAP_PORT ?? 993),
    secure: true,
    auth: {
      user: IMAP_USER,
      pass: IMAP_PASSWORD,
    },
    logger: false,
  });

  const emails: RawEmail[] = [];

  await client.connect();
  try {
    const mailbox = await client.mailboxOpen(IMAP_MAILBOX, { readOnly: true });

    const total = mailbox.exists;
    if (total === 0) {
      return emails;
    }

    const start = Math.max(1, total - limit + 1);
    const range = `${start}:${total}`;

    for await (const message of client.fetch(range, { envelope: true, source: true })) {
      if (!message.source) continue;

      const parsed = await simpleParser(message.source);

      emails.push({
        id: message.uid,
        from: parsed.from?.text ?? "",
        subject: parsed.subject ?? "",
        html: typeof parsed.html === "string" ? parsed.html : null,
        text: parsed.text ?? null,
        date: parsed.date ?? null,
      });
    }
  } finally {
    await client.logout();
  }

  return emails;
}
