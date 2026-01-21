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
  Img,
} from '@react-email/components';

interface ContentItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  originalUrl?: string;
  author?: string;
  thumbnailUrl?: string;
  topic?: string;
  topicColor?: string;
}

interface TrendItem {
  topic: string;
  count: number;
  color: string;
}

interface WeeklyDigestProps {
  weekRange: string;
  weekSummary: string;
  trends: TrendItem[];
  topContent: ContentItem[];
  totalItems: number;
  savedItems: number;
  settingsUrl?: string;
}

const DEFAULT_SETTINGS_URL = 'https://radar.funnelists.com/settings';

export default function WeeklyDigest({
  weekRange,
  weekSummary,
  trends,
  topContent,
  totalItems,
  savedItems,
  settingsUrl = DEFAULT_SETTINGS_URL,
}: WeeklyDigestProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Radar Weekly Digest for {weekRange}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>RADAR</Heading>
            <Text style={styles.date}>Weekly Digest • {weekRange}</Text>
          </Section>

          {/* Stats */}
          <Section style={styles.statsSection}>
            <div style={styles.statItem}>
              <Text style={styles.statNumber}>{totalItems}</Text>
              <Text style={styles.statLabel}>Items Tracked</Text>
            </div>
            <div style={styles.statItem}>
              <Text style={styles.statNumber}>{savedItems}</Text>
              <Text style={styles.statLabel}>Items Saved</Text>
            </div>
            <div style={styles.statItem}>
              <Text style={styles.statNumber}>{trends.length}</Text>
              <Text style={styles.statLabel}>Active Topics</Text>
            </div>
          </Section>

          {/* Week Summary */}
          <Section style={styles.summarySection}>
            <Text style={styles.summaryLabel}>THIS WEEK IN SUMMARY</Text>
            <Text style={styles.summaryText}>{weekSummary}</Text>
          </Section>

          <Hr style={styles.hr} />

          {/* Trends */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Topic Trends
            </Heading>
            <div style={styles.trendsGrid}>
              {trends.map((trend, index) => (
                <div key={index} style={styles.trendItem}>
                  <div
                    style={{
                      ...styles.trendBar,
                      backgroundColor: trend.color,
                      width: `${Math.min(100, (trend.count / Math.max(...trends.map((t) => t.count))) * 100)}%`,
                    }}
                  />
                  <div style={styles.trendDetails}>
                    <Text style={styles.trendTopic}>{trend.topic}</Text>
                    <Text style={styles.trendCount}>{trend.count} items</Text>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Hr style={styles.hr} />

          {/* Top Content */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Top Content This Week
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
                  {item.thumbnailUrl && (
                    <Link href={item.url}>
                      <Img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        width={540}
                        style={styles.contentImage}
                      />
                    </Link>
                  )}
                  <Link href={item.url} style={styles.contentTitle}>
                    {item.title}
                  </Link>
                  <Text style={styles.contentSummary}>{item.summary}</Text>
                </div>
              </div>
            ))}
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              You&apos;re receiving this weekly digest because you subscribed to Radar.
            </Text>
            <Link href={settingsUrl} style={styles.footerLink}>
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
  statsSection: {
    display: 'flex',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
  },
  statItem: {
    textAlign: 'center' as const,
  },
  statNumber: {
    color: '#0ea5e9',
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
    marginTop: '4px',
  },
  summarySection: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid rgba(14, 165, 233, 0.2)',
  },
  summaryLabel: {
    color: '#0ea5e9',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  summaryText: {
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
  trendsGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  trendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  trendBar: {
    height: '8px',
    borderRadius: '4px',
    minWidth: '20px',
    maxWidth: '200px',
  },
  trendDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  trendTopic: {
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: '500',
    margin: 0,
  },
  trendCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px',
    margin: 0,
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
  contentImage: {
    width: '100%',
    maxWidth: '540px',
    height: 'auto',
    borderRadius: '8px',
    marginBottom: '12px',
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
