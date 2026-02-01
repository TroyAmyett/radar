import { Resend } from 'resend';
import { render } from '@react-email/components';
import { WelcomeEmail } from './templates/WelcomeEmail';

export const resend = new Resend(process.env.RESEND_API_KEY);

export interface DigestEmailData {
  to: string;
  subject: string;
  html: string;
}

export interface WelcomeEmailData {
  to: string;
  userName?: string;
  loginUrl?: string;
  videoUrl?: string;
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

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<string | null> {
  try {
    const loginUrl = data.loginUrl || 'https://radar.funnelists.com/login';

    const html = await render(WelcomeEmail({
      userName: data.userName,
      loginUrl,
      videoUrl: data.videoUrl,
    }));

    const result = await resend.emails.send({
      from: 'Radar <welcome@go.funnelists.com>',
      to: data.to,
      subject: `Welcome to Radar${data.userName ? `, ${data.userName}` : ''}!`,
      html,
    });

    return result.data?.id || null;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return null;
  }
}
