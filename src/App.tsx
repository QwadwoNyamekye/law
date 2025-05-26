import { useState, useEffect } from "react";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Loader2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

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

  const handleSend = async () => {
    if (!prompt.trim()) return;

    const newUserMessage = { role: "user", content: prompt };
    setChatHistory((prev) => [...prev, newUserMessage]);

    setPrompt("");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5001/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, sessionId }),
      });

      if (!res.ok) throw new Error("Server Error");

      const data = await res.json();
      const botMessage = { role: "assistant", content: data.response };
      setChatHistory((prev) => [...prev, botMessage]);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-black text-white p-4 text-2xl font-semibold text-center shadow-md">
        Nimdie Legal
      </header>
      <main className="flex-1 flex justify-center items-center px-4 py-6">
        <Card className="w-full h-full max-w-4xl flex flex-col p-6 shadow-lg rounded-2xl bg-gray-50">
          <div className="flex-1 overflow-y-auto space-y-4">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl max-w-xl ${msg.role === "user" ? "bg-blue-100 self-end text-right" : "bg-gray-200 self-start"}`}
              >
                <p className="whitespace-pre-line">{msg.content}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Textarea
              placeholder="Type your message..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mb-2"
            />
            <Button onClick={handleSend} disabled={loading || !prompt} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </div>
        </Card>
      </main>
    </div>
  );
}
