import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserAIConfig, callAI, handleAIError } from '@/lib/ai-helper';

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

    const { projectId, projectName, projectLocation, tasks } = await request.json();

    if (!projectId || !tasks || tasks.length === 0) {
      return NextResponse.json({ error: 'Project ID and tasks required' }, { status: 400 });
    }

    // Get user's AI configuration
    const aiConfig = await getUserAIConfig(user.id);
    if (!aiConfig) {
      return NextResponse.json({ 
        error: 'AI features not configured',
        message: 'Enable AI and add API key in Settings',
        aiEnabled: false
      }, { status: 403 });
    }

    console.log(`✅ Using ${aiConfig.aiProvider === 'claude' ? 'Claude' : 'OpenAI'} for smart resource generation`);

    // Detect country/region from project location
    const location = projectLocation?.toLowerCase() || '';
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

    console.log(`[Smart AI] Analyzing ${tasks.length} tasks for ${country} (${currency})`);

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

    // Prepare task summary for AI
    const tasksSummary = tasks.map((t: any, idx: number) => 
      `${idx + 1}. ${t.name}${t.description ? ` - ${t.description}` : ''} (Duration: ${t.duration || 1} days)`
    ).join('\n');

    console.log('[Smart AI] Task summary:', tasksSummary);

    // Prepare system prompt for smart analysis
    const systemPrompt = `You are an expert construction resource planning AI. Analyze the project schedule and suggest resources needed.

**PROJECT:** ${projectName || 'Construction Project'} | Location: ${country} | Currency: ${currency}

**TASKS (${tasks.length}):**
${tasksSummary}

**${country.toUpperCase()} RATES (${currency}):**
${rateGuide}

**OUTPUT FORMAT - Return ONLY valid JSON array:**
[
  {
    "name": "Resource name",
    "type": "labor|equipment|material",
    "quantity": number,
    "unit": "day|hour|piece|kg|ton|m3|bag|cum",
    "dailyRate": number,
    "currency": "${currency}",
    "duration": "X days",
    "reasoning": "Brief reason",
    "relatedTasks": ["task1", "task2"]
  }
]

**RULES:**
- Use realistic ${country} rates for ${new Date().getFullYear()}
- All rates in ${currency}
- Be concise but comprehensive
- Link resources to tasks
- NO markdown, ONLY JSON array`;

    // Call AI with task analysis
    const responseText = await callAI(
      aiConfig, 
      `Analyze these ${tasks.length} tasks and suggest resources with ${currency} costs. Return ONLY JSON array, no explanation.`, 
      systemPrompt, 
      10000 // Maximum tokens for comprehensive resource list
    );
    
    if (!responseText) {
      throw new Error('No response from AI');
    }

    console.log('[Smart AI] Raw response length:', responseText.length);
    console.log('[Smart AI] Raw response:', responseText);

    // Parse JSON response
    let resources;
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Check if response is truncated (doesn't end with ])
      if (!cleanedResponse.endsWith(']')) {
        console.warn('[Smart AI] Response appears truncated, attempting to fix...');
        
        // Find the last complete object
        const lastCompleteObject = cleanedResponse.lastIndexOf('}');
        if (lastCompleteObject !== -1) {
          cleanedResponse = cleanedResponse.substring(0, lastCompleteObject + 1) + ']';
          console.log('[Smart AI] Fixed truncated response');
        }
      }
      
      resources = JSON.parse(cleanedResponse);
    } catch (parseError: any) {
      console.error('[Smart AI] JSON parse error:', parseError);
      console.error('[Smart AI] Failed response:', responseText);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    if (!Array.isArray(resources)) {
      throw new Error('AI response is not an array');
    }

    console.log(`[Smart AI] Successfully analyzed and suggested ${resources.length} resources`);

    return NextResponse.json({
      success: true,
      resources: resources,
      count: resources.length,
      country: country,
      currency: currency,
      currencySymbol: currencySymbol,
      location: projectLocation || 'Not specified',
      tasksAnalyzed: tasks.length
    });

  } catch (error: any) {
    console.error('[Smart AI] Error:', error);
    
    // Handle AI errors with proper error response
    const errorResponse = handleAIError(error);
    return NextResponse.json(errorResponse.json, { status: errorResponse.status });
  }
}
