import Link from "next/link";
import { SearchIcon } from "@/components/icons";

interface SearchPanelProps {
  q?: string;
  location?: string;
  idPrefix?: string;
  action?: string;
  showReset?: boolean;
  resetHref?: string;
}

export function SearchPanel({
  q = "",
  location = "",
  idPrefix = "search",
  action = "/jobs",
  showReset = false,
  resetHref = "/jobs",
}: SearchPanelProps) {
  const qId = `${idPrefix}-q`;
  const locationId = `${idPrefix}-location`;

  return (
    <div className="search-block">
      <form className="search-panel" action={action} method="get" role="search">
        <div className="field">
          <label className="label" htmlFor={qId}>
            Job title or keyword
          </label>
          <input
            className="input"
            id={qId}
            name="q"
            type="search"
            placeholder="e.g. Quality Control Analyst"
            defaultValue={q}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label className="label" htmlFor={locationId}>
            Location
          </label>
          <input
            className="input"
            id={locationId}
            name="location"
            type="search"
            placeholder="City or state"
            defaultValue={location}
            autoComplete="address-level2"
          />
        </div>
        <button className="btn btn-primary search-submit" type="submit">
          <SearchIcon size={17} />
          Search Jobs
        </button>
      </form>
      {showReset ? (
        <p className="search-reset-row">
          <Link href={resetHref}>Clear search and filters</Link>
        </p>
      ) : null}
    </div>
  );
}
