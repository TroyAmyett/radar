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

interface InviteEmailProps {
  inviteeName?: string;
  inviterName?: string;
  acceptUrl: string;
  expiresInDays: number;
}

export function InviteEmail({
  inviteeName,
  inviterName,
  acceptUrl,
  expiresInDays,
}: InviteEmailProps) {
  const previewText = inviterName
    ? `${inviterName} invited you to try Radar`
    : `You're invited to try Radar`;

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
              {inviteeName ? `Hi ${inviteeName},` : 'Hi there,'}
            </Heading>

            <Text style={paragraph}>
              {inviterName ? (
                <>
                  <strong>{inviterName}</strong> has invited you to try{' '}
                  <strong>Radar</strong> - an AI-powered content discovery platform.
                </>
              ) : (
                <>
                  You&apos;ve been invited to try <strong>Radar</strong> - an
                  AI-powered content discovery platform.
                </>
              )}
            </Text>

            <Text style={paragraph}>
              Radar helps you stay informed on the topics that matter most to you:
            </Text>

            <Section style={featureList}>
              <Text style={featureItem}>
                <strong>Curated Feed</strong> - Videos, articles, and insights from
                across the web
              </Text>
              <Text style={featureItem}>
                <strong>AI Summaries</strong> - Get the key points without reading
                everything
              </Text>
              <Text style={featureItem}>
                <strong>Topic Filtering</strong> - Organize content by the themes
                you care about
              </Text>
              <Text style={featureItem}>
                <strong>Daily Digests</strong> - Stay updated without information
                overload
              </Text>
            </Section>

            <Section style={buttonSection}>
              <Button style={button} href={acceptUrl}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={expiryNote}>
              This invitation expires in {expiresInDays} day
              {expiresInDays !== 1 ? 's' : ''}.
            </Text>

            <Hr style={hr} />

            <Text style={footerText}>
              If you weren&apos;t expecting this invitation, you can safely ignore
              this email.
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
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles (matching WelcomeEmail for consistency)
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

const featureList = {
  margin: '24px 0',
};

const featureItem = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 12px 0',
  paddingLeft: '16px',
  borderLeft: '2px solid #0ea5e9',
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

export default InviteEmail;
