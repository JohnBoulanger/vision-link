import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "../../../utils/api";
import { useAuth } from "../../../contexts/AuthContext/AuthContext";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface Qualification {
  id: number;
  status: string;
  note: string;
  document: string | null;
  position_type: { id: number; name: string };
  updatedAt: string;
}

interface PositionType {
  id: number;
  name: string;
}

// status transitions a regular user can trigger
const ALLOWED_SUBMIT: Record<string, string | null> = {
  created: "submitted",
  rejected: "revised",
  approved: "revised",
  submitted: null,
  revised: null,
};

export default function Qualifications() {
  const { user } = useAuth();
  const userId = String((user as Record<string, unknown>)?.id ?? "");

  const [quals, setQuals] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);
  const limit = 10;

  // create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newPositionId, setNewPositionId] = useState("");
  const [newNote, setNewNote] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  // per-qualification action state
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // load qualifications from server
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api
      .get("/qualifications/me", { params: { page, limit } })
      .then((res) => {
        setQuals(res.data.results);
        setTotalPages(Math.ceil(res.data.count / limit));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, page]);

  // load position types for the create form
  useEffect(() => {
    api
      .get("/position-types")
      .then((res) => setPositionTypes(res.data.results ?? res.data))
      .catch(() => {});
  }, []);

  // create a new qualification
  async function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateLoading(true);
    try {
      await api.post("/qualifications", {
        position_type_id: parseInt(newPositionId),
        note: newNote,
      });
      // reload from server to get fresh list with the new entry
      const res = await api.get("/qualifications/me", { params: { page: 1, limit } });
      setQuals(res.data.results);
      setTotalPages(Math.ceil(res.data.count / limit));
      setPage(1);
      setShowCreate(false);
      setNewPositionId("");
      setNewNote("");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setCreateError("You already have a qualification for this position.");
        } else {
          setCreateError(err.response?.data?.error || "Failed to create qualification.");
        }
      } else {
        setCreateError("Failed to create qualification.");
      }
    } finally {
      setCreateLoading(false);
    }
  }

  // submit or revise a qualification
  async function handleStatusChange(qualId: number, newStatus: string) {
    setActionLoading(qualId);
    setActionError((prev) => ({ ...prev, [qualId]: "" }));
    try {
      const res = await api.patch(`/qualifications/${qualId}`, { status: newStatus });
      setQuals((prev) =>
        prev.map((q) => (q.id === qualId ? { ...q, status: res.data.status } : q))
      );
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || "Action failed."
        : "Action failed.";
      setActionError((prev) => ({ ...prev, [qualId]: msg }));
    } finally {
      setActionLoading(null);
    }
  }

  // upload document for a qualification
  async function handleDocUpload(qualId: number, file: File) {
    setActionLoading(qualId);
    setActionError((prev) => ({ ...prev, [qualId]: "" }));
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.put(`/qualifications/${qualId}/document`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setQuals((prev) =>
        prev.map((q) => (q.id === qualId ? { ...q, document: res.data.document } : q))
      );
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || "Upload failed."
        : "Upload failed.";
      setActionError((prev) => ({ ...prev, [qualId]: msg }));
    } finally {
      setActionLoading(null);
    }
  }

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  return (
    <div className="Qualifications page-enter">
      <div className="quals-header">
        <h1>Qualifications</h1>
        <button className="btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "+ Add qualification"}
        </button>
      </div>

      {/* create form */}
      {showCreate && (
        <div className="qual-create-form">
          <form onSubmit={handleCreate}>
            {createError && <p className="error-message">{createError}</p>}
            <select
              value={newPositionId}
              onChange={(e) => setNewPositionId(e.target.value)}
              required
            >
              <option value="">Select position type</option>
              {positionTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.name}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Notes (optional)"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <button type="submit" className="btn-primary" disabled={createLoading}>
              {createLoading ? "Creating..." : "Create qualification"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : quals.length === 0 ? (
        <p className="empty-state">No qualifications yet — add one to get started</p>
      ) : (
        <div className="quals-list">
          {quals.map((q) => {
            const nextStatus = ALLOWED_SUBMIT[q.status];
            return (
              <div key={q.id} className="qual-card">
                <div className="qual-card-header">
                  <div>
                    <h3>{q.position_type.name}</h3>
                    {q.note && <p className="qual-note">{q.note}</p>}
                  </div>
                  <span className={`qual-status qual-status-${q.status}`}>{q.status}</span>
                </div>

                {actionError[q.id] && <p className="error-message">{actionError[q.id]}</p>}

                <div className="qual-card-actions">
                  {/* document upload */}
                  <div className="qual-doc">
                    {q.document ? (
                      <a
                        href={`${backendUrl}${q.document}`}
                        target="_blank"
                        rel="noreferrer"
                        className="qual-doc-link"
                      >
                        View document
                      </a>
                    ) : (
                      <span className="qual-doc-missing">No document</span>
                    )}
                    <input
                      type="file"
                      accept="application/pdf"
                      style={{ display: "none" }}
                      ref={(el) => {
                        fileRefs.current[q.id] = el;
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocUpload(q.id, file);
                      }}
                    />
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => fileRefs.current[q.id]?.click()}
                      disabled={actionLoading === q.id}
                    >
                      {q.document ? "Replace PDF" : "Upload PDF"}
                    </button>
                  </div>

                  {/* status transition */}
                  {nextStatus && (
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleStatusChange(q.id, nextStatus)}
                      disabled={actionLoading === q.id}
                    >
                      {actionLoading === q.id
                        ? "Saving..."
                        : nextStatus === "submitted"
                          ? "Submit for review"
                          : "Mark as revised"}
                    </button>
                  )}
                </div>

                <span className="qual-updated">
                  Updated {new Date(q.updatedAt).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
