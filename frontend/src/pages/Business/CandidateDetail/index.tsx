import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface CandidateDetail {
  user: {
    id: number;
    first_name: string;
    last_name: string;
    avatar: string | null;
    resume: string | null;
    biography: string | null;
    // only present when the user is the filled worker
    email?: string;
    phone_number?: string;
    qualification: {
      id: number;
      position_type_id: number;
      document: string | null;
      note: string | null;
      updatedAt: string;
    };
  };
  job: {
    id: number;
    status: string;
    position_type: { id: number; name: string; description: string };
    start_time: string;
    end_time: string;
  };
}

export default function BusinessCandidateDetail() {
  const { jobId, userId } = useParams();
  const [data, setData] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // whether the business has already invited this candidate
  const [invited, setInvited] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  useEffect(() => {
    async function load() {
      try {
        // fetch candidate detail; separately fetch candidates list to get invited flag
        // the candidates list may fail (e.g. job not open) — that's fine, invited defaults false
        const detailRes = await api.get(`/jobs/${jobId}/candidates/${userId}`);
        setData(detailRes.data);

        // best-effort: resolve invited state from list endpoint (not in detail response)
        api
          .get(`/jobs/${jobId}/candidates`, { params: { limit: 200 } })
          .then((candidatesRes) => {
            const match = (candidatesRes.data.results ?? []).find(
              (c: { id: number; invited: boolean }) => c.id === Number(userId)
            );
            if (match) setInvited(match.invited);
          })
          .catch(() => {
            // silently ignore — invited state stays false
          });
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError("Candidate not found.");
        } else {
          setError("Failed to load candidate.");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId, userId]);

  async function handleInvite(value: boolean) {
    setInviteLoading(true);
    setInviteError("");
    try {
      await api.patch(`/jobs/${jobId}/candidates/${userId}/interested`, { interested: value });
      setInvited(value);
    } catch (err) {
      setInviteError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Action failed." : "Action failed."
      );
    } finally {
      setInviteLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="BusinessCandidateDetail page-enter">
        <p className="error-message">{error}</p>
        <Link to={`/business/jobs/${jobId}/candidates`} className="back-link">
          ← Candidates
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const { user, job } = data;
  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="BusinessCandidateDetail page-enter">
      <Link to={`/business/jobs/${jobId}/candidates`} className="back-link">
        ← Candidates
      </Link>

      <div className="bcd-card">
        {/* candidate header */}
        <div className="bcd-header">
          <div className="bcd-avatar-wrap">
            {user.avatar ? (
              <img
                src={`${backendUrl}${user.avatar}`}
                alt="candidate avatar"
                className="bcd-avatar"
              />
            ) : (
              <div className="bcd-avatar-placeholder">{initials}</div>
            )}
          </div>
          <div className="bcd-identity">
            <h1>
              {user.first_name} {user.last_name}
            </h1>
            {/* contact info only exposed when this person filled the job */}
            {user.email && <p className="bcd-contact">{user.email}</p>}
            {user.phone_number && <p className="bcd-contact">{user.phone_number}</p>}
          </div>
        </div>

        {/* biography */}
        {user.biography && (
          <div className="bcd-bio">
            <span className="detail-label">About</span>
            <p>{user.biography}</p>
          </div>
        )}

        {/* resume link */}
        <div className="bcd-resume">
          <span className="detail-label">Resume</span>
          {user.resume ? (
            <a
              href={`${backendUrl}${user.resume}`}
              target="_blank"
              rel="noreferrer"
              className="bcd-doc-link"
            >
              View resume (PDF)
            </a>
          ) : (
            <span className="bcd-no-doc">No resume uploaded</span>
          )}
        </div>

        {/* qualification for this job's position type */}
        <div className="bcd-qual">
          <span className="detail-label">Qualification — {job.position_type.name}</span>
          {user.qualification.document ? (
            <a
              href={`${backendUrl}${user.qualification.document}`}
              target="_blank"
              rel="noreferrer"
              className="bcd-doc-link"
            >
              View qualification document
            </a>
          ) : (
            <span className="bcd-no-doc">No document uploaded</span>
          )}
          {user.qualification.note && <p className="bcd-qual-note">{user.qualification.note}</p>}
        </div>

        {/* job summary */}
        <div className="bcd-job-info">
          <span className="detail-label">Position</span>
          <span>{job.position_type.name}</span>
          <span className="detail-label">Shift</span>
          <span>
            {new Date(job.start_time).toLocaleString()} → {new Date(job.end_time).toLocaleString()}
          </span>
        </div>

        {/* invite / withdraw action */}
        {job.status === "open" && (
          <div className="bcd-invite-actions">
            {inviteError && <p className="error-message">{inviteError}</p>}
            {invited ? (
              <div className="bcd-invite-row">
                <span className="cand-invited-badge">Invitation sent</span>
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => handleInvite(false)}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? "..." : "Withdraw invite"}
                </button>
              </div>
            ) : (
              <button
                className="btn-primary btn-sm"
                onClick={() => handleInvite(true)}
                disabled={inviteLoading}
              >
                {inviteLoading ? "Sending..." : "Send invitation"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
