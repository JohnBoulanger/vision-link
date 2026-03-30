import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api from "../../../utils/api";
import useDebounce from "../../../hooks/useDebounce";
import Pagination from "../../../components/Pagination";
import LoadingSpinner from "../../../components/LoadingSpinner";
import "./style.css";

interface Business {
  id: number;
  business_name: string;
  email: string;
  phone_number: string;
  postal_address: string;
}

export default function BusinessList() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const keyword = useDebounce(searchInput, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 10;

  // fetch businesses when debounced filters change
  useEffect(() => {
    async function fetchBusinesses() {
      setLoading(true);
      setError("");
      try {
        const params: Record<string, string | number> = { page, limit };
        if (keyword) params.keyword = keyword;
        const response = await api.get("/businesses", { params });
        setBusinesses(response.data.results);
        setCount(response.data.count);
      } catch (err) {
        setError(
          axios.isAxiosError(err)
            ? err.response?.data?.error || "Failed to load businesses"
            : "Failed to load businesses"
        );
      } finally {
        setLoading(false);
      }
    }
    fetchBusinesses();
  }, [page, keyword]);

  // reset to page 1 when debounced keyword changes
  useEffect(() => {
    setPage(1);
  }, [keyword]);

  function handleKeywordChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
  }

  const totalPages = Math.ceil(count / limit);

  return (
    <div className="BusinessList page-enter">
      <h1>Dental clinics</h1>

      {/* search controls */}
      <div className="list-controls">
        <input
          type="text"
          placeholder="Search clinics..."
          value={searchInput}
          onChange={handleKeywordChange}
          className="search-input"
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : businesses.length === 0 ? (
        <p className="empty-state">No clinics found</p>
      ) : (
        <>
          <div className="business-grid">
            {businesses.map((b) => (
              <Link key={b.id} to={`/businesses/${b.id}`} className="business-card">
                <h3>{b.business_name}</h3>
                <p className="business-email">{b.email}</p>
                <p className="business-detail">{b.phone_number}</p>
                <p className="business-detail">{b.postal_address}</p>
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
