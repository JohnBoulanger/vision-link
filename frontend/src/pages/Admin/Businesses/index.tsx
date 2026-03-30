import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import useDebounce from "../../../hooks/useDebounce";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "../Users/style.css";
import "./style.css";

interface Business {
  id: number;
  business_name: string;
  owner_name: string;
  email: string;
  phone_number: string;
  activated: boolean;
  verified: boolean;
}

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters + sort
  const [keyword, setKeyword] = useState("");
  const [activatedFilter, setActivatedFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [sortField, setSortField] = useState("business_name");
  const [sortOrder, setSortOrder] = useState("asc");

  // per-row verify loading
  const [pendingId, setPendingId] = useState<number | null>(null);

  const limit = 15;
  const debouncedKeyword = useDebounce(keyword, 300);

  // track previous filter values to detect changes and reset page atomically
  const prevFiltersRef = useRef({
    debouncedKeyword,
    activatedFilter,
    verifiedFilter,
    sortField,
    sortOrder,
  });

  // fetch businesses — resets to page 1 when filters change to avoid stale-page fetches
  useEffect(() => {
    let activePage = page;
    const prev = prevFiltersRef.current;
    if (
      prev.debouncedKeyword !== debouncedKeyword ||
      prev.activatedFilter !== activatedFilter ||
      prev.verifiedFilter !== verifiedFilter ||
      prev.sortField !== sortField ||
      prev.sortOrder !== sortOrder
    ) {
      prevFiltersRef.current = {
        debouncedKeyword,
        activatedFilter,
        verifiedFilter,
        sortField,
        sortOrder,
      };
      activePage = 1;
      setPage(1);
    }

    async function fetchBusinesses() {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, unknown> = {
          page: activePage,
          limit,
          sort: sortField,
          order: sortOrder,
        };
        if (debouncedKeyword) params.keyword = debouncedKeyword;
        if (activatedFilter !== "") params.activated = activatedFilter;
        if (verifiedFilter !== "") params.verified = verifiedFilter;

        const res = await api.get("/businesses", { params });
        setBusinesses(res.data.results);
        setCount(res.data.count);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load businesses."
            : "Failed to load businesses."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchBusinesses();
  }, [page, debouncedKeyword, activatedFilter, verifiedFilter, sortField, sortOrder]);

  // toggle verified status for a single business
  async function toggleVerify(biz: Business) {
    setPendingId(biz.id);
    try {
      await api.patch(`/businesses/${biz.id}/verified`, { verified: !biz.verified });
      setBusinesses((prev) =>
        prev.map((b) => (b.id === biz.id ? { ...b, verified: !b.verified } : b))
      );
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Failed to update verification status."
          : "Failed to update verification status."
      );
    } finally {
      setPendingId(null);
    }
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="AdminBusinesses page-enter">
      <div className="admin-page-header">
        <div>
          <h1>Businesses</h1>
          <p className="admin-subtitle">
            {count} registered clinic{count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="admin-controls">
        <input
          className="admin-search"
          type="text"
          placeholder="Search name, owner, email, phone…"
          aria-label="Search businesses"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          aria-label="Filter by activation"
          value={activatedFilter}
          onChange={(e) => setActivatedFilter(e.target.value)}
        >
          <option value="">All activation</option>
          <option value="true">Activated</option>
          <option value="false">Not activated</option>
        </select>
        <select
          aria-label="Filter by verification"
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
        >
          <option value="">All verification</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select
          aria-label="Sort field"
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
        >
          <option value="business_name">Sort: name</option>
          <option value="owner_name">Sort: owner</option>
          <option value="email">Sort: email</option>
        </select>
        <select
          aria-label="Sort order"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
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
      ) : businesses.length === 0 ? (
        <p className="empty-state">No businesses match your filters.</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Owner</th>
                  <th>Email</th>
                  <th>Activated</th>
                  <th>Verified</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((biz) => (
                  <tr key={biz.id}>
                    <td className="admin-td-name">
                      <Link to={`/businesses/${biz.id}`} className="admin-link">
                        {biz.business_name}
                      </Link>
                    </td>
                    <td>{biz.owner_name}</td>
                    <td className="admin-td-email">{biz.email}</td>
                    <td>
                      <span
                        className={`admin-badge ${biz.activated ? "badge-green" : "badge-grey"}`}
                      >
                        {biz.activated ? "activated" : "pending"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${biz.verified ? "badge-green" : "badge-amber"}`}
                      >
                        {biz.verified ? "verified" : "unverified"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn-sm ${biz.verified ? "btn-danger" : "btn-primary"}`}
                        disabled={pendingId === biz.id}
                        onClick={() => toggleVerify(biz)}
                      >
                        {pendingId === biz.id ? "…" : biz.verified ? "Unverify" : "Verify"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
