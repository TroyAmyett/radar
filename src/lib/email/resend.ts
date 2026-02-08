import { Resend } from 'resend';
import { render } from '@react-email/components';
import { WelcomeEmail } from './templates/WelcomeEmail';
import { InviteEmail } from './templates/InviteEmail';
import { InviteReminderEmail } from './templates/InviteReminderEmail';

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

export interface InviteEmailData {
  to: string;
  inviteeName?: string;
  inviterName?: string;
  acceptUrl: string;
  expiresInDays: number;
}

export interface InviteReminderEmailData {
  to: string;
  inviteeName?: string;
  inviterName?: string;
  acceptUrl: string;
  daysUntilExpiry: number;
  reminderNumber: number;
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

export async function sendInviteEmail(data: InviteEmailData): Promise<string | null> {
  try {
    const html = await render(InviteEmail({
      inviteeName: data.inviteeName,
      inviterName: data.inviterName,
      acceptUrl: data.acceptUrl,
      expiresInDays: data.expiresInDays,
    }));

    const subject = data.inviterName
      ? `${data.inviterName} invited you to try Radar`
      : "You're invited to try Radar";

    const result = await resend.emails.send({
      from: 'Radar <invites@go.funnelists.com>',
      to: data.to,
      subject,
      html,
    });

    return result.data?.id || null;
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return null;
  }
}

export async function sendInviteReminderEmail(data: InviteReminderEmailData): Promise<string | null> {
  try {
    const html = await render(InviteReminderEmail({
      inviteeName: data.inviteeName,
      inviterName: data.inviterName,
      acceptUrl: data.acceptUrl,
      daysUntilExpiry: data.daysUntilExpiry,
      reminderNumber: data.reminderNumber,
    }));

    const subject = data.daysUntilExpiry <= 1
      ? 'Your Radar invite expires today!'
      : `Reminder: Your Radar invite expires in ${data.daysUntilExpiry} days`;

    const result = await resend.emails.send({
      from: 'Radar <invites@go.funnelists.com>',
      to: data.to,
      subject,
      html,
    });

    return result.data?.id || null;
  } catch (error) {
    console.error('Failed to send invite reminder email:', error);
    return null;
  }
}
