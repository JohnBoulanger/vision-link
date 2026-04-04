import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import useDebounce from "../../../hooks/useDebounce";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface PositionType {
  id: number;
  name: string;
}

interface Job {
  id: number;
  status: string;
  position_type: { id: number; name: string };
  salary_min: number;
  salary_max: number;
  start_time: string;
  end_time: string;
  worker: { id: number; first_name?: string; last_name?: string } | null;
}

// all possible job statuses
const ALL_STATUSES = ["open", "filled", "expired", "cancelled", "completed"];

const STATUS_CLASS: Record<string, string> = {
  open: "status-open",
  filled: "status-filled",
  expired: "status-expired",
  cancelled: "status-cancelled",
  completed: "status-completed",
};

export default function BusinessJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filter state
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);
  const [positionFilter, setPositionFilter] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>(["open", "filled"]);
  const [sortField, setSortField] = useState("start_time");
  const [sortOrder, setSortOrder] = useState("desc");

  const limit = 10;
  const debouncedPosition = useDebounce(positionFilter, 200);

  // load position types for filter dropdown
  useEffect(() => {
    api
      .get("/position-types")
      .then((res) => setPositionTypes(res.data.results ?? res.data))
      .catch((err) =>
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load jobs."
            : "Failed to load jobs."
        )
      );
  }, []);

  // fetch business's jobs
  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, unknown> = {
          page,
          limit,
          sort: sortField,
          order: sortOrder,
        };
        // send status as array so backend receives separate values (comma-joined causes 500)
        if (statusFilters.length > 0) params.status = statusFilters;
        if (debouncedPosition) params.position_type_id = debouncedPosition;

        const res = await api.get("/businesses/me/jobs", { params });
        setJobs(res.data.results);
        setCount(res.data.count);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load jobs."
            : "Failed to load jobs."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [page, debouncedPosition, statusFilters, sortField, sortOrder]);

  // reset to page 1 when filters change
  const prevFiltersRef = useRef({ debouncedPosition, statusFilters, sortField, sortOrder });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.debouncedPosition !== debouncedPosition ||
      prev.statusFilters !== statusFilters ||
      prev.sortField !== sortField ||
      prev.sortOrder !== sortOrder
    ) {
      prevFiltersRef.current = { debouncedPosition, statusFilters, sortField, sortOrder };
      setPage(1);
    }
  }, [debouncedPosition, statusFilters, sortField, sortOrder]);

  // toggle a single status in the multi-select filter
  function toggleStatus(s: string) {
    setStatusFilters((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="BusinessJobs page-enter">
      <div className="bjobs-header">
        <div>
          <h1>My Jobs</h1>
          <p className="bjobs-subtitle">
            {count} job{count !== 1 ? "s" : ""}
          </p>
        </div>
        <Link to="/business/jobs/new" className="btn-primary btn-sm">
          + Post job
        </Link>
      </div>

      {/* filter / sort controls */}
      <div className="bjobs-controls">
        {/* status chips */}
        <div className="bjobs-status-filters">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              className={`bjobs-status-chip ${statusFilters.includes(s) ? "active" : ""}`}
              onClick={() => toggleStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="bjobs-sort-row">
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="bjobs-filter"
          >
            <option value="">Position type</option>
            {positionTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>

          <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
            <option value="start_time">Start date</option>
            <option value="end_time">End date</option>
            <option value="salary_min">Min salary</option>
            <option value="salary_max">Max salary</option>
            <option value="createdAt">Date posted</option>
            <option value="updatedAt">Last updated</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : jobs.length === 0 ? (
        <div className="bjobs-empty">
          <p className="empty-state">No jobs match your filters.</p>
          <Link to="/business/jobs/new" className="btn-primary btn-sm">
            Post your first job
          </Link>
        </div>
      ) : (
        <>
          <div className="bjobs-list">
            {jobs.map((job) => (
              <Link key={job.id} to={`/business/jobs/${job.id}`} className="bjob-row">
                <div className="bjob-row-left">
                  <span className="bjob-position">{job.position_type.name}</span>
                  <span className="bjob-dates">
                    {new Date(job.start_time).toLocaleDateString()} →{" "}
                    {new Date(job.end_time).toLocaleDateString()}
                  </span>
                </div>
                <div className="bjob-row-right">
                  {job.worker && (
                    <span className="bjob-worker">
                      {job.worker.first_name} {job.worker.last_name}
                    </span>
                  )}
                  <span className="bjob-salary">
                    ${job.salary_min}–${job.salary_max}/hr
                  </span>
                  <span className={`status-badge ${STATUS_CLASS[job.status]}`}>{job.status}</span>
                </div>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
