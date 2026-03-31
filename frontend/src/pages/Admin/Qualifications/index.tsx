import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "../../../utils/api";
import useDebounce from "../../../hooks/useDebounce";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "../Users/style.css";
import "./style.css";

interface QualSummary {
  id: number;
  status: string;
  user: { id: number; first_name: string; last_name: string };
  position_type: { id: number; name: string };
  updatedAt: string;
}

interface QualDetail {
  id: number;
  status: string;
  note: string | null;
  document: string | null;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar: string | null;
    biography: string | null;
  };
  position_type: { id: number; name: string; description: string };
  updatedAt: string;
}

const STATUS_CLASS: Record<string, string> = {
  created: "badge-grey",
  submitted: "badge-amber",
  approved: "badge-green",
  rejected: "badge-red",
  revised: "badge-amber",
};

// statuses the admin can transition to from a given current status
function adminActions(status: string): string[] {
  if (status === "submitted" || status === "revised") return ["approved", "rejected"];
  return [];
}

export default function AdminQualifications() {
  const [quals, setQuals] = useState<QualSummary[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // expanded detail panel
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<QualDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionPending, setActionPending] = useState(false);

  const limit = 15;
  const debouncedKeyword = useDebounce(keyword, 300);

  // track previous filter values to detect changes and reset page atomically
  const prevFiltersRef = useRef({ debouncedKeyword, statusFilter });

  // fetch qualifications — resets to page 1 when filters change to avoid stale-page fetches
  useEffect(() => {
    let activePage = page;
    const prev = prevFiltersRef.current;
    if (prev.debouncedKeyword !== debouncedKeyword || prev.statusFilter !== statusFilter) {
      prevFiltersRef.current = { debouncedKeyword, statusFilter };
      activePage = 1;
      setPage(1);
    }

    async function fetchQuals() {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, unknown> = { page: activePage, limit };
        if (debouncedKeyword) params.keyword = debouncedKeyword;
        // pass status to backend for accurate server-side filtering and pagination
        if (statusFilter) params.status = statusFilter;
        const res = await api.get("/qualifications", { params });
        setQuals(res.data.results);
        setCount(res.data.count);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load qualifications."
            : "Failed to load qualifications."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchQuals();
  }, [page, debouncedKeyword, statusFilter]);

  // toggle expand row — fetch detail if newly opening
  async function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      setActionNote("");
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setDetailError("");
    setActionNote("");
    setDetailLoading(true);
    try {
      const res = await api.get(`/qualifications/${id}`);
      setDetail(res.data);
    } catch (err) {
      setDetailError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Failed to load qualification details."
          : "Failed to load qualification details."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  // approve or reject a qualification
  async function handleAction(qualId: number, newStatus: "approved" | "rejected") {
    setActionPending(true);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (actionNote.trim()) body.note = actionNote.trim();
      const res = await api.patch(`/qualifications/${qualId}`, body);

      // update summary list in place
      setQuals((prev) =>
        prev.map((q) => (q.id === qualId ? { ...q, status: res.data.status } : q))
      );
      // update expanded detail
      setDetail((prev) =>
        prev ? { ...prev, status: res.data.status, note: res.data.note } : prev
      );
      setActionNote("");
    } catch (err) {
      setDetailError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Action failed." : "Action failed."
      );
    } finally {
      setActionPending(false);
    }
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="AdminQualifications page-enter">
      <div className="admin-page-header">
        <div>
          <h1>Qualifications</h1>
          <p className="admin-subtitle">
            {count} qualification request{count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="admin-controls">
        <input
          className="admin-search"
          type="text"
          placeholder="Search by user name or email…"
          aria-label="Search qualifications"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="created">Created</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="revised">Revised</option>
        </select>
      </div>

      {error && (
        <p className="error-message admin-error-dismissible">
          {error}
          <button
            className="admin-error-dismiss"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </p>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : quals.length === 0 ? (
        <p className="empty-state">No qualifications match your filters.</p>
      ) : (
        <>
          <div className="qual-list">
            {quals.map((q) => (
              <div key={q.id} className="qual-item">
                {/* summary row — click to expand */}
                <button
                  className={`qual-row ${expandedId === q.id ? "qual-row-open" : ""}`}
                  onClick={() => toggleExpand(q.id)}
                  aria-expanded={expandedId === q.id}
                >
                  <span className="qual-user">
                    {q.user.first_name} {q.user.last_name}
                  </span>
                  <span className="qual-position">{q.position_type.name}</span>
                  <span className={`admin-badge ${STATUS_CLASS[q.status] ?? "badge-grey"}`}>
                    {q.status}
                  </span>
                  <span className="qual-date">{new Date(q.updatedAt).toLocaleDateString()}</span>
                  <span className="qual-chevron">{expandedId === q.id ? "▲" : "▼"}</span>
                </button>

                {/* expanded detail panel */}
                {expandedId === q.id && (
                  <div className="qual-detail">
                    {detailLoading ? (
                      <LoadingSpinner />
                    ) : detailError ? (
                      <p className="error-message">{detailError}</p>
                    ) : detail ? (
                      <>
                        <div className="qual-detail-grid">
                          <div>
                            <p className="detail-label">User</p>
                            <p>
                              {detail.user.first_name} {detail.user.last_name}
                            </p>
                            <p className="admin-td-email">{detail.user.email}</p>
                          </div>
                          <div>
                            <p className="detail-label">Position type</p>
                            <p>{detail.position_type.name}</p>
                            <p className="admin-muted">{detail.position_type.description}</p>
                          </div>
                          <div>
                            <p className="detail-label">Status</p>
                            <span
                              className={`admin-badge ${STATUS_CLASS[detail.status] ?? "badge-grey"}`}
                            >
                              {detail.status}
                            </span>
                          </div>
                          <div>
                            <p className="detail-label">Last updated</p>
                            <p>{new Date(detail.updatedAt).toLocaleString()}</p>
                          </div>
                          {detail.note && (
                            <div className="qual-detail-full">
                              <p className="detail-label">Note</p>
                              <p>{detail.note}</p>
                            </div>
                          )}
                          {detail.document && (
                            <div className="qual-detail-full">
                              <p className="detail-label">Document</p>
                              <a
                                href={detail.document}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-link"
                              >
                                View document ↗
                              </a>
                            </div>
                          )}
                          {detail.user.biography && (
                            <div className="qual-detail-full">
                              <p className="detail-label">Biography</p>
                              <p className="admin-muted">{detail.user.biography}</p>
                            </div>
                          )}
                        </div>

                        {/* approve/reject actions */}
                        {adminActions(detail.status).length > 0 && (
                          <div className="qual-actions">
                            <textarea
                              className="qual-note-input"
                              placeholder="Optional note to the user…"
                              value={actionNote}
                              onChange={(e) => setActionNote(e.target.value)}
                              rows={2}
                            />
                            <div className="qual-action-btns">
                              <button
                                className="btn-primary btn-sm"
                                disabled={actionPending}
                                onClick={() => handleAction(detail.id, "approved")}
                              >
                                {actionPending ? "…" : "Approve"}
                              </button>
                              <button
                                className="btn-danger btn-sm"
                                disabled={actionPending}
                                onClick={() => handleAction(detail.id, "rejected")}
                              >
                                {actionPending ? "…" : "Reject"}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
