import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import api from "../../../utils/api";
import { useAuth } from "../../../contexts/AuthContext/AuthContext";
import { useNegotiation } from "../../../contexts/NegotiationContext/NegotiationContext";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

// role-appropriate fallback links
const JOBS_LINK: Record<string, string> = { business: "/business/jobs", regular: "/my-jobs" };
const BROWSE_LINK: Record<string, string> = { business: "/business/jobs", regular: "/jobs" };

interface NegotiationData {
  id: number;
  status: string;
  expiresAt: string;
  job: {
    id: number;
    position_type: { name: string };
    // business may be omitted when the viewer is the business itself
    business?: { business_name: string };
    salary_min: number;
    salary_max: number;
    start_time: string;
    end_time: string;
  };
  user: { id: number; first_name: string; last_name: string };
  decisions: { candidate: string | null; business: string | null };
}

interface ChatMessage {
  negotiation_id: number;
  sender: { role: string; id: number };
  text: string;
  createdAt: string;
}

// format seconds remaining as mm:ss
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function Negotiation() {
  const { user, token, role } = useAuth();
  const { setHasActiveNeg } = useNegotiation();
  // safe cast — guard undefined case
  const myId = (user as Record<string, unknown> | null)?.id as number | undefined;

  const [negotiation, setNegotiation] = useState<NegotiationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  // seconds until negotiation expires
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  // fetch current negotiation
  useEffect(() => {
    async function loadNegotiation() {
      try {
        const res = await api.get("/negotiations/me");
        setNegotiation(res.data);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
          setHasActiveNeg(false);
        }
      } finally {
        setLoading(false);
      }
    }
    loadNegotiation();
  }, [setHasActiveNeg]);

  // countdown timer — ticks every second while negotiation is active
  useEffect(() => {
    if (!negotiation || negotiation.status !== "active") {
      setSecondsLeft(null);
      return;
    }

    function tick() {
      const remaining = Math.max(
        0,
        Math.floor((new Date(negotiation!.expiresAt).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
      // re-fetch when timer hits zero so status updates
      if (remaining === 0) {
        api
          .get("/negotiations/me")
          .then((res) => {
            setNegotiation(res.data);
            if (res.data.status !== "active") setHasActiveNeg(false);
          })
          .catch(() => {});
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [negotiation?.id, negotiation?.status, negotiation?.expiresAt, setHasActiveNeg]);

  // connect socket when negotiation is loaded
  useEffect(() => {
    if (!negotiation || !token) return;

    const socket = io(backendUrl, {
      auth: { token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // receive chat messages
    socket.on("negotiation:message", (msg: ChatMessage) => {
      if (msg.negotiation_id === negotiation.id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    // server notifies negotiation started (update decisions/status)
    socket.on("negotiation:started", () => {
      api
        .get("/negotiations/me")
        .then((res) => setNegotiation(res.data))
        .catch(() => {});
    });

    // other party made a decision — update state immediately without polling
    socket.on(
      "negotiation:updated",
      (data: { id: number; status: string; decisions: { candidate: string | null; business: string | null } }) => {
        setNegotiation((prev) =>
          prev ? { ...prev, status: data.status, decisions: data.decisions } : prev
        );
        if (data.status !== "active") setHasActiveNeg(false);
      }
    );

    // socket-level errors
    socket.on("negotiation:error", (data: { message: string }) => {
      setDecisionError(data.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [negotiation?.id, token, backendUrl]);

  // auto-scroll to bottom when messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // send a chat message via socket
  function handleSend(e: React.SyntheticEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !negotiation || !socketRef.current) return;
    socketRef.current.emit("negotiation:message", {
      negotiation_id: negotiation.id,
      text,
    });
    setInput("");
  }

  // accept or decline the negotiation
  async function handleDecision(decision: "accept" | "decline") {
    if (!negotiation) return;
    setDecisionLoading(true);
    setDecisionError("");
    try {
      const res = await api.patch("/negotiations/me/decision", {
        negotiation_id: negotiation.id,
        decision,
      });
      const updated = { ...negotiation, status: res.data.status, decisions: res.data.decisions };
      setNegotiation(updated);
      // sync global active-neg state
      if (res.data.status !== "active") setHasActiveNeg(false);
    } catch (err) {
      setDecisionError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Action failed." : "Action failed."
      );
    } finally {
      setDecisionLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  if (notFound) {
    const jobsTo = JOBS_LINK[role ?? "regular"] ?? "/my-jobs";
    return (
      <div className="Negotiation page-enter">
        <h1>Negotiation</h1>
        <p className="empty-state">
          No active negotiation. <Link to={jobsTo}>Go to jobs</Link> to start one when you have a
          mutual interest.
        </p>
      </div>
    );
  }

  if (!negotiation) return null;

  // determine which decision slot is "mine" based on role, not id comparison
  // negotiation.user is always the candidate; business has its own slot
  const iAmCandidate = role === "regular";
  const myDecision = iAmCandidate
    ? negotiation.decisions.candidate
    : negotiation.decisions.business;
  const theirDecision = iAmCandidate
    ? negotiation.decisions.business
    : negotiation.decisions.candidate;

  const isActive = negotiation.status === "active";
  const isSuccess = negotiation.status === "success";
  const isFailed = negotiation.status === "failed";

  // warn when less than 2 minutes remain
  const urgentCountdown = secondsLeft !== null && secondsLeft <= 120;

  return (
    <div className="Negotiation page-enter">
      {/* negotiation header */}
      <div className="neg-header">
        <div>
          <h1>Negotiation</h1>
          <p className="neg-subtitle">
            {negotiation.job.position_type.name}
            {negotiation.job.business && ` · ${negotiation.job.business.business_name}`}
          </p>
        </div>
        <span className={`neg-status neg-status-${negotiation.status}`}>{negotiation.status}</span>
      </div>

      {/* job summary */}
      <div className="neg-job-info">
        <span>
          ${negotiation.job.salary_min}–${negotiation.job.salary_max}/hr
        </span>
        <span>·</span>
        <span>{new Date(negotiation.job.start_time).toLocaleString()}</span>
        <span>→</span>
        <span>{new Date(negotiation.job.end_time).toLocaleString()}</span>
      </div>

      {/* countdown timer — shown while active */}
      {isActive && secondsLeft !== null && (
        <div className={`neg-countdown ${urgentCountdown ? "neg-countdown-urgent" : ""}`}>
          <span className="neg-countdown-label">Time remaining</span>
          <span className="neg-countdown-value">{formatCountdown(secondsLeft)}</span>
        </div>
      )}

      {/* outcome banners */}
      {isSuccess && (
        <div className="neg-outcome success">Both parties accepted — job confirmed!</div>
      )}
      {isFailed && (
        <div className="neg-outcome failed">
          Negotiation ended.{" "}
          <Link to={BROWSE_LINK[role ?? "regular"] ?? "/jobs"}>Browse more jobs</Link>
        </div>
      )}

      {/* decisions */}
      <div className="neg-decisions">
        <div
          className={`neg-decision ${myDecision ? `decision-${myDecision}` : "decision-pending"}`}
        >
          <span className="neg-decision-label">Your decision</span>
          <span className="neg-decision-value">{myDecision ?? "Pending"}</span>
        </div>
        <div
          className={`neg-decision ${theirDecision ? `decision-${theirDecision}` : "decision-pending"}`}
        >
          <span className="neg-decision-label">Their decision</span>
          <span className="neg-decision-value">{theirDecision ?? "Pending"}</span>
        </div>
      </div>

      {/* accept / decline — only shown when active and undecided */}
      {isActive && !myDecision && (
        <div className="neg-actions">
          {decisionError && <p className="error-message">{decisionError}</p>}
          <button
            className="btn-primary"
            onClick={() => handleDecision("accept")}
            disabled={decisionLoading}
          >
            Accept
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleDecision("decline")}
            disabled={decisionLoading}
          >
            Decline
          </button>
        </div>
      )}

      {/* chat */}
      <div className="neg-chat">
        <div className="neg-messages">
          {messages.length === 0 && <p className="neg-no-messages">No messages yet — say hello!</p>}
          {messages.map((msg, i) => {
            const isMine = myId !== undefined && msg.sender.id === myId;
            // stable key: use timestamp + sender id + fallback index
            const key = `${msg.negotiation_id}-${msg.sender.id}-${msg.createdAt}-${i}`;
            return (
              <div key={key} className={`neg-message ${isMine ? "mine" : "theirs"}`}>
                <p className="msg-text">{msg.text}</p>
                <span className="msg-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* message input — only when active */}
        {isActive && (
          <form onSubmit={handleSend} className="neg-input-row">
            <input
              type="text"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn-primary" disabled={!input.trim()}>
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
