import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { useNegotiation } from "../../../contexts/NegotiationContext/NegotiationContext";
import "./style.css";

interface JobDetail {
  id: number;
  status: string;
  position_type: { id: number; name: string };
  salary_min: number;
  salary_max: number;
  start_time: string;
  end_time: string;
  note: string | null;
  worker: { id: number; first_name: string; last_name: string } | null;
}

const STATUS_CLASS: Record<string, string> = {
  open: "status-open",
  filled: "status-filled",
  expired: "status-expired",
  cancelled: "status-cancelled",
  completed: "status-completed",
};

// format a date string for datetime-local input
function toLocalInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

export default function BusinessJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { hasActiveNeg } = useNegotiation();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // inline edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    salary_min: "",
    salary_max: "",
    start_time: "",
    end_time: "",
    note: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // delete / no-show state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    api
      .get(`/jobs/${jobId}`)
      .then((res) => {
        setJob(res.data);
        // seed edit form from current values
        setEditForm({
          salary_min: String(res.data.salary_min),
          salary_max: String(res.data.salary_max),
          start_time: toLocalInput(res.data.start_time),
          end_time: toLocalInput(res.data.end_time),
          note: res.data.note ?? "",
        });
      })
      .catch((err) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError("Job not found.");
        } else {
          setError("Failed to load job.");
        }
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  function handleEditChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setEditForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleEditSave(e: React.SyntheticEvent) {
    e.preventDefault();
    setEditSaving(true);
    setEditError("");

    const salaryMin = parseFloat(editForm.salary_min);
    const salaryMax = parseFloat(editForm.salary_max);

    if (isNaN(salaryMin) || salaryMin < 0) {
      setEditError("Minimum salary must be a non-negative number.");
      setEditSaving(false);
      return;
    }
    if (isNaN(salaryMax) || salaryMax < salaryMin) {
      setEditError("Maximum salary must be ≥ minimum salary.");
      setEditSaving(false);
      return;
    }
    if (new Date(editForm.end_time) <= new Date(editForm.start_time)) {
      setEditError("End time must be after start time.");
      setEditSaving(false);
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        salary_min: salaryMin,
        salary_max: salaryMax,
        start_time: new Date(editForm.start_time).toISOString(),
        end_time: new Date(editForm.end_time).toISOString(),
      };
      // only include note if non-empty
      if (editForm.note.trim()) payload.note = editForm.note.trim();

      const res = await api.patch(`/businesses/me/jobs/${jobId}`, payload);
      const updated = res.data;
      // merge updated fields back into the job
      setJob((prev) => (prev ? { ...prev, ...updated } : prev));
      // re-seed edit form so reopening edit shows current values
      setEditForm({
        salary_min: String(updated.salary_min ?? salaryMin),
        salary_max: String(updated.salary_max ?? salaryMax),
        start_time: toLocalInput(updated.start_time ?? editForm.start_time),
        end_time: toLocalInput(updated.end_time ?? editForm.end_time),
        note: updated.note ?? "",
      });
      setEditing(false);
    } catch (err) {
      setEditError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Save failed." : "Save failed."
      );
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    setActionError("");
    try {
      await api.delete(`/businesses/me/jobs/${jobId}`);
      navigate("/business/jobs");
    } catch (err) {
      setActionError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Delete failed." : "Delete failed."
      );
      setConfirmDelete(false);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleNoShow() {
    setActionLoading(true);
    setActionError("");
    try {
      const res = await api.patch(`/jobs/${jobId}/no-show`);
      setJob((prev) => (prev ? { ...prev, status: res.data.status } : prev));
    } catch (err) {
      setActionError(
        axios.isAxiosError(err) ? err.response?.data?.error || "Action failed." : "Action failed."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div className="BusinessJobDetail page-enter">
        <p className="error-message">{error}</p>
        <Link to="/business/jobs" className="back-link">
          ← My jobs
        </Link>
      </div>
    );
  }
  if (!job) return null;

  const isOpen = job.status === "open";
  // delete is only valid on open/expired jobs with no active negotiations
  const isDeletable = (job.status === "open" || job.status === "expired") && !hasActiveNeg;
  // no-show is available when job is filled and we're currently in the shift window
  const now = Date.now();
  const canNoShow =
    job.status === "filled" &&
    now >= new Date(job.start_time).getTime() &&
    now <= new Date(job.end_time).getTime();

  return (
    <div className="BusinessJobDetail page-enter">
      <div className="bjd-nav">
        <Link to="/business/jobs" className="back-link">
          ← My jobs
        </Link>
        <div className="bjd-sub-links">
          <Link to={`/business/jobs/${jobId}/candidates`} className="btn-secondary btn-sm">
            Candidates
          </Link>
          <Link to={`/business/jobs/${jobId}/interests`} className="btn-secondary btn-sm">
            Interests
          </Link>
        </div>
      </div>

      <div className="bjd-card">
        {/* header */}
        <div className="bjd-header">
          <div>
            <h1>{job.position_type.name}</h1>
            {job.worker && (
              <p className="bjd-worker">
                Filled by {job.worker.first_name} {job.worker.last_name}
              </p>
            )}
          </div>
          <span className={`status-badge ${STATUS_CLASS[job.status]}`}>{job.status}</span>
        </div>

        {/* static details — hidden when editing */}
        {!editing && (
          <>
            <div className="bjd-grid">
              <div className="bjd-item">
                <span className="detail-label">Salary</span>
                <span>
                  ${job.salary_min.toLocaleString()}–${job.salary_max.toLocaleString()}/hr
                </span>
              </div>
              <div className="bjd-item">
                <span className="detail-label">Start</span>
                <span>{new Date(job.start_time).toLocaleString()}</span>
              </div>
              <div className="bjd-item">
                <span className="detail-label">End</span>
                <span>{new Date(job.end_time).toLocaleString()}</span>
              </div>
              <div className="bjd-item">
                <span className="detail-label">Job ID</span>
                <span>#{job.id}</span>
              </div>
            </div>
            {job.note && (
              <div className="bjd-note">
                <span className="detail-label">Notes</span>
                <p>{job.note}</p>
              </div>
            )}
          </>
        )}

        {/* inline edit form — open jobs only */}
        {editing && (
          <form onSubmit={handleEditSave} className="bjd-edit-form">
            {editError && <p className="error-message">{editError}</p>}

            <div className="form-row">
              <div className="form-field">
                <label>Min salary ($/hr)</label>
                <input
                  name="salary_min"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.salary_min}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>Max salary ($/hr)</label>
                <input
                  name="salary_max"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.salary_max}
                  onChange={handleEditChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Start time</label>
                <input
                  name="start_time"
                  type="datetime-local"
                  value={editForm.start_time}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>End time</label>
                <input
                  name="end_time"
                  type="datetime-local"
                  value={editForm.end_time}
                  onChange={handleEditChange}
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <label>Notes</label>
              <textarea
                name="note"
                value={editForm.note}
                onChange={handleEditChange}
                rows={3}
                placeholder="Optional notes..."
              />
            </div>

            <div className="bjd-edit-actions">
              <button type="submit" className="btn-primary btn-sm" disabled={editSaving}>
                {editSaving ? "Saving..." : "Save changes"}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  setEditing(false);
                  setEditError("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* action buttons */}
        <div className="bjd-actions">
          {actionError && <p className="error-message">{actionError}</p>}

          {isOpen && !editing && (
            <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>
              Edit job
            </button>
          )}

          {isDeletable && !editing && (
            <>
              {confirmDelete ? (
                <div className="bjd-confirm-delete">
                  <span>Delete this job?</span>
                  <button
                    className="btn-danger btn-sm"
                    onClick={handleDelete}
                    disabled={actionLoading}
                  >
                    {actionLoading ? "Deleting..." : "Yes, delete"}
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                  Delete job
                </button>
              )}
            </>
          )}

          {/* no-show: mark worker as no-show during the shift window */}
          {canNoShow && (
            <button className="btn-danger btn-sm" onClick={handleNoShow} disabled={actionLoading}>
              {actionLoading ? "Processing..." : "Mark no-show"}
            </button>
          )}
        </div>

        {/* active negotiation shortcut */}
        {hasActiveNeg && (
          <div className="bjd-neg-banner">
            <span>You have an active negotiation in progress.</span>
            <Link to="/business/negotiations/me" className="btn-primary btn-sm">
              View negotiation
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
