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

interface WelcomeEmailProps {
  userName?: string;
  loginUrl: string;
  /** Optional URL to the welcome/intro video */
  videoUrl?: string;
}

export function WelcomeEmail({ userName, loginUrl, videoUrl }: WelcomeEmailProps) {
  const previewText = `Welcome to Radar - Your intelligence feed awaits`;

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
              Welcome to Radar{userName ? `, ${userName}` : ''}!
            </Heading>

            <Text style={paragraph}>
              Thanks for signing up. Radar is your personal intelligence feed for staying
              informed on the topics that matter most to you.
            </Text>

            <Text style={paragraph}>
              Here&apos;s what you can do with Radar:
            </Text>

            <Section style={featureList}>
              <Text style={featureItem}>
                <strong>Track Topics</strong> - Create custom topics to organize content by theme
              </Text>
              <Text style={featureItem}>
                <strong>Add Sources</strong> - Connect RSS feeds, YouTube channels, and more
              </Text>
              <Text style={featureItem}>
                <strong>Daily Digests</strong> - Get email summaries of what matters
              </Text>
              <Text style={featureItem}>
                <strong>AI Insights</strong> - Let AI help surface important trends
              </Text>
            </Section>

            {videoUrl && (
              <Section style={videoSection}>
                <Text style={videoCta}>
                  Watch a quick 2-minute intro to see Radar in action:
                </Text>
                <Button style={videoButton} href={videoUrl}>
                  ▶ Watch the Tour
                </Button>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button style={button} href={loginUrl}>
                Get Started
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footerText}>
              If you have any questions, just reply to this email. We&apos;re here to help!
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerLink}>
              <Link href="https://funnelists.com" style={link}>
                Funnelists
              </Link>
              {' | '}
              <Link href={loginUrl} style={link}>
                Open Radar
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

const videoSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
  padding: '20px',
  backgroundColor: 'rgba(14, 165, 233, 0.08)',
  borderRadius: '8px',
  border: '1px solid rgba(14, 165, 233, 0.2)',
};

const videoCta = {
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const videoButton = {
  backgroundColor: 'transparent',
  borderRadius: '8px',
  color: '#0ea5e9',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  padding: '10px 24px',
  display: 'inline-block',
  border: '1px solid #0ea5e9',
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

export default WelcomeEmail;
