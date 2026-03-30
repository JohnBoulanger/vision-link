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
  business: { id: number; business_name: string };
  salary_min: number;
  salary_max: number;
  start_time: string;
  end_time: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);
  const [positionFilter, setPositionFilter] = useState("");
  const [sortField, setSortField] = useState("start_time");
  const [sortOrder, setSortOrder] = useState("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 10;

  // debounce the position filter to avoid rapid re-fetches
  const debouncedPosition = useDebounce(positionFilter, 200);

  // load position types for the filter dropdown
  useEffect(() => {
    api
      .get("/position-types")
      .then((res) => setPositionTypes(res.data.results ?? res.data))
      .catch(() => {});
  }, []);

  // fetch jobs — reset to page 1 when filters change, otherwise use current page
  useEffect(() => {
    // track whether this effect fired due to a filter change vs a page change
    const targetPage = page;

    async function fetchJobs() {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, string | number> = {
          page: targetPage,
          limit,
          sort: sortField,
          order: sortOrder,
        };
        if (debouncedPosition) params.position_type_id = debouncedPosition;
        const res = await api.get("/jobs", { params });
        setJobs(res.data.results);
        setCount(res.data.count);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load jobs"
            : "Failed to load jobs"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, [page, debouncedPosition, sortField, sortOrder]);

  // reset page to 1 when filter/sort changes (separate from fetch to avoid stale page)
  const prevFiltersRef = useRef({ debouncedPosition, sortField, sortOrder });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.debouncedPosition !== debouncedPosition ||
      prev.sortField !== sortField ||
      prev.sortOrder !== sortOrder
    ) {
      prevFiltersRef.current = { debouncedPosition, sortField, sortOrder };
      setPage(1);
    }
  }, [debouncedPosition, sortField, sortOrder]);

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="Jobs page-enter">
      <div className="jobs-header">
        <h1>Browse jobs</h1>
        <p className="jobs-subtitle">
          {count} open position{count !== 1 ? "s" : ""}
        </p>
      </div>

      {/* filter + sort controls */}
      <div className="jobs-controls">
        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="jobs-filter"
        >
          <option value="">All positions</option>
          {positionTypes.map((pt) => (
            <option key={pt.id} value={pt.id}>
              {pt.name}
            </option>
          ))}
        </select>

        <div className="jobs-sort">
          <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
            <option value="start_time">Start date</option>
            <option value="salary_min">Min salary</option>
            <option value="salary_max">Max salary</option>
            <option value="updatedAt">Recently updated</option>
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : jobs.length === 0 ? (
        <p className="empty-state">No jobs match your filters</p>
      ) : (
        <>
          <div className="jobs-list">
            {jobs.map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="job-row">
                <div className="job-row-left">
                  <span className="job-position">{job.position_type.name}</span>
                  <span className="job-business">{job.business.business_name}</span>
                </div>
                <div className="job-row-right">
                  <span className="job-salary">
                    ${job.salary_min}–${job.salary_max}/hr
                  </span>
                  <span className="job-date">{new Date(job.start_time).toLocaleDateString()}</span>
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
