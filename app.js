const STORAGE_KEY = "ai-hub-chat-state-v1";

const defaultProviders = [
  {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    connected: false,
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    customModels: ""
  },
  {
    id: "groq",
    name: "Groq",
    type: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: "",
    connected: false,
    models: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
    customModels: ""
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    type: "hf",
    baseUrl: "https://router.huggingface.co/v1",
    apiKey: "",
    connected: false,
    models: [
      "meta-llama/Meta-Llama-3.1-8B-Instruct",
      "mistralai/Mistral-7B-Instruct-v0.2",
      "google/gemma-2-9b-it"
    ],
    customModels: ""
  },
  {
    id: "ollama",
    name: "Ollama",
    type: "ollama",
    baseUrl: "http://localhost:11434",
    apiKey: "",
    connected: false,
    models: ["llama3.1:8b", "mistral:7b", "qwen2.5:7b"],
    customModels: ""
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: "",
    connected: false,
    models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.1-8b-instruct"],
    customModels: ""
  },
  {
    id: "together",
    name: "Together AI",
    type: "together",
    baseUrl: "https://api.together.xyz/v1",
    apiKey: "",
    connected: false,
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "deepseek-ai/DeepSeek-V3"],
    customModels: ""
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "",
    connected: false,
    models: ["deepseek-chat", "deepseek-reasoner"],
    customModels: ""
  },
  {
    id: "custom",
    name: "Custom OpenAI-compatible API",
    type: "custom",
    baseUrl: "",
    apiKey: "",
    connected: false,
    models: ["your-model-name-here"],
    customModels: ""
  }
];

const state = loadState();
const conversation = [];

const els = {
  tabs: document.querySelectorAll(".tab"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  providerList: document.getElementById("provider-list"),
  modelList: document.getElementById("model-list"),
  messages: document.getElementById("messages"),
  chatForm: document.getElementById("chat-form"),
  messageInput: document.getElementById("message-input"),
  addProviderBtn: document.getElementById("add-provider-btn")
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        providers: structuredClone(defaultProviders),
        activeModelId: null
      };
    }

    const parsed = JSON.parse(raw);
    const providers = defaultProviders.map((provider) => {
      const saved = (parsed.providers || []).find((item) => item.id === provider.id);
      return saved ? { ...provider, ...saved } : provider;
    });

    return {
      providers,
      activeModelId: parsed.activeModelId || null
    };
  } catch (error) {
    return {
      providers: structuredClone(defaultProviders),
      activeModelId: null
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getConnectedModels() {
  const results = [];
  for (const provider of state.providers) {
    if (!provider.connected) continue;
    const models = Array.isArray(provider.models) ? provider.models : [];
    for (const model of models) {
      if (!model || !String(model).trim()) continue;
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        model,
        key: `${provider.id}:${model}`
      });
    }
  }
  return results;
}

function ensureActiveModel() {
  const connected = getConnectedModels();
  if (!connected.length) {
    state.activeModelId = null;
    saveState();
    return;
  }

  if (!state.activeModelId || !connected.some((item) => item.key === state.activeModelId)) {
    state.activeModelId = connected[0].key;
    saveState();
  }
}

function renderTabs(tabName = "chat") {
  els.tabs.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle("active", isActive);
  });

  els.tabPanels.forEach((panel) => {
    const isActive = panel.id === `${tabName}-tab`;
    panel.classList.toggle("active", isActive);
  });
}

function renderModelList() {
  ensureActiveModel();
  const connected = getConnectedModels();

  if (!connected.length) {
    els.modelList.innerHTML = `
      <div class="empty-state">
        No connected models yet. Add a key in the Settings tab.
      </div>
    `;
    return;
  }

  els.modelList.innerHTML = connected
    .map((item) => {
      const active = item.key === state.activeModelId ? "active" : "";
      return `
        <div class="model-card ${active}" data-model-key="${item.key}">
          <div class="model-card-header">
            <strong>${escapeHtml(item.model)}</strong>
            <small>${escapeHtml(item.providerName)}</small>
          </div>
          <small>Ready</small>
        </div>
      `;
    })
    .join("");

  els.modelList.querySelectorAll(".model-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.activeModelId = card.dataset.modelKey;
      saveState();
      renderModelList();
    });
  });
}

function renderProviderList() {
  els.providerList.innerHTML = state.providers
    .map((provider) => {
      const buttonText = provider.connected ? "Reconnect" : "Connect";
      return `
        <div class="provider-card">
          <div class="provider-header">
            <h4>${escapeHtml(provider.name)}</h4>
            <span class="status-badge ${provider.connected ? "connected" : "disconnected"}">
              ${provider.connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          <div class="provider-meta">
            <div class="input-row">
              <label>Base URL</label>
              <input data-field="baseUrl" value="${escapeHtml(provider.baseUrl || "")}" placeholder="https://..." />
            </div>

            <div class="input-row">
              <label>API key</label>
              <input type="password" data-field="apiKey" value="${escapeHtml(provider.apiKey || "")}" placeholder="Paste API key" />
            </div>

            <div class="input-row">
              <label>Models (comma separated)</label>
              <textarea data-field="customModels" rows="3" placeholder="model-a, model-b">${escapeHtml(provider.customModels || provider.models.join(", "))}</textarea>
            </div>
          </div>

          <div class="provider-actions">
            <button class="connect-btn" data-action="connect" data-provider-id="${provider.id}">${buttonText}</button>
            <button class="secondary-btn" data-action="clear" data-provider-id="${provider.id}">Clear</button>
          </div>
        </div>
      `;
    })
    .join("");

  els.providerList.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const providerCard = input.closest(".provider-card");
      const providerId = providerCard?.querySelector("[data-provider-id]")?.dataset.providerId;
      if (!providerId) return;

      const provider = state.providers.find((item) => item.id === providerId);
      if (!provider) return;

      const field = input.dataset.field;
      provider[field] = input.value;

      if (field === "customModels") {
        provider.models = input.value
          .split(",")
          .map((model) => model.trim())
          .filter(Boolean);
      }

      saveState();
      renderModelList();
    });
  });

  els.providerList.querySelectorAll("[data-action='connect']").forEach((button) => {
    button.addEventListener("click", async () => {
      await connectProvider(button.dataset.providerId);
    });
  });

  els.providerList.querySelectorAll("[data-action='clear']").forEach((button) => {
    button.addEventListener("click", () => {
      const provider = state.providers.find((item) => item.id === button.dataset.providerId);
      if (!provider) return;

      provider.apiKey = "";
      provider.baseUrl = provider.type === "ollama" ? "http://localhost:11434" : "";
      provider.models = provider.type === "ollama"
        ? ["llama3.1:8b", "mistral:7b"]
        : provider.type === "openai"
          ? ["gpt-4o-mini", "gpt-4o"]
          : provider.type === "groq"
            ? ["llama-3.1-8b-instant"]
            : provider.type === "hf"
              ? ["meta-llama/Meta-Llama-3.1-8B-Instruct"]
              : ["your-model-name-here"];
      provider.connected = false;
      provider.customModels = "";
      saveState();
      renderProviderList();
      renderModelList();
    });
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function fetchModelsFromEndpoint(provider) {
  const baseUrl = (provider.baseUrl || "").replace(/\/+$/, "");
  const apiKey = provider.apiKey?.trim();

  if (!baseUrl) {
    throw new Error("Base URL is required.");
  }

  if (provider.type === "ollama") {
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) {
      throw new Error(`Ollama is unreachable (${res.status}).`);
    }
    const data = await res.json();
    return Array.isArray(data?.models) ? data.models.map((model) => model.name).filter(Boolean) : [];
  }

  if (!apiKey) {
    throw new Error("API key is required.");
  }

  const res = await fetch(`${baseUrl}/models`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Model fetch failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  if (Array.isArray(data?.data)) {
    return data.data.map((model) => model.id).filter(Boolean);
  }

  if (Array.isArray(data?.models)) {
    return data.models.map((model) => typeof model === "string" ? model : model.id).filter(Boolean);
  }

  return [];
}

async function connectProvider(providerId) {
  const provider = state.providers.find((item) => item.id === providerId);
  if (!provider) return;

  try {
    provider.connected = false;
    saveState();
    renderProviderList();

    let models = [];
    if (provider.type === "ollama") {
      models = await fetchModelsFromEndpoint(provider);
    } else {
      models = await fetchModelsFromEndpoint(provider);
    }

    if (provider.customModels?.trim()) {
      const custom = provider.customModels
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      if (custom.length) models = [...new Set([...models, ...custom])];
    }

    if (!models.length) {
      throw new Error("No models were returned from the API. Check your key and endpoint.");
    }

    provider.models = [...new Set(models)];
    provider.connected = true;
    provider.customModels = provider.models.join(", ");
    saveState();
    renderProviderList();
    renderModelList();
  } catch (error) {
    provider.connected = false;
    saveState();
    renderProviderList();
    renderModelList();
    alert(error.message || "Unable to connect provider.");
  }
}

function getSelectedModel() {
  ensureActiveModel();
  const connected = getConnectedModels();
  const selected = connected.find((item) => item.key === state.activeModelId) || connected[0];
  if (!selected) return null;

  const provider = state.providers.find((item) => item.id === selected.providerId);
  if (!provider) return null;

  return {
    ...selected,
    provider
  };
}

async function callOpenAICompatibleAPI(provider, messages, selectedModel) {
  const baseUrl = (provider.baseUrl || "").replace(/\/+$/, "");
  const endpoint = `${baseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callOllama(provider, messages, selectedModel) {
  const baseUrl = (provider.baseUrl || "http://localhost:11434").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedModel,
      messages,
      stream: false
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data?.message?.content || "";
}

async function sendToProvider(provider, messages, selectedModel) {
  if (provider.type === "ollama") {
    return callOllama(provider, messages, selectedModel);
  }
  return callOpenAICompatibleAPI(provider, messages, selectedModel);
}

function renderConversation() {
  els.messages.innerHTML = "";
  conversation.forEach((message) => {
    const element = document.createElement("div");
    element.className = `message ${message.role}`;
    element.textContent = message.content;
    els.messages.appendChild(element);
  });
  els.messages.scrollTop = els.messages.scrollHeight;
}

async function handleSend(event) {
  event.preventDefault();
  const text = els.messageInput.value.trim();
  if (!text) return;

  const selected = getSelectedModel();
  if (!selected) {
    alert("Connect at least one provider in Settings before sending a message.");
    return;
  }

  if (!selected.provider.connected) {
    alert("This provider is not connected. Reconnect it in Settings.");
    return;
  }

  conversation.push({ role: "user", content: text });
  renderConversation();
  els.messageInput.value = "";

  const assistantBubble = document.createElement("div");
  assistantBubble.className = "message assistant";
  assistantBubble.textContent = "Thinking...";
  els.messages.appendChild(assistantBubble);
  els.messages.scrollTop = els.messages.scrollHeight;

  try {
    const messages = conversation.slice(-12).map((message) => ({
      role: message.role,
      content: message.content
    }));

    const answer = await sendToProvider(selected.provider, messages, selected.model);

    conversation.push({ role: "assistant", content: answer || "" });
    renderConversation();
  } catch (error) {
    conversation.push({ role: "assistant", content: `Error: ${error.message}` });
    renderConversation();
  }
}

els.tabs.forEach((button) => {
  button.addEventListener("click", () => renderTabs(button.dataset.tab));
});

els.addProviderBtn.addEventListener("click", () => {
  const newId = `custom-${Date.now()}`;
  state.providers.push({
    id: newId,
    name: "Custom provider",
    type: "custom",
    baseUrl: "",
    apiKey: "",
    connected: false,
    models: ["your-model-name-here"],
    customModels: ""
  });
  saveState();
  renderProviderList();
});

els.chatForm.addEventListener("submit", handleSend);

els.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    els.chatForm.requestSubmit();
  }
});

renderTabs("chat");
renderProviderList();
renderModelList();
