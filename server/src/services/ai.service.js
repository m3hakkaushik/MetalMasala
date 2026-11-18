import { ERROR_CODES as codes, FINISHES, MATERIALS, TAGS } from '../config/constants.js';
import { getAiProvider } from './ai/provider.js';
import Product from '../models/Product.js';
import { AppError } from '../utils/AppError.js';
import { debugData } from '../utils/logger.js';

// [L43] Integrating AI Services (Masala Stylist & AI Copywriter)

export const aiService = {
  /**
   * Masala Stylist: Retrieves catalogue candidates, prompts LLM, and enforces allowlist verification.
   */
  async stylist({ message, history = [] }) {
    if (!message || typeof message !== 'string') {
      throw new AppError(422, codes.VALIDATION_ERROR, 'Message is required');
    }
    if (message.length > 500) {
      throw new AppError(422, codes.VALIDATION_ERROR, 'Message exceeds 500 character limit');
    }
    if (Array.isArray(history) && history.length > 6) {
      history = history.slice(-6);
    }

    const startTime = Date.now();
    const provider = getAiProvider();

    // 1. Candidate Retrieval: Infer search keywords and price filters
    const query = { stock: { $gt: 0 } };
    const lower = message.toLowerCase();

    // Check for budget constraints in message (e.g. "under 1000", "below 1500")
    const budgetMatch = lower.match(/(?:under|below|less than|within|upto|up to)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
    if (budgetMatch && budgetMatch[1]) {
      query.price = { $lte: Number(budgetMatch[1]) };
    }

    // Match materials, finishes, or tags mentioned in user prompt
    const mentionedFinishes = FINISHES.filter((f) => lower.includes(f.replace('-', ' ')) || lower.includes(f));
    const mentionedMaterials = MATERIALS.filter((m) => lower.includes(m.replace('-', ' ')) || lower.includes(m));
    const mentionedTags = TAGS.filter((t) => lower.includes(t.replace('-', ' ')) || lower.includes(t));

    if (mentionedFinishes.length > 0) query.finish = { $in: mentionedFinishes };
    if (mentionedMaterials.length > 0) query.material = { $in: mentionedMaterials };
    if (mentionedTags.length > 0) query.tags = { $in: mentionedTags };

    // Fetch up to 12 candidate products
    let candidates = await Product.find(query)
      .select('name slug price tags finish material tagline images stock')
      .limit(12)
      .lean();

    // If filter too narrow, fallback to featured products
    if (candidates.length === 0) {
      candidates = await Product.find({ stock: { $gt: 0 } })
        .select('name slug price tags finish material tagline images stock')
        .sort({ isFeatured: -1, ratingAverage: -1 })
        .limit(12)
        .lean();
    }

    const candidateIds = new Set(candidates.map((c) => c._id.toString()));
    const candidateSummary = candidates.map((c) => ({
      id: c._id.toString(),
      name: c.name,
      price: c.price,
      finish: c.finish,
      material: c.material,
      tags: c.tags,
      tagline: c.tagline,
    }));

    // 2. Generate with LLM / Provider
    const systemPrompt = `You are the "Masala Stylist" at Metal मसाला, an authentic handcrafted Indian jewellery house.
Your voice is warm, knowledgeable, concise, and lightly seasoned with affectionate Indian English / Hinglish (e.g. 'Arre wah!', 'jhumka lover', 'festive stunner').
CRITICAL SAFETY & CONTRACT RULES:
1. You may ONLY recommend products that are explicitly provided in the CANDIDATE LIST below. Never invent, hallucinate, or reference outside products.
2. Return strictly valid JSON with this exact schema:
{
  "reply": "Your warm styling advice and recommendation text (under 60 words)",
  "productIds": ["id1", "id2"]
}
3. The "productIds" array must contain ONLY valid string IDs from the CANDIDATE LIST.

CANDIDATE LIST:
${JSON.stringify(candidateSummary)}`;

    const messages = [
      ...history,
      { role: 'user', content: message },
    ];

    let resultText = '';
    try {
      const response = await provider.generate({
        system: systemPrompt,
        messages,
        candidates,
        mode: 'stylist',
      });
      resultText = response.text;
    } catch (err) {
      debugData('AI stylist provider error: %s', err.message);
      throw new AppError(503, codes.AI_UNAVAILABLE, 'AI Stylist service is temporarily unavailable');
    }

    // 3. Verify & Allowlist: Parse safely and drop hallucinated IDs
    let parsed = null;
    try {
      // Extract json block if wrapped in markdown
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(resultText);
      }
    } catch {
      // Fallback on JSON parse error
      parsed = {
        reply: 'Here are our handpicked handcrafted pieces that match your style beautifully.',
        productIds: candidates.slice(0, 3).map((c) => c._id.toString()),
      };
    }

    // Strict allowlist validation
    const rawIds = Array.isArray(parsed.productIds) ? parsed.productIds : [];
    const validIds = rawIds.filter((id) => candidateIds.has(String(id)));

    // Fetch full product objects for allowlisted products
    const recommendedProducts = candidates
      .filter((c) => validIds.includes(c._id.toString()))
      .map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        price: c.price,
        image: c.images?.[0]?.url || '',
        tagline: c.tagline,
        finish: c.finish,
        material: c.material,
        tags: c.tags,
      }));

    const duration = Date.now() - startTime;
    debugData('AI Stylist request completed in %d ms using provider: %s', duration, provider.name);

    return {
      reply: parsed.reply || 'Here are our recommended jewellery pieces for you.',
      products: recommendedProducts,
      provider: provider.name,
    };
  },

  /**
   * AI Copywriter: Generates brand tagline and product description (Manager+).
   */
  async describe({ name, category, material, finish, tags = [], notes = '' }) {
    if (!name) {
      throw new AppError(422, codes.VALIDATION_ERROR, 'Product name is required for description');
    }

    const provider = getAiProvider();
    const systemPrompt = `You are the lead product copywriter for Metal मसाला.
Write evocative, sensory, and authentic jewellery copy in the brand voice (warm, artisanal, poetic yet accessible).
Return strictly valid JSON:
{
  "tagline": "A punchy, memorable one-liner under 15 words",
  "description": "Artisanal product description under 85 words highlighting the metal craft, silhouette, and occasion styling"
}`;

    const promptMessage = `Product: ${name}
Category: ${category || 'Jewellery'}
Material: ${material || 'Brass'}
Finish: ${finish || 'Oxidized silver'}
Tags: ${Array.isArray(tags) ? tags.join(', ') : tags}
Notes: ${notes}`;

    let resultText = '';
    try {
      const response = await provider.generate({
        system: systemPrompt,
        messages: [{ role: 'user', content: promptMessage }],
        mode: 'describe',
      });
      resultText = response.text;
    } catch {
      throw new AppError(503, codes.AI_UNAVAILABLE, 'AI Copywriter service is temporarily unavailable');
    }

    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(resultText);
      return {
        tagline: parsed.tagline || 'Handcrafted Indian jewellery with timeless charm.',
        description:
          parsed.description ||
          'Expertly sculpted by heritage artisans. Featuring hand-finished oxidation and authentic regional design detailing.',
      };
    } catch {
      return {
        tagline: 'Artisanal elegance for every occasion.',
        description:
          'Expertly handcrafted with traditional Indian metalcraft techniques. Perfect for celebrating festivals, weddings, and everyday grace.',
      };
    }
  },
};

export default aiService;
