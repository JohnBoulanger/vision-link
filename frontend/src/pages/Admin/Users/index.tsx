import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "../../../utils/api";
import useDebounce from "../../../hooks/useDebounce";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  activated: boolean;
  suspended: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters
  const [keyword, setKeyword] = useState("");
  const [activatedFilter, setActivatedFilter] = useState("");
  const [suspendedFilter, setSuspendedFilter] = useState("");

  // per-row suspend loading state
  const [pendingId, setPendingId] = useState<number | null>(null);

  const limit = 15;
  const debouncedKeyword = useDebounce(keyword, 300);

  // track previous filter values to detect changes and reset page atomically
  const prevFiltersRef = useRef({ debouncedKeyword, activatedFilter, suspendedFilter });

  // fetch users list — resets to page 1 when filters change to avoid stale-page fetches
  useEffect(() => {
    // detect filter change and reset page inline so only one fetch fires
    let activePage = page;
    const prev = prevFiltersRef.current;
    if (
      prev.debouncedKeyword !== debouncedKeyword ||
      prev.activatedFilter !== activatedFilter ||
      prev.suspendedFilter !== suspendedFilter
    ) {
      prevFiltersRef.current = { debouncedKeyword, activatedFilter, suspendedFilter };
      activePage = 1;
      setPage(1);
    }

    async function fetchUsers() {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, unknown> = { page: activePage, limit };
        if (debouncedKeyword) params.keyword = debouncedKeyword;
        if (activatedFilter !== "") params.activated = activatedFilter;
        if (suspendedFilter !== "") params.suspended = suspendedFilter;

        const res = await api.get("/users", { params });
        setUsers(res.data.results);
        setCount(res.data.count);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load users."
            : "Failed to load users."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [page, debouncedKeyword, activatedFilter, suspendedFilter]);

  // toggle suspend status for a single user
  async function toggleSuspend(user: User) {
    setPendingId(user.id);
    try {
      await api.patch(`/users/${user.id}/suspended`, { suspended: !user.suspended });
      // update locally — no refetch needed
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, suspended: !u.suspended } : u))
      );
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Failed to update suspension status."
          : "Failed to update suspension status."
      );
    } finally {
      setPendingId(null);
    }
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="AdminUsers page-enter">
      <div className="admin-page-header">
        <div>
          <h1>Users</h1>
          <p className="admin-subtitle">
            {count} registered user{count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* search + filter controls */}
      <div className="admin-controls">
        <input
          className="admin-search"
          type="text"
          placeholder="Search name, email, phone…"
          aria-label="Search users"
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
          aria-label="Filter by suspension"
          value={suspendedFilter}
          onChange={(e) => setSuspendedFilter(e.target.value)}
        >
          <option value="">All users</option>
          <option value="false">Active only</option>
          <option value="true">Suspended only</option>
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
      ) : users.length === 0 ? (
        <p className="empty-state">No users match your filters.</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Activated</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className={user.suspended ? "admin-row-suspended" : ""}>
                    <td className="admin-td-name">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="admin-td-email">{user.email}</td>
                    <td>{user.phone_number || "—"}</td>
                    <td>
                      <span
                        className={`admin-badge ${user.activated ? "badge-green" : "badge-grey"}`}
                      >
                        {user.activated ? "activated" : "pending"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`admin-badge ${user.suspended ? "badge-red" : "badge-green"}`}
                      >
                        {user.suspended ? "suspended" : "active"}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn-sm ${user.suspended ? "btn-secondary" : "btn-danger"}`}
                        disabled={pendingId === user.id}
                        onClick={() => toggleSuspend(user)}
                      >
                        {pendingId === user.id ? "…" : user.suspended ? "Unsuspend" : "Suspend"}
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
