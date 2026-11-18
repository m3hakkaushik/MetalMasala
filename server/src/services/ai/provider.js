import config from '../../config/index.js';
import mockAdapter from './adapters/mock.js';
import geminiAdapter from './adapters/gemini.js';

// [L43] Integrating AI Services: Provider Interface & Dispatcher
export function getAiProvider() {
  const { provider, apiKey, model } = config.ai;

  if (provider === 'gemini' && apiKey) {
    return {
      name: 'gemini',
      async generate(options) {
        return geminiAdapter.generate({ ...options, apiKey, model: model || 'gemini-1.5-flash' });
      },
    };
  }

  // Fallback to offline deterministic mock provider
  return {
    name: 'mock',
    async generate(options) {
      return mockAdapter.generate(options);
    },
  };
}

export default { getAiProvider };
