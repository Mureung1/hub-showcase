import openaiProvider from './openaiProvider.js';

const providers = {
  openai: openaiProvider,
};

export function getProvider(name = 'openai') {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`알 수 없는 LLM provider: ${name}`);
  }
  return provider;
}
