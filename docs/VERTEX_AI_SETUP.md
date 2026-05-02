# Google Vertex AI Setup Guide

This guide will help you set up Google Vertex AI to access both Claude and Gemini models for Aegis Swarm.

## Why Vertex AI?

Google Vertex AI provides unified access to:
- **Claude models** (via Model Garden) - Best for security analysis
- **Gemini models** - Google's native models
- **Enterprise features** - Better rate limits, SLAs, and compliance
- **Cost optimization** - Competitive pricing with volume discounts

## Prerequisites

- Google Cloud Platform (GCP) account
- Billing enabled on your GCP project
- `gcloud` CLI installed (optional but recommended)

## Step 1: Create GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your **Project ID** (you'll need this later)

## Step 2: Enable Required APIs

Enable the following APIs in your project:

```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable compute.googleapis.com
```

Or enable via Console:
1. Go to **APIs & Services** > **Library**
2. Search and enable:
   - Vertex AI API
   - Compute Engine API

## Step 3: Enable Claude Models (Model Garden)

1. Go to **Vertex AI** > **Model Garden**
2. Search for "Claude"
3. Click on **Claude 4.6 Sonnet**
4. Click **Enable** or **Deploy**
5. Accept the terms and conditions
6. Wait for the model to be available (usually instant)

Available Claude models:
- `claude-sonnet-4-6` (Recommended)
- `claude-opus-4-7`
- `claude-opus-4-6`
- `claude-haiku-4-5@20251001`

## Step 4: Create Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `aegis-swarm-ai`
4. Description: `Service account for Aegis Swarm AI operations`
5. Click **Create and Continue**

## Step 5: Grant Permissions

Add the following roles to your service account:

- **Vertex AI User** (`roles/aiplatform.user`)
- **Service Account Token Creator** (`roles/iam.serviceAccountTokenCreator`)

```bash
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:aegis-swarm-ai@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

## Step 6: Create and Download Key

1. In the Service Accounts list, find your service account
2. Click the three dots (⋮) > **Manage Keys**
3. Click **Add Key** > **Create New Key**
4. Select **JSON** format
5. Click **Create**
6. Save the downloaded JSON file securely

**⚠️ Security Warning**: This key file provides full access to your GCP resources. Never commit it to version control!

## Step 7: Configure Aegis Swarm

### Option A: Using Environment Variable (Recommended)

```bash
# Set the path to your service account key
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-service-account-key.json"
```

Add to your `.env` file:

```env
# Google Vertex AI Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json
VERTEX_AI_PROJECT_ID=your-gcp-project-id
VERTEX_AI_LOCATION=us-central1

# Use Claude via Vertex AI (Recommended)
AI_PROVIDER=vertex-claude
VERTEX_CLAUDE_MODEL=claude-4-6-sonnet
VERTEX_CLAUDE_MAX_TOKENS=4096
VERTEX_CLAUDE_TEMPERATURE=0.7

# Or use Gemini via Vertex AI
# AI_PROVIDER=vertex-gemini
# VERTEX_GEMINI_MODEL=gemini-3.1-pro
```

### Option B: Using Application Default Credentials

If running on GCP (Cloud Run, GKE, etc.):

```bash
gcloud auth application-default login
```

Then you don't need `GOOGLE_APPLICATION_CREDENTIALS`.

## Step 8: Verify Setup

Test your configuration:

```bash
cd backend
npm install
npm run dev
```

Check the logs for:
```
Initialized Vertex AI Claude: claude-3-5-sonnet@20240620
```

## Available Regions

Vertex AI is available in multiple regions. Choose the closest one:

- `us-central1` (Iowa) - Default, best for US
- `us-east4` (Virginia)
- `us-west1` (Oregon)
- `europe-west4` (Netherlands)
- `asia-southeast1` (Singapore)

Update `VERTEX_AI_LOCATION` in your `.env` file.

## Model Comparison

### Claude 4.6 Opus (Recommended for Security)
- **Best for**: Code analysis, vulnerability detection
- **Context**: 200K tokens
- **Speed**: Fast
- **Cost**: Moderate
- **Model ID**: `claude-4-6-opus`

### Gemini 3.1 Pro
- **Best for**: General tasks, multimodal
- **Context**: 1M tokens
- **Speed**: Very fast
- **Cost**: Lower
- **Model ID**: `gemini-3.1-pro`

### Gemini 1.5 Flash
- **Best for**: High-volume, speed-critical tasks
- **Context**: 1M tokens
- **Speed**: Fastest
- **Cost**: Lowest
- **Model ID**: `gemini-3-flash`

## Pricing (Approximate)

### Claude via Vertex AI
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

### Gemini 1.5 Pro
- Input: $1.25 per 1M tokens
- Output: $5 per 1M tokens

### Gemini 1.5 Flash
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

*Prices subject to change. Check [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing) for current rates.*

## Rate Limits

Default quotas (can be increased):
- **Claude**: 10 requests/minute, 40,000 tokens/minute
- **Gemini Pro**: 60 requests/minute, 4M tokens/minute
- **Gemini Flash**: 1000 requests/minute, 4M tokens/minute

Request quota increases via GCP Console if needed.

## Troubleshooting

### Error: "Permission denied"
- Verify service account has `roles/aiplatform.user`
- Check `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- Ensure JSON key file is valid

### Error: "Model not found"
- Verify Claude is enabled in Model Garden
- Check model name matches exactly (case-sensitive)
- Ensure you're using the correct region

### Error: "Quota exceeded"
- Request quota increase in GCP Console
- Consider using Gemini Flash for high-volume tasks
- Implement rate limiting in your application

### Error: "Invalid credentials"
- Regenerate service account key
- Verify JSON file is not corrupted
- Check file permissions (should be readable)

## Best Practices

1. **Security**
   - Never commit service account keys to git
   - Use Secret Manager for production
   - Rotate keys regularly (every 90 days)
   - Use least-privilege IAM roles

2. **Cost Optimization**
   - Use Gemini Flash for non-critical tasks
   - Implement caching for repeated queries
   - Set appropriate token limits
   - Monitor usage in GCP Console

3. **Performance**
   - Choose region closest to your users
   - Use streaming for real-time responses
   - Implement retry logic with exponential backoff
   - Cache model responses when possible

4. **Monitoring**
   - Enable Cloud Logging
   - Set up billing alerts
   - Monitor API quotas
   - Track error rates

## Production Deployment

For production, use Google Secret Manager:

```bash
# Store service account key in Secret Manager
gcloud secrets create aegis-swarm-sa-key \
  --data-file=/path/to/key.json

# Grant access to your service
gcloud secrets add-iam-policy-binding aegis-swarm-sa-key \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
  --role="roles/secretmanager.secretAccessor"
```

Then access in your application:

```javascript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

const client = new SecretManagerServiceClient();
const [version] = await client.accessSecretVersion({
  name: 'projects/PROJECT_ID/secrets/aegis-swarm-sa-key/versions/latest',
});

const credentials = JSON.parse(version.payload.data.toString());
```

## Support

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Model Garden](https://cloud.google.com/vertex-ai/docs/start/explore-models)
- [GCP Support](https://cloud.google.com/support)

---

**Ready to use Vertex AI with Aegis Swarm!** 🚀