import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Heading,
  Hr,
  Preview,
} from '@react-email/components';

interface ContentItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  author?: string;
  topic?: string;
  topicColor?: string;
}

interface MorningDigestProps {
  date: string;
  topContent: ContentItem[];
  aiInsight: string;
}

export default function MorningDigest({
  date,
  topContent,
  aiInsight,
}: MorningDigestProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Radar Morning Digest for {date}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>RADAR</Heading>
            <Text style={styles.date}>Morning Digest • {date}</Text>
          </Section>

          {/* AI Insight */}
          <Section style={styles.insightSection}>
            <Text style={styles.insightLabel}>AI INSIGHT</Text>
            <Text style={styles.insightText}>{aiInsight}</Text>
          </Section>

          <Hr style={styles.hr} />

          {/* Top 5 Content */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Top Stories
            </Heading>
            {topContent.map((item, index) => (
              <div key={item.id} style={styles.contentItem}>
                <Text style={styles.contentNumber}>{index + 1}</Text>
                <div style={styles.contentDetails}>
                  {item.topic && (
                    <span
                      style={{
                        ...styles.topicBadge,
                        backgroundColor: `${item.topicColor || '#0ea5e9'}20`,
                        color: item.topicColor || '#0ea5e9',
                      }}
                    >
                      {item.topic}
                    </span>
                  )}
                  <Link href={item.url} style={styles.contentTitle}>
                    {item.title}
                  </Link>
                  <Text style={styles.contentSummary}>{item.summary}</Text>
                  {item.author && (
                    <Text style={styles.contentAuthor}>by {item.author}</Text>
                  )}
                </div>
              </div>
            ))}
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              You&apos;re receiving this because you subscribed to Radar digests.
            </Text>
            <Link href="#" style={styles.footerLink}>
              Manage preferences
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: '#0a0a0f',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '32px',
  },
  logo: {
    color: '#0ea5e9',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: 0,
    letterSpacing: '4px',
  },
  date: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '14px',
    marginTop: '8px',
  },
  insightSection: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid rgba(14, 165, 233, 0.2)',
  },
  insightLabel: {
    color: '#0ea5e9',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  insightText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: 0,
  },
  hr: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    margin: '24px 0',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '20px',
  },
  contentItem: {
    display: 'flex',
    marginBottom: '20px',
  },
  contentNumber: {
    color: '#0ea5e9',
    fontSize: '24px',
    fontWeight: 'bold',
    marginRight: '16px',
    minWidth: '30px',
  },
  contentDetails: {
    flex: 1,
  },
  topicBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '500',
    marginBottom: '8px',
  },
  contentTitle: {
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'block',
    marginBottom: '8px',
  },
  contentSummary: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0,
  },
  contentAuthor: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px',
    marginTop: '8px',
  },
  footer: {
    textAlign: 'center' as const,
    marginTop: '40px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '12px',
  },
  footerLink: {
    color: '#0ea5e9',
    fontSize: '12px',
    textDecoration: 'none',
  },
};
