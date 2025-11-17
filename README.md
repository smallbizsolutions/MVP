# Employee Assistant - Production Deployment Guide

## Prerequisites

1. **Supabase Account** - Create a project at [supabase.com](https://supabase.com)
2. **Anthropic API Key** - Get one from [console.anthropic.com](https://console.anthropic.com)
3. **Node.js** - Version 18 or higher

## Setup Instructions

### 1. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of the SQL schema file (Production-Ready Supabase Schema artifact)
4. Run the SQL query
5. Verify all tables were created in the Table Editor

**Important:** This will create:
- All necessary tables (businesses, profiles, documents, conversations, messages)
- Row Level Security (RLS) policies
- Automatic trigger for profile/business creation on signup
- Proper indexes for performance

### 2. Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Found in Supabase Project Settings > API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Found in Supabase Project Settings > API (use the `anon` `public` key from Legacy API Keys tab)
   - `ANTHROPIC_API_KEY`: Your Anthropic API key

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Locally (Development)

```bash
npm run dev
```

Visit `http://localhost:3000`

### 5. Deploy to Production

#### Option A: Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

#### Option B: Deploy to Railway

1. Push your code to GitHub
2. Create a new project in Railway
3. Connect your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
5. Deploy

## Verification

After deployment, verify everything is working:

1. **Health Check**: Visit `https://yourdomain.com/api/health`
   - Should return `{"status": "healthy"}`

2. **Test Signup**:
   - Create a new account
   - Verify profile and business are auto-created
   - Check Supabase dashboard to confirm data

3. **Test Upload**:
   - Upload a PDF document
   - Verify it appears in the Manage tab

4. **Test Chat**:
   - Ask a question about your uploaded documents
   - Verify you get a response

## Important Production Considerations

### Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Rate limiting on API routes (100 req/min)
- ✅ Input validation and sanitization
- ✅ Security headers (CSP, HSTS, etc.)
- ✅ API keys validated on startup

### Performance

- ✅ Database indexes on frequently queried columns
- ✅ Document content truncation (200k chars max)
- ✅ API retry logic with exponential backoff
- ✅ Proper error handling

### Monitoring

- Health check endpoint at `/api/health`
- Server-side error logging (check your hosting platform logs)
- Consider adding: Sentry, LogRocket, or similar for production monitoring

### Limitations

1. **Rate Limiting**: In-memory store (resets on server restart)
   - For production, consider: Upstash Redis, Vercel KV, or similar
   
2. **File Storage**: Documents stored as text in database
   - For large-scale: Consider Supabase Storage + vector embeddings
   
3. **No Email Verification**: Supabase handles this, but customize templates in Supabase dashboard

## Troubleshooting

### "Unauthorized" errors
- Check RLS policies in Supabase
- Verify user is logged in
- Check browser console for auth errors

### "Profile not found"
- Verify the signup trigger is working
- Check Supabase logs
- Manually check if profile was created in database

### PDF upload fails
- Check file size (max 50MB)
- Verify PDF is not password-protected
- Check server logs for detailed error

### Chat not working
- Verify ANTHROPIC_API_KEY is set
- Check API quota/billing in Anthropic dashboard
- Verify documents exist in database

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `NODE_ENV` | No | Set to `production` in production |

## Support

For issues or questions:
1. Check the health endpoint: `/api/health`
2. Review server logs in your hosting platform
3. Check Supabase logs in dashboard
4. Verify all environment variables are set correctly
