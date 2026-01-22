# Make.com Twitter/X Integration for Radar

This guide shows how to set up Make.com to fetch tweets and send them to Radar.

## Prerequisites

1. **Make.com account** (free tier works for testing)
2. **X/Twitter Developer account** with API access (Basic tier: $100/month gives 10,000 tweets/month)
3. **Radar Ingest API Key** - add `INGEST_API_KEY` to your Vercel environment variables

## Step 1: Set Up Environment Variable

Add this to your Vercel project environment variables:
```
INGEST_API_KEY=your-secure-random-key-here
```

Generate a secure key:
```bash
openssl rand -hex 32
```

## Step 2: Create Make.com Scenario

### Option A: Simple HTTP Polling (No Twitter API needed)

If you don't have Twitter API access, you can use RSS feeds or Nitter:

1. Create new scenario in Make.com
2. Add **HTTP > Make a request** module
3. Configure to fetch from an RSS-to-Twitter service like:
   - `https://nitter.net/{username}/rss`
   - `https://rsshub.app/twitter/user/{username}`
4. Parse the RSS with **XML > Parse XML**
5. Send to Radar (see Step 3)

### Option B: With Twitter API (Recommended)

1. **Create new scenario** in Make.com

2. **Add Trigger: Schedule**
   - Set to run every 15-60 minutes
   - (Twitter Basic API allows ~300 requests/month)

3. **Add Module: Twitter > Search Tweets**
   - Connect your Twitter API credentials
   - Query: `from:username1 OR from:username2 -is:retweet`
   - Max Results: 10
   - Tweet Fields: `created_at,author_id,text,public_metrics,attachments`
   - Expansions: `author_id,attachments.media_keys`

4. **Add Module: Iterator**
   - Array: `{{tweets.data}}`

5. **Add Module: HTTP > Make a request** (see Step 3)

## Step 3: Send to Radar API

Add **HTTP > Make a request** module:

**URL:**
```
https://radar.funnelists.com/api/ingest/tweets
```

**Method:** POST

**Headers:**
| Name | Value |
|------|-------|
| Authorization | Bearer YOUR_INGEST_API_KEY |
| Content-Type | application/json |

**Body (raw JSON):**
```json
{
  "account_id": "YOUR_RADAR_ACCOUNT_ID",
  "topic_id": "OPTIONAL_TOPIC_ID",
  "tweets": [
    {
      "id": "{{tweet.id}}",
      "text": "{{tweet.text}}",
      "author_name": "{{tweet.author.name}}",
      "author_username": "{{tweet.author.username}}",
      "author_profile_image": "{{tweet.author.profile_image_url}}",
      "created_at": "{{tweet.created_at}}",
      "metrics": {
        "likes": {{tweet.public_metrics.like_count}},
        "retweets": {{tweet.public_metrics.retweet_count}},
        "replies": {{tweet.public_metrics.reply_count}}
      }
    }
  ]
}
```

## Step 4: Find Your Account ID

Your Radar account ID can be found in Supabase:
1. Go to Supabase dashboard
2. Open Table Editor > `accounts` table
3. Copy your account's `id` (UUID format)

Or query it:
```sql
SELECT id FROM accounts WHERE email = 'your@email.com';
```

## Step 5: (Optional) Add Twitter Source in Radar

To link tweets to a specific source:
1. Go to Radar Sources page
2. Add a Twitter source (even without API, just for organization)
3. Copy the source ID from Supabase `sources` table
4. Add `source_id` to your Make.com request body

## API Response

Success:
```json
{
  "success": true,
  "inserted": 5,
  "skipped": 2,
  "errors": []
}
```

## Alternative: Zapier

Similar setup works with Zapier:
1. Trigger: Twitter > Search Mention or User Tweet
2. Action: Webhooks > POST
3. URL: `https://radar.funnelists.com/api/ingest/tweets`
4. Headers: Authorization: Bearer YOUR_KEY
5. Body: Same JSON structure as above

## Testing

Test the API with curl:
```bash
curl -X POST https://radar.funnelists.com/api/ingest/tweets \
  -H "Authorization: Bearer YOUR_INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "your-account-id",
    "tweets": [{
      "id": "test123",
      "text": "This is a test tweet",
      "author_name": "Test User",
      "author_username": "testuser",
      "created_at": "2024-01-22T10:00:00Z"
    }]
  }'
```

## Cost Comparison

| Option | Cost | Tweets/Month |
|--------|------|--------------|
| Twitter API Basic | $100/mo | 10,000 |
| Twitter API Pro | $5,000/mo | 1,000,000 |
| Make.com + RSS | $9-16/mo | Unlimited* |
| Zapier | $20-50/mo | Limited ops |

*RSS feeds may have delays and miss some tweets

## Troubleshooting

- **401 Unauthorized**: Check your INGEST_API_KEY matches
- **400 Bad Request**: Verify account_id and tweets array format
- **Duplicate tweets**: The API automatically skips existing tweets (by external_id)
