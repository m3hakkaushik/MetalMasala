// [L43] Integrating AI Services: Mock Provider Adapter for Offline Development & Tests

export const mockAdapter = {
  name: 'mock',

  async generate({ _system, messages, candidates = [], mode = 'stylist' }) {
    if (mode === 'describe') {
      return {
        text: JSON.stringify({
          tagline: 'Timeless Indian heritage crafted for modern grace.',
          description:
            'Hand-finished with authentic artisanal techniques. Each detail reflects centuries of jewellery craftsmanship, designed to elevate both festive celebrations and everyday elegance.',
        }),
      };
    }

    // Stylist mode
    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === 'user')?.content?.toLowerCase() || '';

    // Match candidate products based on query intent
    let matched = candidates.filter((p) => {
      const matchName = p.name && lastUserMessage.includes(p.name.toLowerCase());
      const matchTag = p.tags && p.tags.some((t) => lastUserMessage.includes(t.toLowerCase()));
      const matchFinish = p.finish && lastUserMessage.includes(p.finish.toLowerCase());
      const matchMaterial = p.material && lastUserMessage.includes(p.material.toLowerCase());
      return matchName || matchTag || matchFinish || matchMaterial;
    });

    if (matched.length === 0) {
      matched = candidates.slice(0, 3);
    } else {
      matched = matched.slice(0, 3);
    }

    const selectedIds = matched.map((p) => p.id || p._id?.toString());

    let reply = 'Arre wah! I handpicked these gorgeous pieces that match your vibe perfectly.';
    if (lastUserMessage.includes('festive') || lastUserMessage.includes('wedding')) {
      reply =
        'Looking radiant for the celebrations! These handcrafted heritage designs bring just the right amount of royal drama.';
    } else if (lastUserMessage.includes('college') || lastUserMessage.includes('everyday')) {
      reply =
        'Lightweight, effortless, and full of character! These stunners are perfect for 9 a.m. lectures and chai breaks.';
    } else if (lastUserMessage.includes('silver') || lastUserMessage.includes('oxidized')) {
      reply =
        'Nothing beats the vintage allure of oxidized silver! Here are our finest hand-finished statement pieces for you.';
    }

    return {
      text: JSON.stringify({
        reply,
        productIds: selectedIds,
      }),
    };
  },
};

export default mockAdapter;
