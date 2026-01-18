import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

export interface DigestEmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendDigestEmail(data: DigestEmailData): Promise<string | null> {
  try {
    const result = await resend.emails.send({
      from: 'Radar <digest@go.funnelists.com>',
      to: data.to,
      subject: data.subject,
      html: data.html,
    });

    return result.data?.id || null;
  } catch (error) {
    console.error('Failed to send email:', error);
    return null;
  }
}
