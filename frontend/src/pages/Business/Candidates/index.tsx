import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  invited: boolean;
}

export default function BusinessCandidates() {
  const { jobId } = useParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // per-candidate invite loading/error
  const [inviteLoading, setInviteLoading] = useState<number | null>(null);
  const [inviteError, setInviteError] = useState<Record<number, string>>({});
  const limit = 10;

  useEffect(() => {
    async function fetchCandidates() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/jobs/${jobId}/candidates`, {
          params: { page, limit },
        });
        setCandidates(res.data.results);
        setCount(res.data.count);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load candidates."
            : "Failed to load candidates."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchCandidates();
  }, [jobId, page]);

  // toggle invite or withdraw directly from the list
  async function handleInvite(userId: number, currentlyInvited: boolean) {
    setInviteLoading(userId);
    setInviteError((prev) => ({ ...prev, [userId]: "" }));
    try {
      await api.patch(`/jobs/${jobId}/candidates/${userId}/interested`, {
        interested: !currentlyInvited,
      });
      setCandidates((prev) =>
        prev.map((c) => (c.id === userId ? { ...c, invited: !currentlyInvited } : c))
      );
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || "Action failed."
        : "Action failed.";
      setInviteError((prev) => ({ ...prev, [userId]: msg }));
    } finally {
      setInviteLoading(null);
    }
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="BusinessCandidates page-enter">
      <div className="cands-header">
        <div>
          <Link to={`/business/jobs/${jobId}`} className="back-link">
            ← Job #{jobId}
          </Link>
          <h1>Candidates</h1>
        </div>
        <p className="cands-count">
          {count} discoverable candidate{count !== 1 ? "s" : ""}
        </p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : candidates.length === 0 ? (
        <p className="empty-state">
          No discoverable candidates right now. Candidates need an approved qualification and must
          be marked available.
        </p>
      ) : (
        <>
          <div className="cands-list">
            {candidates.map((c) => (
              <div key={c.id} className="cand-row">
                <Link to={`/business/jobs/${jobId}/candidates/${c.id}`} className="cand-name">
                  {c.first_name} {c.last_name}
                </Link>

                <div className="cand-row-right">
                  {c.invited && <span className="cand-invited-badge">Invited</span>}
                  {inviteError[c.id] && (
                    <span className="error-message small">{inviteError[c.id]}</span>
                  )}
                  <button
                    className={c.invited ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
                    onClick={() => handleInvite(c.id, c.invited)}
                    disabled={inviteLoading === c.id}
                  >
                    {inviteLoading === c.id ? "..." : c.invited ? "Withdraw" : "Invite"}
                  </button>
                  <Link
                    to={`/business/jobs/${jobId}/candidates/${c.id}`}
                    className="btn-secondary btn-sm"
                  >
                    View profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
