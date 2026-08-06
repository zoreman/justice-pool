"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import Container from "@/components/ui/Container";

type CaseItem = {
  id: string;
  title: string;
  category: string;
  raised: number | string;
  goal: number | string;
  supporters: number | string;
  days_left: number;
  views: number | string;
  created_at: string;
};

type CasesBrowserProps = {
  cases: CaseItem[];
};

const filters = [
  "All",
  "Employment",
  "Housing",
  "Civil Rights",
  "Family",
  "Immigration",
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function CasesBrowser({ cases }: CasesBrowserProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("trending");

  const filteredCases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchingCases = cases.filter((item) => {
      const normalizedCategory = item.category.toLowerCase();

      const categoryMatches =
        activeFilter === "All" ||
        normalizedCategory.includes(activeFilter.toLowerCase());

      const searchMatches =
        normalizedSearch.length === 0 ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        normalizedCategory.includes(normalizedSearch);

      return categoryMatches && searchMatches;
    });

    return [...matchingCases].sort((a, b) => {
      const aRaised = Number(a.raised) || 0;
      const bRaised = Number(b.raised) || 0;

      const aViews = Number(a.views) || 0;
      const bViews = Number(b.views) || 0;

      const aSupporters = Number(a.supporters) || 0;
      const bSupporters = Number(b.supporters) || 0;

      switch (sortBy) {
        case "funded":
          return bRaised - aRaised;

        case "viewed":
          return bViews - aViews;

        case "ending":
          return a.days_left - b.days_left;

        case "newest":
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );

        case "trending":
        default: {
          const aScore =
            aViews +
            aSupporters * 8 +
            aRaised * 0.02;

          const bScore =
            bViews +
            bSupporters * 8 +
            bRaised * 0.02;

          return bScore - aScore;
        }
      }
    });
  }, [activeFilter, cases, search, sortBy]);

  return (
    <>
      <section className="border-b border-white/10 bg-ink-950 pb-12 text-white">
        <Container>
          <div className="max-w-2xl">
            <label
              htmlFor="case-search"
              className="text-sm font-medium text-slate-300"
            >
              Search cases
            </label>

            <input
              id="case-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or category"
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-white outline-none transition placeholder:text-slate-600 focus:border-brand-400"
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-white bg-white text-ink-950"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="bg-slate-50 py-16 sm:py-20">
        <Container>
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-6">
              <p className="text-sm text-slate-500">
                {filteredCases.length}{" "}
                {filteredCases.length === 1 ? "case" : "cases"}
              </p>

              {(search || activeFilter !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("All");
                  }}
                  className="text-sm font-semibold text-brand-600 transition hover:text-brand-500"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label
                htmlFor="case-sort"
                className="text-sm text-slate-500"
              >
                Sort by
              </label>

              <select
                id="case-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-950 outline-none transition focus:border-brand-400"
              >
                <option value="trending">Trending</option>
                <option value="funded">Most funded</option>
                <option value="viewed">Most viewed</option>
                <option value="ending">Ending soon</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-8 py-20 text-center">
              <h2 className="text-2xl font-semibold text-ink-950">
                No matching cases
              </h2>

              <p className="mt-3 text-slate-500">
                Try another title or category.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {filteredCases.map((item) => {
                const raised = Number(item.raised) || 0;
                const goal = Number(item.goal) || 0;
                const supporters = Number(item.supporters) || 0;
                const views = Number(item.views) || 0;

                const progress =
                  goal > 0
                    ? Math.min(Math.round((raised / goal) * 100), 100)
                    : 0;

                return (
                  <Link
                    key={item.id}
                    href={`/cases/${item.id}`}
                    className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg sm:p-8"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                        {item.category}
                      </span>

                      <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        Verified
                      </span>
                    </div>

                    <h2 className="mt-7 break-words text-2xl font-semibold leading-tight tracking-[-0.03em] text-ink-950 sm:text-3xl">
                      {item.title}
                    </h2>

                    <div className="mt-9">
                      <div className="flex items-center justify-between gap-4 text-sm text-slate-500">
                        <span>Funding progress</span>
                        <span>{progress}%</span>
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-5">
                        <p className="text-2xl font-semibold text-ink-950">
                          {formatCurrency(raised)}
                        </p>

                        <p className="shrink-0 text-sm text-slate-500">
                          of {formatCurrency(goal)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4 border-t border-slate-200 pt-5 text-sm text-slate-500">
                      <span>
                        {supporters}{" "}
                        {supporters === 1 ? "supporter" : "supporters"}
                      </span>

                      <span className="text-center">
                        {views} {views === 1 ? "view" : "views"}
                      </span>

                      <span className="text-right">
                        {item.days_left} days left
                      </span>
                    </div>

                    <div className="mt-7 flex items-center justify-between text-sm font-semibold text-brand-600">
                      <span>View case</span>

                      <span className="transition-transform group-hover:translate-x-1">
                        →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}