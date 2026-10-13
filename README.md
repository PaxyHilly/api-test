# Api test

A static UI for GitHub Pages that supports multiple providers and model lists.

## Features
- ChatGPT-style interface
- Settings tab for API keys
- Works with:
  - OpenAI
  - Groq
  - Hugging Face
  - Ollama
  - OpenRouter
  - Together AI
  - DeepSeek
  - custom OpenAI-compatible endpoints
- Connected models appear automatically on the left sidebar
- Model switching during chat
- Works as a static GitHub Pages app

## Deploy to GitHub Pages
1. Push these files to the root of your repository.
2. Go to the repository on GitHub.
3. Open Settings > Pages.
4. Set source to the default branch (`main` or `master`).
5. Save.
6. GitHub Pages will give you a URL.

## Important notes
- API keys are stored in `localStorage` in the browser.
- This is fine for demos and personal use, but not ideal for production.
- For real production use, keep keys on a backend or proxy server.

## Supported endpoint examples
- OpenAI: `https://api.openai.com/v1`
- Groq: `https://api.groq.com/openai/v1`
- Hugging Face Router: `https://router.huggingface.co/v1`
- OpenRouter: `https://openrouter.ai/api/v1`
- Together AI: `https://api.together.xyz/v1`
- DeepSeek: `https://api.deepseek.com/v1`
- Ollama: `http://localhost:11434`
- Custom OpenAI-compatible API: any compatible provider URL

## How to use
1. Open the app.
2. Go to Settings.
3. Add your API keys and base URLs.
4. Click Connect for each provider.
5. Select the model you want in the left sidebar.
6. Start chatting.

## README disclaimer
This project is intentionally a front-end demo. It lets you connect to real AI providers directly from the browser with your own keys.
