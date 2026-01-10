import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import { decrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { prompt, projectId } = await request.json();

    if (!prompt || !projectId) {
      return NextResponse.json({ error: 'Prompt and projectId required' }, { status: 400 });
    }

    // Check user's AI configuration from database
    const userConfig = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        aiEnabled: true,
        openaiApiKey: true
      }
    });

    if (!userConfig || !userConfig.aiEnabled) {
      console.log('❌ AI features disabled for this user');
      return NextResponse.json({ 
        error: 'AI features are disabled',
        message: 'Enable AI in Settings → AI Configuration',
        aiEnabled: false
      }, { status: 403 });
    }

    if (!userConfig.openaiApiKey) {
      console.log('❌ No OpenAI API key configured for this user');
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        message: 'Add your OpenAI API key in Settings → AI Configuration',
        aiEnabled: true,
        apiKeyMissing: true
      }, { status: 403 });
    }

    // Decrypt user's API key
    const userApiKey = decrypt(userConfig.openaiApiKey);
    console.log('✅ AI enabled with user-specific API key');

    // Check if API key has credits
    try {
      console.log('🔍 Checking OpenAI API key validity and credits...');
      const testOpenAI = new OpenAI({ apiKey: userApiKey });
      
      await testOpenAI.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5
      });
      
      console.log('✅ API key is valid and has credits');
    } catch (error: any) {
      if (error?.status === 429) {
        console.log('❌ Rate limit reached - No credits');
        return NextResponse.json({
          success: false,
          error: 'OpenAI API quota exceeded',
          message: 'Your OpenAI API key has no credits.',
          solution: 'Add payment method at https://platform.openai.com/account/billing',
          billingUrl: 'https://platform.openai.com/account/billing',
          noCredits: true
        }, { status: 429 });
      } else if (error?.status === 401) {
        console.log('❌ Invalid API key');
        return NextResponse.json({
          success: false,
          error: 'Invalid OpenAI API key',
          message: 'The configured API key is invalid.',
          invalidKey: true
        }, { status: 401 });
      }
      console.log('⚠️ API key check warning:', error.message);
    }

    // Initialize OpenAI with user's key
    const openai = new OpenAI({ apiKey: userApiKey });

    // Fetch project to get location
    const project = await prisma.project.findUnique({
      where: { id: Number(projectId) },
      select: { location: true, name: true }
    });

    // Detect country/region from project location
    const location = project?.location?.toLowerCase() || '';
    let country = 'India'; // Default
    let currency = 'INR';
    let currencySymbol = '₹';

    // Detect country from location
    if (location.includes('india') || location.includes('mumbai') || location.includes('delhi') || location.includes('bangalore')) {
      country = 'India';
      currency = 'INR';
      currencySymbol = '₹';
    } else if (location.includes('usa') || location.includes('america') || location.includes('new york') || location.includes('california')) {
      country = 'USA';
      currency = 'USD';
      currencySymbol = '$';
    } else if (location.includes('uk') || location.includes('london') || location.includes('england')) {
      country = 'UK';
      currency = 'GBP';
      currencySymbol = '£';
    } else if (location.includes('uae') || location.includes('dubai') || location.includes('abu dhabi')) {
      country = 'UAE';
      currency = 'AED';
      currencySymbol = 'AED';
    } else if (location.includes('singapore')) {
      country = 'Singapore';
      currency = 'SGD';
      currencySymbol = 'S$';
    } else if (location.includes('australia') || location.includes('sydney')) {
      country = 'Australia';
      currency = 'AUD';
      currencySymbol = 'A$';
    }

    console.log(`[AI Resources] Generating resources for ${country} (${currency})`);

    // Country-specific rate guidelines
    const rateGuidelines: Record<string, string> = {
      'India': `**INDIAN CONSTRUCTION RATES - 2026 (INR ₹)**

**LABOR RATES (Per Day - 8 hours):**
- Unskilled Labor: ₹600-800/day
- Semi-skilled Labor: ₹800-1,200/day
- Skilled Labor (Mason, Carpenter, Plumber): ₹1,200-1,800/day
- Highly Skilled (Electrician, Welder, Crane Operator): ₹1,500-2,500/day
- Supervisor/Foreman: ₹2,000-3,500/day
- Site Engineer: ₹3,000-5,000/day

**EQUIPMENT RATES (Per Day):**
- Small Equipment (Mixer, Vibrator): ₹2,500-5,000/day
- Medium Equipment (JCB, Backhoe): ₹8,000-15,000/day
- Large Equipment (Excavator, Crane): ₹15,000-35,000/day
- Tower Crane: ₹40,000-80,000/day
- Concrete Pump: ₹12,000-25,000/day

**MATERIAL RATES:**
- Cement (50kg): ₹400-450/bag
- Steel/TMT: ₹65-75/kg
- Bricks (1000): ₹6,000-8,000
- Sand (1 brass): ₹3,500-5,000
- RMC M25: ₹5,500-6,500/cum
- Paint: ₹300-800/liter`,

      'USA': `**USA CONSTRUCTION RATES - 2026 (USD $)**

**LABOR RATES (Per Hour):**
- General Laborer: $18-25/hour
- Skilled Tradesperson: $30-50/hour
- Electrician: $40-70/hour
- Plumber: $35-65/hour
- Carpenter: $30-55/hour
- Heavy Equipment Operator: $35-60/hour
- Project Manager: $60-100/hour

**EQUIPMENT RATES (Per Day):**
- Small Equipment: $200-400/day
- Excavator: $500-1,200/day
- Crane: $1,000-3,000/day
- Concrete Pump: $800-1,500/day

**MATERIAL RATES:**
- Concrete: $120-150/cubic yard
- Steel Rebar: $0.60-0.80/lb
- Lumber: $400-600/1000 board feet
- Drywall: $10-15/sheet`,

      'UK': `**UK CONSTRUCTION RATES - 2026 (GBP £)**

**LABOR RATES (Per Day):**
- Laborer: £120-180/day
- Skilled Tradesperson: £180-280/day
- Electrician: £200-320/day
- Plumber: £180-300/day
- Bricklayer: £200-300/day
- Site Manager: £300-500/day

**EQUIPMENT RATES (Per Day):**
- Mini Excavator: £150-250/day
- Large Excavator: £300-600/day
- Crane: £500-1,500/day
- Concrete Mixer: £80-150/day

**MATERIAL RATES:**
- Concrete: £90-120/cubic meter
- Bricks (1000): £400-600
- Steel: £0.80-1.20/kg
- Cement (25kg): £4-6/bag`,

      'UAE': `**UAE CONSTRUCTION RATES - 2026 (AED)**

**LABOR RATES (Per Day):**
- Laborer: AED 40-60/day
- Skilled Worker: AED 80-120/day
- Electrician: AED 100-150/day
- Plumber: AED 90-140/day
- Foreman: AED 150-250/day
- Engineer: AED 300-500/day

**EQUIPMENT RATES (Per Day):**
- Small Equipment: AED 300-600/day
- Excavator: AED 800-1,500/day
- Crane: AED 1,500-4,000/day
- Concrete Pump: AED 1,000-2,000/day

**MATERIAL RATES:**
- Cement (50kg): AED 18-25/bag
- Steel: AED 2.5-3.5/kg
- Concrete: AED 250-350/cubic meter
- Bricks (1000): AED 300-500`,

      'Singapore': `**SINGAPORE CONSTRUCTION RATES - 2026 (SGD S$)**

**LABOR RATES (Per Day):**
- General Worker: S$80-120/day
- Skilled Worker: S$120-180/day
- Specialist: S$180-280/day
- Supervisor: S$200-350/day

**EQUIPMENT RATES (Per Day):**
- Small Equipment: S$150-300/day
- Excavator: S$400-800/day
- Crane: S$800-2,000/day

**MATERIAL RATES:**
- Concrete: S$120-160/cubic meter
- Steel: S$1.2-1.8/kg
- Cement: S$8-12/bag`,

      'Australia': `**AUSTRALIA CONSTRUCTION RATES - 2026 (AUD A$)**

**LABOR RATES (Per Hour):**
- Laborer: A$30-45/hour
- Tradesperson: A$45-70/hour
- Electrician: A$50-80/hour
- Plumber: A$50-75/hour
- Supervisor: A$60-90/hour

**EQUIPMENT RATES (Per Day):**
- Small Equipment: A$200-400/day
- Excavator: A$500-1,000/day
- Crane: A$1,000-2,500/day

**MATERIAL RATES:**
- Concrete: A$200-280/cubic meter
- Steel: A$1.5-2.5/kg
- Bricks (1000): A$800-1,200`
    };

    const rateGuide = rateGuidelines[country] || rateGuidelines['India'];

    console.log('[AI Resources] Generating resources for prompt:', prompt);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a construction resource planning AI assistant. Extract resources from user requests and return them in JSON format.

**PROJECT LOCATION: ${country}**
**CURRENCY: ${currency} (${currencySymbol})**

Rules:
- Identify resource name, type (labor/equipment/material), quantity, and rates
- Common types: labor (workers), equipment (machinery), material (supplies)
- Use CURRENT ${country} construction rates for ${new Date().getFullYear()}
- All rates must be in ${currency} (${currencySymbol})

${rateGuide}

Return ONLY valid JSON array, no markdown:
[
  {
    "name": "Resource name",
    "type": "labor|equipment|material",
    "quantity": number,
    "unit": "day|hour|piece|kg|ton|m3|sqm|sqft|bag|brass|cum|liter|cubic yard|board feet|sheet|lb",
    "hourlyRate": number (optional),
    "dailyRate": number (optional),
    "unitRate": number (for materials),
    "currency": "${currency}",
    "duration": "duration string" (optional)
  }
]

Use realistic current ${country} construction rates based on the guidelines above.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('No response from AI');
    }

    console.log('[AI Resources] Raw response:', responseText);

    // Parse JSON response
    let resources;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      resources = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('[AI Resources] JSON parse error:', parseError);
      throw new Error('Failed to parse AI response');
    }

    if (!Array.isArray(resources)) {
      throw new Error('AI response is not an array');
    }

    console.log('[AI Resources] Parsed resources:', resources);

    return NextResponse.json({
      success: true,
      resources: resources,
      count: resources.length,
      country: country,
      currency: currency,
      currencySymbol: currencySymbol,
      location: project?.location || 'Not specified'
    });

  } catch (error: any) {
    console.error('[AI Resources] Error:', error);
    
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate resources' },
      { status: 500 }
    );
  }
}
