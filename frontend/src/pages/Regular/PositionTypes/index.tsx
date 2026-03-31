import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface PositionType {
  id: number;
  name: string;
  description: string;
}

export default function RegularPositionTypes() {
  const [positionTypes, setPositionTypes] = useState<PositionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // qualification create state
  const [creating, setCreating] = useState<number | null>(null);
  const [createNote, setCreateNote] = useState("");
  const [createError, setCreateError] = useState<Record<number, string>>({});
  const [createSuccess, setCreateSuccess] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api
      .get("/position-types")
      .then((res) => setPositionTypes(res.data.results ?? res.data))
      .catch((err) => {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load position types."
            : "Failed to load position types."
        );
      })
      .finally(() => setLoading(false));
  }, []);

  // submit a new qualification request for a position type
  async function handleCreate(positionTypeId: number) {
    setCreateError((prev) => ({ ...prev, [positionTypeId]: "" }));
    try {
      await api.post("/qualifications", {
        position_type_id: positionTypeId,
        note: createNote,
      });
      setCreateSuccess((prev) => ({ ...prev, [positionTypeId]: true }));
      setCreating(null);
      setCreateNote("");
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || "Failed to create qualification."
        : "Failed to create qualification.";
      setCreateError((prev) => ({ ...prev, [positionTypeId]: msg }));
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="RegularPositionTypes page-enter">
      <div className="pt-header">
        <h1>Position types</h1>
        <p className="pt-subtitle">
          Select a position type to request a qualification. Once approved, you'll appear as a
          candidate for matching jobs.
        </p>
      </div>

      {error && <p className="error-message">{error}</p>}

      {positionTypes.length === 0 ? (
        <p className="empty-state">No position types available.</p>
      ) : (
        <div className="pt-list">
          {positionTypes.map((pt) => (
            <div key={pt.id} className="pt-card">
              <div className="pt-card-body">
                <h2>{pt.name}</h2>
                {pt.description && <p className="pt-description">{pt.description}</p>}
              </div>

              <div className="pt-card-actions">
                {/* show inline create form when this card is selected */}
                {creating === pt.id ? (
                  <div className="pt-create-form">
                    {createError[pt.id] && (
                      <p className="error-message">{createError[pt.id]}</p>
                    )}
                    <textarea
                      className="pt-note-input"
                      placeholder="Optional note for the reviewer..."
                      value={createNote}
                      onChange={(e) => setCreateNote(e.target.value)}
                      rows={2}
                    />
                    <div className="pt-create-actions">
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleCreate(pt.id)}
                      >
                        Submit request
                      </button>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setCreating(null);
                          setCreateNote("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : createSuccess[pt.id] ? (
                  <span className="pt-success">
                    Request submitted —{" "}
                    <Link to="/qualifications">view qualifications</Link>
                  </span>
                ) : (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setCreating(pt.id)}
                  >
                    Request qualification
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
