import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface PositionType {
  id: number;
  name: string;
  description: string;
}

export default function BusinessJobCreate() {
  const navigate = useNavigate();
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);
  const [ptLoading, setPtLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    position_type_id: "",
    salary_min: "",
    salary_max: "",
    start_time: "",
    end_time: "",
    note: "",
  });

  // check business verification status before allowing job creation
  useEffect(() => {
    api
      .get("/businesses/me")
      .then((res) => setVerified(res.data.verified))
      .catch((err) => {
        // fall back to treating the business as unverified on any load error
        setVerified(false);
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load profile."
            : "Failed to load profile."
        );
      });
  }, []);

  // load position types for the dropdown
  useEffect(() => {
    api
      .get("/position-types")
      .then((res) => setPositionTypes(res.data.results ?? res.data))
      .catch((err) =>
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load position types."
            : "Failed to load position types."
        )
      )
      .finally(() => setPtLoading(false));
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError("");

    const salaryMin = parseFloat(form.salary_min);
    const salaryMax = parseFloat(form.salary_max);

    // client-side validation before hitting the server
    if (!form.position_type_id) {
      setError("Please select a position type.");
      return;
    }
    if (isNaN(salaryMin) || salaryMin < 0) {
      setError("Minimum salary must be a non-negative number.");
      return;
    }
    if (isNaN(salaryMax) || salaryMax < salaryMin) {
      setError("Maximum salary must be ≥ minimum salary.");
      return;
    }
    if (!form.start_time || !form.end_time) {
      setError("Start and end times are required.");
      return;
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setError("End time must be after start time.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        position_type_id: parseInt(form.position_type_id),
        salary_min: salaryMin,
        salary_max: salaryMax,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      };
      if (form.note.trim()) payload.note = form.note.trim();

      const res = await api.post("/businesses/me/jobs", payload);
      // redirect to the new job's detail page
      navigate(`/business/jobs/${res.data.id}`);
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Failed to create job."
          : "Failed to create job."
      );
    } finally {
      setSaving(false);
    }
  }

  // block unverified businesses from posting jobs
  if (verified === false)
    return (
      <div className="BusinessJobCreate page-enter">
        <div className="jcreate-header">
          <h1>Post a Job</h1>
          <Link to="/business/jobs" className="back-link">
            ← My jobs
          </Link>
        </div>
        <div className="jcreate-unverified">
          <p>Your business must be verified by an admin before you can post jobs.</p>
          <Link to="/business/profile" className="btn-secondary">
            Go to profile →
          </Link>
        </div>
      </div>
    );

  if (ptLoading || verified === null) return <LoadingSpinner />;

  return (
    <div className="BusinessJobCreate page-enter">
      <div className="jcreate-header">
        <h1>Post a Job</h1>
        <Link to="/business/jobs" className="back-link">
          ← My jobs
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="jcreate-form">
        {error && <p className="error-message">{error}</p>}

        <div className="form-field">
          {/* htmlFor links label to the select for screen readers */}
          <label htmlFor="position_type_id">Position type *</label>
          <select
            id="position_type_id"
            name="position_type_id"
            value={form.position_type_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a position</option>
            {positionTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="salary_min">Min salary ($/hr) *</label>
            <input
              id="salary_min"
              name="salary_min"
              type="number"
              min="0"
              step="0.01"
              value={form.salary_min}
              onChange={handleChange}
              placeholder="e.g. 25"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="salary_max">Max salary ($/hr) *</label>
            <input
              id="salary_max"
              name="salary_max"
              type="number"
              min="0"
              step="0.01"
              value={form.salary_max}
              onChange={handleChange}
              placeholder="e.g. 40"
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="start_time">Start time *</label>
            {/* min prevents picking a past start time in the date picker */}
            <input
              id="start_time"
              name="start_time"
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={form.start_time}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="end_time">End time *</label>
            {/* min mirrors start_time so end can't precede current time */}
            <input
              id="end_time"
              name="end_time"
              type="datetime-local"
              min={form.start_time || new Date().toISOString().slice(0, 16)}
              value={form.end_time}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="note">Notes (optional)</label>
          {/* 500 char limit — backend has no db constraint but keeps payloads sane */}
          <textarea
            id="note"
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="Any special requirements or details for candidates..."
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="jcreate-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Posting..." : "Post job"}
          </button>
          <Link to="/business/jobs" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
