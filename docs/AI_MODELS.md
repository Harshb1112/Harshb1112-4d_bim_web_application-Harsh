# AI Models Configuration

## Supported AI Providers

### 1. Claude (Anthropic)

**Available Models (Auto-fallback in order):**
1. `claude-3-5-sonnet-20241022` ⭐ **Latest** (Requires paid tier)
2. `claude-3-5-sonnet-20240620` (Stable - Requires paid tier)
3. `claude-3-haiku-20240307` 🆓 **Free Tier Compatible** (Fast & Cheap)
4. `claude-3-sonnet-20240229` (Fallback)
5. `claude-3-opus-20240229` (Most powerful - Expensive)

**Smart Fallback:** System automatically tries models in order until one works! If latest model not available, it falls back to the next one.

**API Key Format:** `sk-ant-api03-...`

**Platform URLs:**
- API Keys: https://console.anthropic.com/settings/keys
- Billing: https://console.anthropic.com/settings/billing
- Documentation: https://docs.anthropic.com/

**Pricing (as of 2026):**
- Claude 3.5 Sonnet: $3 per million input tokens, $15 per million output tokens
- Claude 3 Opus: $15 per million input tokens, $75 per million output tokens

---

### 2. OpenAI

**Available Models (Auto-fallback in order):**
1. `gpt-4o-mini` ⭐ **Default** (Fast & Cheap - Recommended)
2. `gpt-4o` (More powerful & latest)
3. `gpt-4-turbo` (Alternative)

**API Key Format:** `sk-proj-...` or `sk-...`

**Platform URLs:**
- API Keys: https://platform.openai.com/api-keys
- Billing: https://platform.openai.com/account/billing
- Documentation: https://platform.openai.com/docs

**Pricing (as of 2026):**
- GPT-4o-mini: $0.15 per million input tokens, $0.60 per million output tokens
- GPT-4o: $5 per million input tokens, $15 per million output tokens

---

## How to Configure

### Step 1: Get API Key

**For Claude:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to Settings → API Keys
4. Create a new API key
5. Add credits at Settings → Billing

**For OpenAI:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Add payment method at Account → Billing

### Step 2: Add to Application

1. Go to Settings → AI Configuration
2. Enable AI Features
3. Select Provider (OpenAI or Claude)
4. Paste your API key
5. Save

### Step 3: Test

Try any AI feature:
- Generate Tasks from BIM elements
- Get Project Insights
- Suggest Element-Task Links
- Generate Resources

---

## Error Handling

### Invalid API Key (401)
**Error:** "Invalid [Provider] API key"
**Solution:** Check your API key in Settings and verify it's correct

### No Credits (429)
**Error:** "[Provider] API quota exceeded"
**Solution:** Add credits/payment method to your account

### Model Not Found (404)
**Error:** "model: [model-name]"
**Solution:** The model might be deprecated. System will use default model automatically.

---

## Auto-Detection

The system automatically detects which provider to use based on your API key format:
- Keys starting with `sk-ant-` → Claude
- Keys starting with `sk-` → OpenAI

---

## Model Selection

Currently, the system uses default models:
- **Claude:** `claude-3-5-sonnet-20240620`
- **OpenAI:** `gpt-4o-mini`

Future updates will allow custom model selection per user.

---

## Recommendations

### For Cost Efficiency:
- Use **OpenAI GPT-4o-mini** (cheapest option)
- Limit max tokens in requests

### For Best Quality:
- Use **Claude 3.5 Sonnet** (best balance)
- Use **Claude 3 Opus** (most powerful, expensive)

### For Speed:
- Use **GPT-4o-mini** (fastest)
- Use **Claude 3.5 Sonnet** (fast + quality)

---

## Troubleshooting

### Issue: "Model not found"
**Cause:** Model name might be outdated or not available in your region
**Fix:** System automatically uses fallback model

### Issue: "Rate limit exceeded"
**Cause:** Too many requests or no credits
**Fix:** Wait a few minutes or add credits

### Issue: "Invalid API key"
**Cause:** Wrong key or key expired
**Fix:** Generate new key from platform

---

## Support

For issues with:
- **Claude:** https://support.anthropic.com/
- **OpenAI:** https://help.openai.com/

For application issues: Contact your system administrator
