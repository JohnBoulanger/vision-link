import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "../../../utils/api";
import useDebounce from "../../../hooks/useDebounce";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "../Users/style.css";
import "./style.css";

interface PositionType {
  id: number;
  name: string;
  description: string;
  hidden: boolean;
  num_qualified: number;
}

interface EditForm {
  name: string;
  description: string;
  hidden: boolean;
}

export default function AdminPositionTypes() {
  const [posTypes, setPosTypes] = useState<PositionType[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filters + sort
  const [keyword, setKeyword] = useState("");
  const [hiddenFilter, setHiddenFilter] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // inline edit state — keyed by id
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", description: "", hidden: false });
  const [editPending, setEditPending] = useState(false);
  const [editError, setEditError] = useState("");

  // delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", hidden: false });
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState("");

  const limit = 15;
  const debouncedKeyword = useDebounce(keyword, 300);

  // track previous filter values to detect changes and reset page atomically
  const prevFiltersRef = useRef({ debouncedKeyword, hiddenFilter, sortField, sortOrder });

  // fetch position types — resets to page 1 when filters change to avoid stale-page fetches
  useEffect(() => {
    let activePage = page;
    const prev = prevFiltersRef.current;
    if (
      prev.debouncedKeyword !== debouncedKeyword ||
      prev.hiddenFilter !== hiddenFilter ||
      prev.sortField !== sortField ||
      prev.sortOrder !== sortOrder
    ) {
      prevFiltersRef.current = { debouncedKeyword, hiddenFilter, sortField, sortOrder };
      activePage = 1;
      setPage(1);
    }

    async function fetchPosTypes() {
      setLoading(true);
      setError("");
      try {
        // api uses separate sort keys: send only the active sort field key
        // e.g. { name: "asc" } or { num_qualified: "desc" } — never both at once
        const params: Record<string, unknown> = {
          page: activePage,
          limit,
          [sortField]: sortOrder,
        };
        if (debouncedKeyword) params.keyword = debouncedKeyword;
        if (hiddenFilter !== "") params.hidden = hiddenFilter;

        const res = await api.get("/position-types", { params });
        setPosTypes(res.data.results);
        setCount(res.data.count);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load position types."
            : "Failed to load position types."
        );
      } finally {
        setLoading(false);
      }
    }
    fetchPosTypes();
  }, [page, debouncedKeyword, hiddenFilter, sortField, sortOrder]);

  // open inline edit for a row
  function startEdit(pt: PositionType) {
    setEditingId(pt.id);
    setEditForm({ name: pt.name, description: pt.description, hidden: pt.hidden });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function saveEdit(id: number) {
    if (!editForm.name.trim() || !editForm.description.trim()) {
      setEditError("Name and description are required.");
      return;
    }
    setEditPending(true);
    setEditError("");
    try {
      const res = await api.patch(`/position-types/${id}`, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        hidden: editForm.hidden,
      });
      setPosTypes((prev) => prev.map((pt) => (pt.id === id ? { ...pt, ...res.data } : pt)));
      setEditingId(null);
    } catch (err) {
      setEditError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Failed to save changes."
          : "Failed to save changes."
      );
    } finally {
      setEditPending(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletePending(true);
    try {
      await api.delete(`/position-types/${id}`);
      setPosTypes((prev) => prev.filter((pt) => pt.id !== id));
      setCount((c) => c - 1);
      setConfirmDeleteId(null);
    } catch (err) {
      // 409 = qualified users exist — can't delete
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || "Delete failed."
        : "Delete failed.";
      setError(msg);
      setConfirmDeleteId(null);
    } finally {
      setDeletePending(false);
    }
  }

  async function handleCreate(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.description.trim()) {
      setCreateError("Name and description are required.");
      return;
    }
    setCreatePending(true);
    setCreateError("");
    try {
      const res = await api.post("/position-types", {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        hidden: createForm.hidden,
      });
      // prepend to list so it's visible immediately
      setPosTypes((prev) => [res.data, ...prev]);
      setCount((c) => c + 1);
      setCreateForm({ name: "", description: "", hidden: false });
      setShowCreate(false);
    } catch (err) {
      setCreateError(
        axios.isAxiosError(err)
          ? err.response?.data?.error || "Failed to create position type."
          : "Failed to create position type."
      );
    } finally {
      setCreatePending(false);
    }
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="AdminPositionTypes page-enter">
      <div className="admin-page-header">
        <div>
          <h1>Position Types</h1>
          <p className="admin-subtitle">
            {count} type{count !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancel" : "+ New type"}
        </button>
      </div>

      {/* create form */}
      {showCreate && (
        <form className="pt-create-form" onSubmit={handleCreate}>
          {createError && <p className="error-message">{createError}</p>}
          <input
            type="text"
            placeholder="Name"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            required
          />
          <textarea
            placeholder="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            rows={2}
            required
          />
          <label className="pt-toggle-label">
            <input
              type="checkbox"
              checked={createForm.hidden}
              onChange={(e) => setCreateForm({ ...createForm, hidden: e.target.checked })}
            />
            Hidden (not visible to users)
          </label>
          <button type="submit" className="btn-primary btn-sm" disabled={createPending}>
            {createPending ? "Creating…" : "Create"}
          </button>
        </form>
      )}

      <div className="admin-controls">
        <input
          className="admin-search"
          type="text"
          placeholder="Search name or description…"
          aria-label="Search position types"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          aria-label="Filter by visibility"
          value={hiddenFilter}
          onChange={(e) => setHiddenFilter(e.target.value)}
        >
          <option value="">All visibility</option>
          <option value="false">Visible</option>
          <option value="true">Hidden</option>
        </select>
        <select
          aria-label="Sort field"
          value={sortField}
          onChange={(e) => {
            setSortField(e.target.value);
            setSortOrder("asc");
          }}
        >
          <option value="name">Sort: name</option>
          <option value="num_qualified">Sort: qualified users</option>
        </select>
        <select
          aria-label="Sort order"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
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
      ) : posTypes.length === 0 ? (
        <p className="empty-state">No position types found.</p>
      ) : (
        <>
          <div className="pt-list">
            {posTypes.map((pt) => (
              <div key={pt.id} className={`pt-item ${pt.hidden ? "pt-item-hidden" : ""}`}>
                {editingId === pt.id ? (
                  /* inline edit form */
                  <div className="pt-edit-form">
                    {editError && <p className="error-message">{editError}</p>}
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Name"
                    />
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      placeholder="Description"
                    />
                    <label className="pt-toggle-label">
                      <input
                        type="checkbox"
                        checked={editForm.hidden}
                        onChange={(e) => setEditForm({ ...editForm, hidden: e.target.checked })}
                      />
                      Hidden
                    </label>
                    <div className="pt-edit-btns">
                      <button
                        className="btn-primary btn-sm"
                        disabled={editPending}
                        onClick={() => saveEdit(pt.id)}
                      >
                        {editPending ? "Saving…" : "Save"}
                      </button>
                      <button className="btn-secondary btn-sm" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* normal display row */
                  <div className="pt-row">
                    <div className="pt-row-info">
                      <span className="pt-name">{pt.name}</span>
                      {pt.hidden && <span className="admin-badge badge-grey">hidden</span>}
                      <span className="pt-desc">{pt.description}</span>
                    </div>
                    <div className="pt-row-meta">
                      <span className="pt-qualified">{pt.num_qualified} qualified</span>
                    </div>
                    <div className="pt-row-actions">
                      <button className="btn-secondary btn-sm" onClick={() => startEdit(pt)}>
                        Edit
                      </button>
                      {confirmDeleteId === pt.id ? (
                        <>
                          <span className="pt-delete-confirm">Delete?</span>
                          <button
                            className="btn-danger btn-sm"
                            disabled={deletePending}
                            onClick={() => handleDelete(pt.id)}
                          >
                            {deletePending ? "…" : "Yes"}
                          </button>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            No
                          </button>
                        </>
                      ) : pt.num_qualified > 0 ? (
                        // show inline reason instead of title (title is unreliable on disabled buttons)
                        <span className="pt-no-delete-hint">
                          {pt.num_qualified} user{pt.num_qualified !== 1 ? "s" : ""} qualified —
                          cannot delete
                        </span>
                      ) : (
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => setConfirmDeleteId(pt.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
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
