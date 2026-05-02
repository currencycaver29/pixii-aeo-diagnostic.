import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ─── Query each AI model ───────────────────────────────────────────

async function queryOpenAI(apiKey, prompt) {
  const client = new OpenAI({ apiKey });
  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.3,
  });
  return { text: res.choices[0].message.content, model: 'GPT-4o Mini' };
}

async function queryAnthropic(apiKey, prompt) {
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  return { text: res.content[0].text, model: 'Claude 3.5 Haiku' };
}

async function queryGemini(apiKey, prompt) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const res = await model.generateContent(prompt);
  return { text: res.response.text(), model: 'Gemini 2.0 Flash' };
}

// ─── Analyze responses with structured extraction ──────────────────

async function analyzeWithAI(apiKey, responses, brandName, query) {
  const client = new OpenAI({ apiKey });

  const prompt = `You are an expert analyst for AI Engine Optimization (AEO).

Analyze these 3 AI shopping assistant responses for the query: "${query}"
${brandName ? `\nThe user's brand is: "${brandName}". Pay special attention to it.\n` : ''}
=== GPT-4o Mini Response ===
${responses.gpt?.text || 'ERROR: No response'}

=== Claude 3.5 Haiku Response ===
${responses.claude?.text || 'ERROR: No response'}

=== Gemini 2.0 Flash Response ===
${responses.gemini?.text || 'ERROR: No response'}

Extract ALL brands/products mentioned. For each brand determine:
- Which AI models mentioned it
- Its position in each model's list (1 = first recommended, null if not mentioned)
- Whether it was actively recommended (true) or just mentioned in passing (false)

Also provide:
- 3-5 actionable AEO optimization recommendations
- Key insights about the competitive landscape
${brandName ? `- Specific analysis of "${brandName}"'s visibility and positioning` : ''}

Respond ONLY with valid JSON in this exact format:
{
  "brands": [
    {
      "name": "Brand Name",
      "mentions": {
        "gpt": { "position": 1, "recommended": true },
        "claude": { "position": null, "recommended": false },
        "gemini": { "position": 2, "recommended": true }
      },
      "visibilityScore": 67
    }
  ],
  "userBrand": {
    "found": true,
    "overallRank": 3,
    "aeoScore": 45,
    "grade": "C+",
    "strengths": ["..."],
    "weaknesses": ["..."]
  },
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"],
  "categoryTrends": "Brief paragraph about what AI models prioritize in this category"
}

For visibilityScore: 100 = mentioned first in all 3, 0 = not mentioned at all.
For aeoScore: weighted score based on visibility, position, and recommendation strength.
For grade: A+ (90-100), A (80-89), B+ (70-79), B (60-69), C+ (50-59), C (40-49), D (30-39), F (0-29).
If user brand not specified, set userBrand to null.
Sort brands by visibilityScore descending.`;

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
    temperature: 0.1,
  });

  return JSON.parse(res.choices[0].message.content);
}

// ─── Fallback analysis (no AI needed) ──────────────────────────────

function fallbackAnalysis(responses, brandName) {
  const allText = [
    responses.gpt?.text || '',
    responses.claude?.text || '',
    responses.gemini?.text || '',
  ].join('\n');

  // Extract bold text patterns as likely brand names
  const boldPattern = /\*\*([^*]+)\*\*/g;
  const brandSet = new Set();
  let match;
  while ((match = boldPattern.exec(allText)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && name.length < 60) brandSet.add(name);
  }

  const brands = Array.from(brandSet).slice(0, 15).map((name, i) => ({
    name,
    mentions: {
      gpt: { position: (responses.gpt?.text || '').includes(name) ? i + 1 : null, recommended: (responses.gpt?.text || '').includes(name) },
      claude: { position: (responses.claude?.text || '').includes(name) ? i + 1 : null, recommended: (responses.claude?.text || '').includes(name) },
      gemini: { position: (responses.gemini?.text || '').includes(name) ? i + 1 : null, recommended: (responses.gemini?.text || '').includes(name) },
    },
    visibilityScore: Math.max(20, 100 - i * 10),
  }));

  let userBrand = null;
  if (brandName) {
    const found = brands.find(b => b.name.toLowerCase().includes(brandName.toLowerCase()));
    userBrand = {
      found: !!found,
      overallRank: found ? brands.indexOf(found) + 1 : null,
      aeoScore: found ? found.visibilityScore : 0,
      grade: found ? (found.visibilityScore >= 80 ? 'A' : found.visibilityScore >= 60 ? 'B' : 'C') : 'F',
      strengths: found ? ['Mentioned by at least one AI model'] : [],
      weaknesses: found ? [] : ['Not mentioned by any AI model'],
    };
  }

  return {
    brands,
    userBrand,
    insights: ['Analysis generated using text matching (fallback mode)', 'Structured AI analysis unavailable'],
    recommendations: ['Ensure your brand appears in AI training data', 'Optimize product descriptions for AI comprehension'],
    categoryTrends: 'Fallback analysis — upgrade to structured analysis by providing an OpenAI API key.',
  };
}

// ─── Main diagnostic endpoint ──────────────────────────────────────

app.post('/api/diagnose', async (req, res) => {
  try {
    const { query, brandName, apiKeys } = req.body;

    if (!query || query.trim().length < 3) {
      return res.status(400).json({ error: 'Please provide a search query' });
    }

    const keys = {
      openai: apiKeys?.openai || process.env.OPENAI_API_KEY,
      anthropic: apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY,
      gemini: apiKeys?.gemini || process.env.GEMINI_API_KEY,
    };

    const hasAnyKey = keys.openai || keys.anthropic || keys.gemini;
    if (!hasAnyKey) {
      return res.status(400).json({ error: 'At least one API key is required. Add keys in Settings or in the .env file.' });
    }

    const shoppingPrompt = `I'm shopping online and I need help: ${query}

Please recommend specific brands and products. For each recommendation:
1. Name the specific brand and product
2. Briefly explain why you recommend it
3. Mention the price range if you know it

List your top 5-8 recommendations in order of preference.`;

    // Query all models in parallel
    const [gptResult, claudeResult, geminiResult] = await Promise.allSettled([
      keys.openai ? queryOpenAI(keys.openai, shoppingPrompt) : Promise.reject(new Error('No API key')),
      keys.anthropic ? queryAnthropic(keys.anthropic, shoppingPrompt) : Promise.reject(new Error('No API key')),
      keys.gemini ? queryGemini(keys.gemini, shoppingPrompt) : Promise.reject(new Error('No API key')),
    ]);

    const responses = {
      gpt: gptResult.status === 'fulfilled' ? gptResult.value : { error: gptResult.reason?.message || 'Failed', text: null, model: 'GPT-4o Mini' },
      claude: claudeResult.status === 'fulfilled' ? claudeResult.value : { error: claudeResult.reason?.message || 'Failed', text: null, model: 'Claude 3.5 Haiku' },
      gemini: geminiResult.status === 'fulfilled' ? geminiResult.value : { error: geminiResult.reason?.message || 'Failed', text: null, model: 'Gemini 2.0 Flash' },
    };

    const successCount = [gptResult, claudeResult, geminiResult].filter(r => r.status === 'fulfilled').length;
    if (successCount === 0) {
      return res.status(500).json({
        error: 'All AI queries failed. Please check your API keys.',
        details: {
          gpt: responses.gpt.error,
          claude: responses.claude.error,
          gemini: responses.gemini.error,
        },
      });
    }

    // Run structured analysis
    let analysis;
    try {
      if (keys.openai) {
        analysis = await analyzeWithAI(keys.openai, responses, brandName, query);
      } else {
        analysis = fallbackAnalysis(responses, brandName);
      }
    } catch (err) {
      console.error('Analysis error, using fallback:', err.message);
      analysis = fallbackAnalysis(responses, brandName);
    }

    res.json({
      query,
      brandName: brandName || null,
      responses,
      analysis,
      meta: {
        modelsQueried: 3,
        modelsSucceeded: successCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Diagnostic error:', err);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// ─── Demo endpoint ─────────────────────────────────────────────────

app.get('/api/demo', (_req, res) => {
  res.json(getDemoData());
});

function getDemoData() {
  return {
    query: 'best magnesium supplement for seniors',
    brandName: 'Nature Made',
    responses: {
      gpt: {
        text: `Here are my top recommendations for magnesium supplements for seniors:\n\n1. **Nature Made Magnesium Glycinate 200mg** — Excellent bioavailability, gentle on the stomach. USP verified for purity. ~$12-15 for 60 capsules.\n\n2. **Doctor's Best High Absorption Magnesium** — Uses chelated magnesium glycinate/lysinate for superior absorption. ~$10-14 for 120 tablets.\n\n3. **Thorne Magnesium Bisglycinate** — Pharmaceutical-grade, no artificial additives. Trusted by healthcare professionals. ~$25-35 for 60 capsules.\n\n4. **Life Extension Magnesium Caps** — Contains multiple forms (oxide, citrate, glycinate) for comprehensive coverage. ~$10-12 for 100 capsules.\n\n5. **Pure Encapsulations Magnesium Glycinate** — Hypoallergenic, free from common allergens. Great for sensitive stomachs. ~$20-30 for 90 capsules.\n\n6. **NOW Foods Magnesium Citrate** — Budget-friendly, good absorption. ~$8-10 for 120 capsules.\n\n7. **Trace Minerals Mega Mag** — Liquid form, easy for seniors who have difficulty swallowing pills. ~$15-20.`,
        model: 'GPT-4o Mini',
      },
      claude: {
        text: `For seniors looking for magnesium supplements, here are my top recommendations:\n\n1. **Thorne Magnesium Bisglycinate** — My top pick for seniors. Chelated form means excellent absorption and minimal GI side effects. Third-party tested. Price: ~$25-35/bottle.\n\n2. **Pure Encapsulations Magnesium Glycinate** — Hypoallergenic formula, ideal for seniors with sensitivities. No unnecessary fillers. Price: ~$22-30/bottle.\n\n3. **Nature Made Magnesium Glycinate** — USP verified, widely available at pharmacies. Good value. Price: ~$12-15/bottle.\n\n4. **Doctor's Best High Absorption Magnesium** — Uses patented Albion chelated magnesium for better bioavailability. Price: ~$10-14/bottle.\n\n5. **Garden of Life Dr. Formulated Whole Food Magnesium** — Organic, whole-food sourced. Includes probiotics for gut health. Price: ~$15-20/bottle.\n\n6. **Life Extension Magnesium Caps** — Multiple forms of magnesium in one supplement. Price: ~$10-12/bottle.\n\n7. **Calm Magnesium Powder by Natural Vitality** — Powder form, easy to mix into water. Popular for sleep support. Price: ~$15-25/bottle.`,
        model: 'Claude 3.5 Haiku',
      },
      gemini: {
        text: `Here are the best magnesium supplements I'd recommend for seniors:\n\n1. **Doctor's Best High Absorption Magnesium** — Features chelated magnesium for optimal absorption. Very popular with excellent reviews. Budget-friendly at ~$10-14.\n\n2. **Nature Made Magnesium Glycinate** — Backed by USP verification and widely recommended by pharmacists. A trusted brand for seniors. ~$12-15.\n\n3. **Thorne Magnesium Bisglycinate** — Premium quality, used by healthcare practitioners. Higher price point (~$25-35) but exceptional purity.\n\n4. **NOW Foods Magnesium Glycinate** — Affordable option with good bioavailability. NOW Foods has strong quality testing. ~$12-18.\n\n5. **Pure Encapsulations Magnesium Glycinate** — Free from common allergens, gentle on digestion. ~$22-30.\n\n6. **Magtein (Magnesium L-Threonate) by Life Extension** — Specifically designed to cross the blood-brain barrier. Great for cognitive support in seniors. ~$20-30.\n\n7. **Jigsaw MagSRT** — Sustained-release technology for steady absorption throughout the day. ~$30-40.`,
        model: 'Gemini 2.0 Flash',
      },
    },
    analysis: {
      brands: [
        { name: 'Nature Made Magnesium Glycinate', mentions: { gpt: { position: 1, recommended: true }, claude: { position: 3, recommended: true }, gemini: { position: 2, recommended: true } }, visibilityScore: 93 },
        { name: "Doctor's Best High Absorption Magnesium", mentions: { gpt: { position: 2, recommended: true }, claude: { position: 4, recommended: true }, gemini: { position: 1, recommended: true } }, visibilityScore: 90 },
        { name: 'Thorne Magnesium Bisglycinate', mentions: { gpt: { position: 3, recommended: true }, claude: { position: 1, recommended: true }, gemini: { position: 3, recommended: true } }, visibilityScore: 90 },
        { name: 'Pure Encapsulations Magnesium Glycinate', mentions: { gpt: { position: 5, recommended: true }, claude: { position: 2, recommended: true }, gemini: { position: 5, recommended: true } }, visibilityScore: 75 },
        { name: 'Life Extension Magnesium Caps', mentions: { gpt: { position: 4, recommended: true }, claude: { position: 6, recommended: true }, gemini: { position: 6, recommended: true } }, visibilityScore: 65 },
        { name: 'NOW Foods Magnesium', mentions: { gpt: { position: 6, recommended: true }, claude: { position: null, recommended: false }, gemini: { position: 4, recommended: true } }, visibilityScore: 45 },
        { name: 'Garden of Life Dr. Formulated', mentions: { gpt: { position: null, recommended: false }, claude: { position: 5, recommended: true }, gemini: { position: null, recommended: false } }, visibilityScore: 25 },
        { name: 'Natural Vitality Calm', mentions: { gpt: { position: null, recommended: false }, claude: { position: 7, recommended: true }, gemini: { position: null, recommended: false } }, visibilityScore: 20 },
        { name: 'Jigsaw MagSRT', mentions: { gpt: { position: null, recommended: false }, claude: { position: null, recommended: false }, gemini: { position: 7, recommended: true } }, visibilityScore: 18 },
      ],
      userBrand: {
        found: true,
        overallRank: 1,
        aeoScore: 93,
        grade: 'A+',
        strengths: [
          'Mentioned in ALL 3 AI models — maximum visibility',
          'Ranked #1 by GPT and #2 by Gemini',
          'USP verification highlighted as key differentiator',
          'Price point perceived as strong value proposition',
        ],
        weaknesses: [
          'Ranked #3 by Claude — behind Thorne and Pure Encapsulations',
          'Premium competitors positioned as higher quality in some models',
          'Could strengthen messaging around absorption/bioavailability',
        ],
      },
      insights: [
        'Glycinate/bisglycinate forms dominate AI recommendations for seniors — AI models strongly prefer chelated magnesium.',
        'Price transparency matters — all models included price ranges, suggesting AI considers value positioning.',
        'Third-party verification (USP, NSF) is a recurring recommendation driver across models.',
        'Brand reputation and reviews heavily influence AI recommendations, especially on Gemini.',
      ],
      recommendations: [
        'Strengthen product descriptions with bioavailability claims and clinical study references to improve positioning in Claude.',
        'Ensure USP/third-party certification is prominently featured in all listings and website content.',
        'Create content targeting "magnesium for seniors" with specific health benefits (bone health, sleep, heart) to reinforce topical authority.',
        'Monitor competitor content strategies — Thorne and Pure Encapsulations are gaining AI visibility through healthcare professional endorsements.',
        'Optimize for long-tail queries like "gentle magnesium for elderly" and "best absorbed magnesium for older adults" to capture niche AI recommendations.',
      ],
      categoryTrends: 'AI shopping assistants in the magnesium supplement category strongly favor chelated forms (glycinate, bisglycinate) over oxide or citrate for seniors. They prioritize gentle digestion, third-party testing, and bioavailability. Brand trust signals like USP verification and healthcare professional recommendations significantly boost AI visibility.',
    },
    meta: { modelsQueried: 3, modelsSucceeded: 3, timestamp: new Date().toISOString() },
  };
}

// ─── Start server ──────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  🔍 AEO Diagnostic running at http://localhost:${PORT}\n`);
});
