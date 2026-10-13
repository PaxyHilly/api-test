const STORAGE_KEY = "ai-hub-chat-state-v1";

const defaultProviders = [
  { id: "openai", name: "OpenAI", type: "openai", baseUrl: "https://api.openai.com/v1", apiKey: "", connected: false, models: ["gpt-4o-mini", "gpt-4o"], customModels: "" },
  { id: "groq", name: "Groq", type: "groq", baseUrl: "https://api.groq.com/openai/v1", apiKey: "", connected: false, models: ["llama-3.1-8b-instant"], customModels: "" },
  { id: "huggingface", name: "Hugging Face", type: "hf", baseUrl: "https://router.huggingface.co/v1", apiKey: "", connected: false, models: ["meta-llama/Meta-Llama-3.1-8B-Instruct"], customModels: "" },
  { id: "ollama", name: "Ollama", type: "ollama", baseUrl: "http://localhost:11434", apiKey: "", connected: false, models: ["llama3.1:8b"], customModels: "" },
  { id: "together", name: "Together AI", type: "together", baseUrl: "https://api.together.xyz/v1", apiKey: "", connected: false, models: [], customModels: "" },
  { id: "custom", name: "Custom OpenAI-compatible API", type: "custom", baseUrl: "", apiKey: "", connected: false, models: ["your-model-name-here"], customModels: "" }
];

let state = loadState();
let conversation = [];
let attachmentsBuffer = [];

const els = {
  tabs: document.querySelectorAll(".tab"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  providerList: document.getElementById("provider-list"),
  modelList: document.getElementById("model-list"),
  messages: document.getElementById("messages"),
  chatForm: document.getElementById("chat-form"),
  messageInput: document.getElementById("message-input"),
  addProviderBtn: document.getElementById("add-provider-btn"),
  attachBtn: document.getElementById("attach-btn"),
  fileInput: document.getElementById("file-input"),
  attachmentsEl: document.getElementById("attachments")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { providers: structuredClone(defaultProviders), activeModelId: null };
    const parsed = JSON.parse(raw);
    const providers = defaultProviders.map((p) => {
      const saved = (parsed.providers || []).find((x) => x.id === p.id);
      return saved ? { ...p, ...saved } : p;
    });
    return { providers, activeModelId: parsed.activeModelId || null };
  } catch (e) {
    return { providers: structuredClone(defaultProviders), activeModelId: null };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getConnectedModels() {
  const out = [];
  for (const provider of state.providers) {
    if (!provider.connected) continue;
    const models = Array.isArray(provider.models) ? provider.models : [];
    for (const m of models) {
      if (!m) continue;
      out.push({ providerId: provider.id, providerName: provider.name, model: m, key: `${provider.id}:${m}` });
    }
  }
  return out;
}

function ensureActiveModel() {
  const connected = getConnectedModels();
  if (!connected.length) { state.activeModelId = null; saveState(); return; }
  if (!state.activeModelId || !connected.some((c) => c.key === state.activeModelId)) {
    state.activeModelId = connected[0].key; saveState();
  }
}

function renderTabs(tabName = "chat") {
  els.tabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
  els.tabPanels.forEach((p) => p.classList.toggle("active", p.id === `${tabName}-tab`));
}

function renderModelList() {
  ensureActiveModel();
  const connected = getConnectedModels();
  if (!connected.length) {
    els.modelList.innerHTML = `<div class="empty-state">No connected models yet. Add a key in Settings.</div>`; return;
  }
  els.modelList.innerHTML = connected.map((item) => {
    const active = item.key === state.activeModelId ? 'active' : '';
    return `<div class="model-card ${active}" data-model-key="${item.key}"><div class="model-card-header"><strong>${escapeHtml(item.model)}</strong><small>${escapeHtml(item.providerName)}</small></div><small>Ready</small></div>`;
  }).join("");
  els.modelList.querySelectorAll('.model-card').forEach((card) => { card.addEventListener('click', () => { state.activeModelId = card.dataset.modelKey; saveState(); renderModelList(); }); });
}

function renderProviderList() {
  els.providerList.innerHTML = state.providers.map((provider) => {
    const buttonText = provider.connected ? 'Reconnect' : 'Connect';
    return `
      <div class="provider-card">
        <div class="provider-header">
          <h4>${escapeHtml(provider.name)}</h4>
          <span class="status-badge ${provider.connected ? 'connected' : 'disconnected'}">${provider.connected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div class="provider-meta">
          <div class="input-row"><label>Base URL</label><input data-field="baseUrl" value="${escapeHtml(provider.baseUrl || '')}" placeholder="https://..." /></div>
          <div class="input-row"><label>API key</label><input type="password" data-field="apiKey" value="${escapeHtml(provider.apiKey || '')}" placeholder="Paste API key" /></div>
          <div class="input-row"><label>Models (comma separated)</label><textarea data-field="customModels" rows="3" placeholder="model-a, model-b">${escapeHtml(provider.customModels || provider.models.join(', '))}</textarea></div>
        </div>
        <div class="provider-actions">
          <button class="connect-btn" data-action="connect" data-provider-id="${provider.id}">${buttonText}</button>
          <button class="secondary-btn" data-action="clear" data-provider-id="${provider.id}">Clear</button>
        </div>
      </div>
    `;
  }).join('');

  els.providerList.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', () => {
      const providerId = input.closest('.provider-card')?.querySelector('[data-provider-id]')?.dataset.providerId;
      if (!providerId) return;
      const provider = state.providers.find((p) => p.id === providerId);
      if (!provider) return;
      const field = input.dataset.field;
      provider[field] = input.value;
      if (field === 'customModels') provider.models = input.value.split(',').map(s => s.trim()).filter(Boolean);
      saveState(); renderModelList();
    });
  });

  els.providerList.querySelectorAll('[data-action="connect"]').forEach((button) => { button.addEventListener('click', async () => connectProvider(button.dataset.providerId)); });
  els.providerList.querySelectorAll('[data-action="clear"]').forEach((button) => { button.addEventListener('click', () => {
    const provider = state.providers.find((p) => p.id === button.dataset.providerId);
    if (!provider) return;
    provider.apiKey = '';
    provider.baseUrl = provider.type === 'ollama' ? 'http://localhost:11434' : provider.type === 'together' ? 'https://api.together.xyz/v1' : '';
    provider.models = provider.type === 'openai' ? ['gpt-4o-mini'] : provider.type === 'groq' ? ['llama-3.1-8b-instant'] : provider.type === 'hf' ? ['meta-llama/Meta-Llama-3.1-8B-Instruct'] : provider.type === 'ollama' ? ['llama3.1:8b'] : ['your-model-name-here'];
    provider.connected = false; provider.customModels = '';
    saveState(); renderProviderList(); renderModelList();
  }); });
}

function escapeHtml(str = '') { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }

async function fetchModelsFromEndpoint(provider) {
  const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
  const apiKey = (provider.apiKey || '').trim();
  if (provider.type === 'ollama') {
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama unreachable (${res.status})`);
    const data = await res.json();
    return Array.isArray(data?.models) ? data.models.map(m => m.name) : [];
  }
  if (!apiKey) throw new Error('API key is required.');
  const res = await fetch(`${baseUrl}/models`, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` } });
  if (!res.ok) { const body = await res.text(); throw new Error(`Model fetch failed (${res.status}): ${body}`); }
  const data = await res.json();
  if (Array.isArray(data?.data)) return data.data.map(m => m.id).filter(Boolean);
  if (Array.isArray(data?.models)) return data.models.map(m => typeof m === 'string' ? m : m.id).filter(Boolean);
  return [];
}

async function connectProvider(providerId) {
  const provider = state.providers.find(p => p.id === providerId);
  if (!provider) return;
  try {
    provider.connected = false; saveState(); renderProviderList();
    const models = await fetchModelsFromEndpoint(provider);
    let merged = models;
    if (provider.customModels?.trim()) merged = [...new Set([...merged, ...provider.customModels.split(',').map(s=>s.trim())])];
    if (!merged.length) throw new Error('No models returned. Check key/endpoint.');
    provider.models = merged; provider.connected = true; provider.customModels = provider.models.join(', ');
    saveState(); renderProviderList(); renderModelList();
  } catch (err) {
    provider.connected = false; saveState(); renderProviderList(); renderModelList(); alert(err.message || 'Unable to connect provider.');
  }
}

function getSelectedModel() {
  ensureActiveModel();
  const connected = getConnectedModels();
  const selected = connected.find(c => c.key === state.activeModelId) || connected[0];
  if (!selected) return null; const provider = state.providers.find(p => p.id === selected.providerId); if (!provider) return null; return { ...selected, provider };
}

async function callOpenAICompatibleAPI(provider, messages, selectedModel, attachments=[]) {
  const baseUrl = (provider.baseUrl || '').replace(/\/+$/, '');
  const endpoint = `${baseUrl}/chat/completions`;
  const body = { model: selectedModel, messages, temperature: 0.7 };
  if (attachments && attachments.length) {
    // include attachments as inline metadata; many providers will ignore it but it's available for proxies/backends
    body.attachments = attachments.map(a => ({ name: a.name, type: a.type, data: a.base64 }));
  }
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` }, body: JSON.stringify(body) });
  if (!res.ok) { const text = await res.text(); throw new Error(`API request failed (${res.status}): ${text}`); }
  const data = await res.json(); return data?.choices?.[0]?.message?.content || '';
}

async function callOllama(provider, messages, selectedModel, attachments=[]) {
  const baseUrl = (provider.baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
  const body = { model: selectedModel, messages, stream: false };
  if (attachments.length) body.attachments = attachments.map(a => ({ name: a.name, type: a.type, data: a.base64 }));
  const res = await fetch(`${baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) { const text = await res.text(); throw new Error(`Ollama request failed (${res.status}): ${text}`); }
  const data = await res.json(); return data?.message?.content || '';
}

async function sendToProvider(provider, messages, selectedModel, attachments=[]) {
  if (provider.type === 'ollama') return callOllama(provider, messages, selectedModel, attachments);
  return callOpenAICompatibleAPI(provider, messages, selectedModel, attachments);
}

function renderConversation() {
  els.messages.innerHTML = '';
  conversation.forEach((m) => {
    const el = document.createElement('div'); el.className = `message ${m.role}`;
    if (m.attachments && m.attachments.length) {
      const frag = document.createDocumentFragment();
      const text = document.createElement('div'); text.textContent = m.content; frag.appendChild(text);
      m.attachments.forEach((att) => {
        if (att.type.startsWith('image/')) {
          const img = document.createElement('img'); img.src = att.dataUrl; img.className = 'attachment-preview'; img.style.maxWidth = '320px'; img.style.borderRadius = '8px'; img.style.marginTop = '8px'; frag.appendChild(img);
        } else {
          const link = document.createElement('a'); link.href = att.dataUrl; link.download = att.name; link.textContent = `Download ${att.name}`; link.style.display = 'block'; link.style.marginTop = '6px'; frag.appendChild(link);
        }
      });
      el.appendChild(frag);
    } else {
      el.textContent = m.content;
    }
    els.messages.appendChild(el);
  });
  els.messages.scrollTop = els.messages.scrollHeight;
}

function appendSystemMessage(role, content, attachments=[]) {
  conversation.push({ role, content, attachments }); renderConversation();
}

async function handleSend(e) {
  e.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text && !attachmentsBuffer.length) return;
  const selected = getSelectedModel();
  if (!selected) { alert('Connect at least one provider in Settings before sending a message.'); return; }
  if (!selected.provider.connected) { alert('This provider is not connected. Reconnect it in Settings.'); return; }

  // include attachments metadata in conversation
  const toSendAttachments = attachmentsBuffer.map(a => ({ name: a.name, type: a.type, base64: a.base64, dataUrl: a.dataUrl }));
  conversation.push({ role: 'user', content: text || '(attachment)', attachments: toSendAttachments });
  renderConversation();
  els.messageInput.value = '';
  clearAttachmentsBuffer();

  const assistantPlaceholder = { role: 'assistant', content: 'Thinking...', attachments: [] };
  conversation.push(assistantPlaceholder); renderConversation();

  try {
    const messages = conversation.slice(-24).map(m => ({ role: m.role, content: m.content }));
    const answer = await sendToProvider(selected.provider, messages, selected.model, toSendAttachments);
    // replace last assistant placeholder
    conversation = conversation.slice(0, -1);
    conversation.push({ role: 'assistant', content: answer || '', attachments: [] });
    renderConversation();
  } catch (err) {
    conversation = conversation.slice(0, -1);
    conversation.push({ role: 'assistant', content: `Error: ${err.message}`, attachments: [] });
    renderConversation();
  }
}

function renderAttachmentsBuffer() {
  els.attachmentsEl.innerHTML = '';
  attachmentsBuffer.forEach((att, idx) => {
    const wrap = document.createElement('div'); wrap.className = 'attachment';
    if (att.type.startsWith('image/')) {
      const img = document.createElement('img'); img.className = 'preview'; img.src = att.dataUrl; wrap.appendChild(img);
    }
    const meta = document.createElement('div'); meta.style.display = 'flex'; meta.style.flexDirection = 'column';
    const name = document.createElement('div'); name.textContent = att.name; name.style.fontSize = '0.85rem'; meta.appendChild(name);
    const size = document.createElement('div'); size.textContent = `${Math.round(att.size/1024)} KB`; size.style.fontSize = '0.75rem'; size.style.color = 'var(--muted)'; meta.appendChild(size);
    const remove = document.createElement('button'); remove.className = 'secondary-btn'; remove.textContent = 'Remove'; remove.style.marginLeft = '8px'; remove.addEventListener('click', () => { attachmentsBuffer.splice(idx,1); renderAttachmentsBuffer(); });
    wrap.appendChild(meta); wrap.appendChild(remove);
    els.attachmentsEl.appendChild(wrap);
  });
}

function clearAttachmentsBuffer() { attachmentsBuffer = []; renderAttachmentsBuffer(); }

els.attachBtn.addEventListener('click', () => els.fileInput.click());
els.fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  const MAX_BYTES = 4 * 1024 * 1024; // 4MB per file limit
  for (const f of files) {
    if (f.size > MAX_BYTES) { alert(`File ${f.name} is too large (max 4MB).`); continue; }
    const dataUrl = await readFileAsDataURL(f);
    const base64 = dataUrl.split(',')[1] || '';
    attachmentsBuffer.push({ name: f.name, type: f.type || 'application/octet-stream', size: f.size, dataUrl, base64 });
  }
  renderAttachmentsBuffer();
  // reset file input to allow re-upload of same file later
  els.fileInput.value = '';
});

function readFileAsDataURL(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }

els.chatForm.addEventListener('submit', handleSend);
els.messageInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); els.chatForm.requestSubmit(); } });
els.tabs.forEach((b) => b.addEventListener('click', () => renderTabs(b.dataset.tab)));
els.addProviderBtn.addEventListener('click', () => { const id = `custom-${Date.now()}`; state.providers.push({ id, name: 'Custom provider', type: 'custom', baseUrl: '', apiKey: '', connected: false, models: ['your-model-name-here'], customModels: '' }); saveState(); renderProviderList(); });

// initial render
renderTabs('chat'); renderProviderList(); renderModelList();
