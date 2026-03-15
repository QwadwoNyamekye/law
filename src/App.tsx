import { useState, useEffect } from "react";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Loader2, Bot } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const API_BASE = "https://law-project-backend.fly.dev";

type ModelOption = { id: string; name: string };
type ProviderOption = { id: string; name: string; models: ModelOption[] };

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
};

export default function App() {
  type Message = {
    role: string;
    content: string;
  };
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");

  useEffect(() => {
    const savedSession = localStorage.getItem("chat_session_id");
    if (savedSession) {
      setSessionId(savedSession);
    } else {
      const newSession = uuidv4();
      localStorage.setItem("chat_session_id", newSession);
      setSessionId(newSession);
    }
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/models`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Failed to load models")))
      .then((data: { providers: ProviderOption[] }) => {
        setProviders(data.providers || []);
        if (data.providers?.length && !selectedProvider) {
          const first = data.providers[0];
          setSelectedProvider(first.id);
          if (first.models?.length) setSelectedModel(first.models[0].id);
        }
      })
      .catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    if (selectedProvider && providers.length) {
      const provider = providers.find((p) => p.id === selectedProvider);
      const models = provider?.models ?? [];
      if (models.length && !models.some((m) => m.id === selectedModel)) {
        setSelectedModel(models[0].id);
      }
    }
  }, [selectedProvider, providers, selectedModel]);

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const newUserMessage = { role: "user", content: prompt };
    setChatHistory((prev) => [...prev, newUserMessage]);

    setPrompt("");
    setLoading(true);
    setError("");

    try {
      const body: {
        prompt: string;
        session_id?: string;
        provider?: string;
        model?: string;
      } = { prompt };
      if (sessionId) body.session_id = sessionId;
      if (selectedProvider && selectedModel) {
        body.provider = selectedProvider;
        body.model = selectedModel;
      }

      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Server error");
      }

      const botMessage = { role: "assistant", content: data.response };
      setChatHistory((prev) => [...prev, botMessage]);
      if (data.session_id) setSessionId(data.session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const currentModelLabel =
    selectedProvider && selectedModel
      ? providers
          .find((p) => p.id === selectedProvider)
          ?.models.find((m) => m.id === selectedModel)
          ?.name ?? `${selectedProvider} / ${selectedModel}`
      : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <img
        src="/Nimdie Legal - Banner.svg"
        alt="Nimdie Legal Banner"
        className="w-full h-1/5"
      />
      <header className="bg-black text-white p-4 text-2xl font-semibold text-center shadow-md">
        Nimdie Legal
      </header>

      <main className="flex-1 flex justify-center items-center px-4 py-6">
        <Card className="w-full h-full max-w-4xl flex flex-col p-6 shadow-lg rounded-2xl bg-gray-50">
          {/* Provider switcher: ChatGPT | Claude | Gemini */}
          {providers.length > 0 && (
            <section className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="h-4 w-4 text-gray-600" aria-hidden />
                <span className="text-sm font-semibold text-gray-700">AI provider</span>
                {currentModelLabel && (
                  <span className="text-xs text-gray-500">· {currentModelLabel}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {providers.map((provider) => {
                  const displayName = PROVIDER_DISPLAY_NAMES[provider.id] ?? provider.name;
                  const isSelected = selectedProvider === provider.id;
                  return (
                    <Button
                      key={provider.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="default"
                      onClick={() => {
                        setSelectedProvider(provider.id);
                        if (provider.models?.length) setSelectedModel(provider.models[0].id);
                      }}
                      className="min-w-[100px]"
                    >
                      {displayName}
                    </Button>
                  );
                })}
              </div>
              {/* Model options for selected provider */}
              {selectedProvider && (() => {
                const provider = providers.find((p) => p.id === selectedProvider);
                const models = provider?.models ?? [];
                if (models.length <= 1) return null;
                return (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Model:</span>
                    {models.map((model) => {
                      const isSelected = selectedModel === model.id;
                      return (
                        <Button
                          key={model.id}
                          type="button"
                          variant={isSelected ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedModel(model.id)}
                        >
                          {model.name}
                        </Button>
                      );
                    })}
                  </div>
                );
              })()}
            </section>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 min-h-[120px]">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl max-w-xl ${
                  msg.role === "user"
                    ? "bg-blue-100 ml-auto text-right"
                    : "bg-gray-200"
                }`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="mb-2 text-gray-700 text-lg font-medium">
              Ask your legal question below. Our AI assistant will respond with helpful insights
              based on current legal understanding.
            </p>
            <Textarea
              placeholder="Type your message..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mb-2"
            />
            <Button
              onClick={handleSend}
              disabled={loading || !prompt.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>
            {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
          </div>
        </Card>
      </main>
    </div>
  );
}
