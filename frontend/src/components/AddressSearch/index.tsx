import { useEffect, useId, useRef, useState } from "react";
import useDebounce from "../../hooks/useDebounce";
import "./style.css";

// nominatim result shape — only the fields we use
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface Suggestion {
  placeId: number;
  label: string; // human-readable short label shown in dropdown + filled into input
  fullLabel: string; // full display_name passed to onSelect as canonical address
  lat: number;
  lon: number;
}

interface AddressSearchProps {
  // called when the user selects a suggestion
  onSelect: (address: string, lat: number, lon: number) => void;
  placeholder?: string;
  required?: boolean;
  // initial text value to show (e.g. when editing an existing address)
  initialValue?: string;
}

// builds a concise label from nominatim address components.
// defined outside the component to avoid recreation on every render.
// falls back gracefully for unnamed places, non-latin scripts, etc.
function shortLabel(result: NominatimResult): string {
  const addr = result.address;

  // no address data at all — use the full display_name which nominatim
  // always provides, even for non-latin scripts
  if (!addr) return result.display_name;

  const road = addr.road;
  // city-level: prefer city, fall back to town, then village, then county
  const city = addr.city ?? addr.town ?? addr.village ?? addr.county;
  const region = addr.state;
  const country = addr.country;

  // build parts — skip undefined / empty strings
  const parts: string[] = [];
  if (road) parts.push(road);
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country) parts.push(country);

  // if we ended up with nothing meaningful (e.g. unnamed place with only
  // internal nominatim fields), fall back to the full display_name
  if (parts.length === 0) return result.display_name;

  return parts.join(", ");
}

// deduplicates suggestions by place_id before storing in state
function dedupeResults(results: NominatimResult[]): NominatimResult[] {
  const seen = new Set<number>();
  return results.filter((r) => {
    if (seen.has(r.place_id)) return false;
    seen.add(r.place_id);
    return true;
  });
}

const LISTBOX_SUFFIX = "-listbox";

export default function AddressSearch({
  onSelect,
  placeholder = "Search address…",
  required,
  initialValue = "",
}: AddressSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // tracks whether the user has made a valid selection (lat/lon set)
  const [selected, setSelected] = useState(!!initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // use react's useId to get a stable id for aria-controls
  const uid = useId();
  const listboxId = uid + LISTBOX_SUFFIX;

  const debouncedQuery = useDebounce(query, 300);

  // fetch suggestions from nominatim when debounced query changes
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    // use AbortController so that when the effect re-runs (new query),
    // the previous in-flight request is cancelled and its setState is skipped
    const controller = new AbortController();
    setLoading(true);

    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(trimmed)}`,
      {
        signal: controller.signal,
        headers: { "Accept-Language": "en" },
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error(`nominatim ${res.status}`);
        return res.json() as Promise<NominatimResult[]>;
      })
      .then((raw) => {
        // deduplicate by place_id before mapping — runs before setState so we
        // never store duplicated state that requires another render to fix
        const unique = dedupeResults(raw);
        // also deduplicate by shortLabel so the dropdown shows no repeated text
        const seenLabels = new Set<string>();
        const mapped: Suggestion[] = unique
          .map((r) => ({
            placeId: r.place_id,
            label: shortLabel(r),
            fullLabel: r.display_name,
            lat: parseFloat(r.lat),
            lon: parseFloat(r.lon),
          }))
          .filter((s) => {
            if (seenLabels.has(s.label)) return false;
            seenLabels.add(s.label);
            return true;
          });
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
        setLoading(false);
      })
      .catch((err) => {
        // AbortError is expected on cleanup — not a real error
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
          setOpen(false);
          setLoading(false);
        }
      });

    return () => {
      // cancel the in-flight request when query changes or component unmounts
      controller.abort();
    };
  }, [debouncedQuery]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    // typing again after a prior selection means the selection is now stale
    setSelected(false);
  }

  function handleSelect(s: Suggestion) {
    setQuery(s.label);
    setSuggestions([]);
    setOpen(false);
    setSelected(true);
    onSelect(s.fullLabel, s.lat, s.lon);
  }

  // reopen dropdown on focus if there are already fetched suggestions for the
  // current query (user focused away without selecting, then re-focused)
  function handleFocus() {
    if (suggestions.length > 0 && !selected) {
      setOpen(true);
    }
  }

  function handleBlur() {
    setOpen(false);
  }

  // prevent Enter from submitting the surrounding form while the dropdown is open
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && open) {
      e.preventDefault();
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="addr-search-wrap">
      <input
        ref={inputRef}
        type="text"
        className={loading ? "addr-search-input addr-search-input--loading" : "addr-search-input"}
        placeholder={placeholder}
        value={query}
        required={required}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? listboxId : undefined}
        role="combobox"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul id={listboxId} className="addr-search-dropdown" role="listbox">
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              role="option"
              aria-selected={false}
              className="addr-search-option"
              // preventDefault stops the input from blurring before the click
              // registers; this is intentional and correct for mouse interactions.
              // touch events do not trigger onBlur the same way, so touch also works.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
