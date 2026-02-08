import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface InviteReminderEmailProps {
  inviteeName?: string;
  inviterName?: string;
  acceptUrl: string;
  daysUntilExpiry: number;
  reminderNumber: number;
}

export function InviteReminderEmail({
  inviteeName,
  inviterName,
  acceptUrl,
  daysUntilExpiry,
  reminderNumber,
}: InviteReminderEmailProps) {
  const previewText =
    daysUntilExpiry <= 1
      ? `Your Radar invite expires today!`
      : `Reminder: Your Radar invite expires in ${daysUntilExpiry} days`;

  const urgencyText =
    daysUntilExpiry <= 1
      ? 'This is your final reminder - your invite expires today!'
      : daysUntilExpiry <= 2
        ? `Your invite expires in ${daysUntilExpiry} days.`
        : `Just a friendly reminder that your invite is still waiting for you.`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>Radar</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={heading}>
              {inviteeName ? `Hey ${inviteeName}!` : 'Hey there!'}
            </Heading>

            <Text style={paragraph}>
              {inviterName ? (
                <>
                  <strong>{inviterName}</strong> invited you to try Radar, and we
                  noticed you haven&apos;t signed up yet.
                </>
              ) : (
                <>
                  You received an invitation to try Radar, and we noticed you
                  haven&apos;t signed up yet.
                </>
              )}
            </Text>

            <Text style={urgencyParagraph}>{urgencyText}</Text>

            <Section style={featureHighlight}>
              <Text style={featureText}>
                Radar is an AI-powered content discovery platform that helps you
                stay informed with curated videos, articles, and insights from
                across the web.
              </Text>
            </Section>

            <Section style={buttonSection}>
              <Button style={button} href={acceptUrl}>
                Accept Invitation
              </Button>
            </Section>

            {daysUntilExpiry > 1 && (
              <Text style={expiryNote}>
                Your invitation expires in {daysUntilExpiry} days.
              </Text>
            )}

            <Hr style={hr} />

            <Text style={footerText}>
              If you&apos;re not interested, no worries - this link will expire
              automatically and we won&apos;t send any more reminders.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerLink}>
              <Link href="https://radar.funnelists.com" style={link}>
                Learn more about Radar
              </Link>
            </Text>
            <Text style={footerCopyright}>
              &copy; {new Date().getFullYear()} Funnelists. All rights reserved.
            </Text>
            {reminderNumber > 0 && (
              <Text style={reminderNote}>
                This is reminder {reminderNumber} of 3
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#0a0a0f',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
};

const header = {
  textAlign: 'center' as const,
  marginBottom: '32px',
};

const logo = {
  color: '#0ea5e9',
  fontSize: '32px',
  fontWeight: '700',
  margin: '0',
};

const content = {
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '12px',
  padding: '32px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const heading = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: '600',
  margin: '0 0 24px 0',
};

const paragraph = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px 0',
};

const urgencyParagraph = {
  color: '#fbbf24',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 24px 0',
  fontWeight: '500',
};

const featureHighlight = {
  margin: '24px 0',
  padding: '16px',
  backgroundColor: 'rgba(14, 165, 233, 0.1)',
  borderRadius: '8px',
  border: '1px solid rgba(14, 165, 233, 0.2)',
};

const featureText = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#0ea5e9',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '14px 32px',
  display: 'inline-block',
};

const expiryNote = {
  color: 'rgba(255, 255, 255, 0.5)',
  fontSize: '14px',
  textAlign: 'center' as const,
  margin: '0',
};

const hr = {
  borderColor: 'rgba(255, 255, 255, 0.1)',
  margin: '24px 0',
};

const footerText = {
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const footer = {
  textAlign: 'center' as const,
  marginTop: '32px',
};

const footerLink = {
  color: 'rgba(255, 255, 255, 0.6)',
  fontSize: '14px',
  margin: '0 0 8px 0',
};

const link = {
  color: '#0ea5e9',
  textDecoration: 'none',
};

const footerCopyright = {
  color: 'rgba(255, 255, 255, 0.4)',
  fontSize: '12px',
  margin: '0',
};

const reminderNote = {
  color: 'rgba(255, 255, 255, 0.3)',
  fontSize: '11px',
  margin: '8px 0 0 0',
};

export default InviteReminderEmail;
