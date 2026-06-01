"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  ChevronLeft,
  Clock3,
  ExternalLink,
  LibraryBig,
  ListChecks,
  Search,
  UsersRound,
  Utensils,
  X,
} from "lucide-react";
import type { Recipe, RecipeCommunity } from "@/lib/recipe-book";

type RecipeBookProps = {
  communities: readonly RecipeCommunity[];
};

type RecipeSearchResult = {
  community: RecipeCommunity;
  recipe: Recipe;
};

const normalizeSearch = (value: string) =>
  value.trim().toLocaleLowerCase("he-IL");

function recipeMatchesQuery(
  normalizedQuery: string,
  community: RecipeCommunity,
  recipe: Recipe
) {
  const searchableValues = [
    community.name,
    community.region,
    community.description,
    recipe.name,
    recipe.originalName,
    recipe.type,
    recipe.time,
    recipe.servings,
    recipe.methodSummary,
    recipe.note,
    ...recipe.ingredients,
  ];

  return searchableValues.some((value) =>
    value.toLocaleLowerCase("he-IL").includes(normalizedQuery)
  );
}

export default function RecipeBook({ communities }: RecipeBookProps) {
  const firstCommunity = communities[0];
  const [activeCommunityId, setActiveCommunityId] = useState(firstCommunity?.id ?? "");
  const [activeRecipeId, setActiveRecipeId] = useState(
    firstCommunity?.recipes[0]?.id ?? ""
  );
  const [query, setQuery] = useState("");

  const totalRecipes = useMemo(
    () => communities.reduce((count, community) => count + community.recipes.length, 0),
    [communities]
  );

  const activeCommunity = useMemo(
    () =>
      communities.find((community) => community.id === activeCommunityId) ??
      firstCommunity,
    [activeCommunityId, communities, firstCommunity]
  );

  const activeRecipe = useMemo(() => {
    if (!activeCommunity) {
      return undefined;
    }

    return (
      activeCommunity.recipes.find((recipe) => recipe.id === activeRecipeId) ??
      activeCommunity.recipes[0]
    );
  }, [activeCommunity, activeRecipeId]);

  const normalizedQuery = normalizeSearch(query);
  const searchResults = useMemo<RecipeSearchResult[]>(() => {
    if (!normalizedQuery) {
      return [];
    }

    return communities.flatMap((community) =>
      community.recipes
        .filter((recipe) => recipeMatchesQuery(normalizedQuery, community, recipe))
        .map((recipe) => ({ community, recipe }))
    );
  }, [communities, normalizedQuery]);

  const selectCommunity = (community: RecipeCommunity) => {
    setActiveCommunityId(community.id);
    setActiveRecipeId(community.recipes[0]?.id ?? "");
  };

  const selectRecipe = (community: RecipeCommunity, recipe: Recipe) => {
    setActiveCommunityId(community.id);
    setActiveRecipeId(recipe.id);
    setQuery("");
  };

  if (!firstCommunity || !activeCommunity || !activeRecipe) {
    return (
      <section lang="he" dir="rtl" className="min-h-screen bg-stone-50 px-4 py-16 text-slate-900">
        <div className="mx-auto max-w-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold">אין מתכונים זמינים כרגע.</p>
        </div>
      </section>
    );
  }

  return (
    <section
      lang="he"
      dir="rtl"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f8fafc_32%,#fff7ed_100%)] px-4 py-10 text-slate-950 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-6 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 border border-amber-300 bg-white/80 px-3 py-2 text-sm font-semibold text-amber-900 shadow-sm">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              ספר מתכונים נפתח
            </div>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              ספר מתכונים ממוין לעדות
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
              אוסף מתכונים מסודר לפי עדות, עם מקור לכל מתכון, רכיבים מרכזיים
              ותמצית הכנה מקורית בעברית.
            </p>
          </div>
          <div className="flex items-center gap-3 border border-slate-200 bg-white/90 px-4 py-3 shadow-sm">
            <LibraryBig className="h-9 w-9 text-teal-700" aria-hidden="true" />
            <div>
              <p className="text-2xl font-black">
                {communities.length} עדות · {totalRecipes} מתכונים
              </p>
              <p className="text-sm text-slate-600">כולם עם קישורי מקור</p>
            </div>
          </div>
        </header>

        <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="relative">
            <label htmlFor="recipe-book-search" className="sr-only">
              חיפוש בספר המתכונים
            </label>
            <Search
              className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <input
              id="recipe-book-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full border border-slate-300 bg-white/90 py-4 pr-12 pl-12 text-base font-semibold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
              placeholder="חיפוש לפי עדה, מתכון או רכיב"
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-slate-200 bg-white text-slate-700 transition hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                aria-label="ניקוי חיפוש"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <p className="min-w-48 border border-amber-200 bg-white/80 px-4 py-3 text-sm font-bold leading-6 text-slate-700">
            {activeCommunity.name}: {activeCommunity.recipes.length} מתכונים
          </p>
        </div>

        <SearchResults
          query={normalizedQuery}
          results={searchResults}
          activeRecipe={activeRecipe}
          onSelectRecipe={selectRecipe}
        />

        <div className="relative overflow-hidden rounded-[2rem] border border-amber-900/20 bg-amber-950 p-3 shadow-2xl shadow-slate-950/20">
          <div className="absolute inset-x-10 top-0 h-2 bg-amber-700/70" />
          <div className="relative grid min-h-[760px] gap-0 overflow-hidden rounded-[1.45rem] bg-stone-100 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="pointer-events-none absolute inset-y-8 left-1/2 z-20 hidden w-10 -translate-x-1/2 bg-linear-to-r from-black/20 via-white/70 to-black/20 blur-[1px] lg:block" />
            <BookIndexPage
              communities={communities}
              activeCommunity={activeCommunity}
              activeRecipe={activeRecipe}
              onSelectCommunity={selectCommunity}
            />
            <RecipeDetailPage
              community={activeCommunity}
              activeRecipe={activeRecipe}
              onSelectRecipe={setActiveRecipeId}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function BookIndexPage({
  communities,
  activeCommunity,
  activeRecipe,
  onSelectCommunity,
}: {
  communities: readonly RecipeCommunity[];
  activeCommunity: RecipeCommunity;
  activeRecipe: Recipe;
  onSelectCommunity: (community: RecipeCommunity) => void;
}) {
  return (
    <aside className="relative bg-[#fffdf5] px-5 py-7 shadow-inner sm:px-8 lg:rounded-r-[1.25rem] lg:px-10">
      <div className="absolute inset-y-0 left-0 hidden w-14 bg-linear-to-l from-black/10 to-transparent lg:block" />
      <div className="relative z-10">
        <div className="mb-7 flex items-center justify-between gap-4 border-b border-amber-200 pb-4">
          <div>
            <p className="text-sm font-bold text-amber-800">תוכן עניינים</p>
            <h2 className="text-2xl font-black text-slate-950">עדות ומתכונים</h2>
          </div>
          <Utensils className="h-7 w-7 text-rose-700" aria-hidden="true" />
        </div>

        <div className="space-y-3" role="list" aria-label="רשימת עדות">
          {communities.map((community) => {
            const isSelected = community.id === activeCommunity.id;
            const panelId = `community-${community.id}-recipes`;

            return (
              <div key={community.id} role="listitem">
                <button
                  type="button"
                  onClick={() => onSelectCommunity(community)}
                  className={`group w-full border px-4 py-4 text-right transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                    isSelected
                      ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                      : "border-amber-200 bg-white/70 text-slate-900 hover:border-slate-400 hover:bg-white"
                  }`}
                  aria-expanded={isSelected}
                  aria-controls={isSelected ? panelId : undefined}
                  aria-current={isSelected ? "page" : undefined}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block text-lg font-black">{community.name}</span>
                      <span
                        className={`mt-1 block text-sm ${
                          isSelected ? "text-slate-200" : "text-slate-600"
                        }`}
                      >
                        {community.region}
                      </span>
                    </span>
                    <span
                      className={`mt-1 inline-flex min-w-14 items-center justify-center bg-linear-to-l ${community.accent} px-3 py-1 text-sm font-black text-white`}
                      aria-label={`${community.recipes.length} מתכונים`}
                    >
                      {community.recipes.length}
                    </span>
                  </span>
                  <span
                    className={`mt-3 block text-sm leading-6 ${
                      isSelected ? "text-slate-100" : "text-slate-600"
                    }`}
                  >
                    {community.description}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div
          id={`community-${activeCommunity.id}-recipes`}
          role="region"
          aria-label={`מתכונים של ${activeCommunity.name}`}
          className="mt-8 border-t border-amber-200 pt-6"
        >
          <p className="mb-3 text-sm font-bold text-slate-500">הדף הפתוח עכשיו</p>
          <div className={`bg-linear-to-l ${activeCommunity.accent} p-5 text-white`}>
            <h3 className="text-2xl font-black">{activeRecipe.name}</h3>
            <p className="mt-2 text-sm leading-6 text-white/90">
              {activeRecipe.originalName} · {activeRecipe.type}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function RecipeDetailPage({
  community,
  activeRecipe,
  onSelectRecipe,
}: {
  community: RecipeCommunity;
  activeRecipe: Recipe;
  onSelectRecipe: (recipeId: string) => void;
}) {
  const titleId = `recipe-title-${activeRecipe.id}`;

  return (
    <article
      aria-labelledby={titleId}
      className="relative bg-[#fffaf0] px-5 py-7 sm:px-8 lg:rounded-l-[1.25rem] lg:px-10"
    >
      <div className="absolute inset-y-0 right-0 hidden w-14 bg-linear-to-r from-black/10 to-transparent lg:block" />
      <div className="relative z-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-orange-200 pb-4">
          <div>
            <p className="text-sm font-bold text-orange-800">{community.name}</p>
            <h2 id={titleId} className="text-3xl font-black text-slate-950">
              {activeRecipe.name}
            </h2>
          </div>
          <a
            href={activeRecipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:border-slate-900"
          >
            מקור
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Fact icon={<Clock3 className="h-5 w-5" aria-hidden="true" />} label="זמן" value={activeRecipe.time} />
          <Fact icon={<UsersRound className="h-5 w-5" aria-hidden="true" />} label="כמות" value={activeRecipe.servings} />
          <Fact icon={<ListChecks className="h-5 w-5" aria-hidden="true" />} label="סוג" value={activeRecipe.type} />
        </div>

        <div className="mt-7 flex flex-wrap gap-2" aria-label="בחירת מתכון">
          {community.recipes.map((recipe) => {
            const isSelected = recipe.id === activeRecipe.id;

            return (
              <button
                key={recipe.id}
                type="button"
                aria-pressed={isSelected}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelectRecipe(recipe.id)}
                className={`inline-flex items-center gap-2 border px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                  isSelected
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-orange-200 bg-white text-slate-800 hover:border-slate-500"
                }`}
              >
                {recipe.name}
                {isSelected ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[0.85fr_1fr]">
          <section aria-labelledby="ingredients-heading">
            <h3 id="ingredients-heading" className="text-xl font-black text-slate-950">
              רכיבים מרכזיים
            </h3>
            <ul className="mt-4 grid gap-2">
              {activeRecipe.ingredients.map((ingredient, index) => (
                <li
                  key={`${activeRecipe.id}-${ingredient}-${index}`}
                  className="flex items-center gap-3 border border-orange-100 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  <span className={`h-2.5 w-2.5 bg-linear-to-l ${community.accent}`} />
                  {ingredient}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="method-heading">
            <h3 id="method-heading" className="text-xl font-black text-slate-950">
              תמצית הכנה
            </h3>
            <div className="mt-4 border border-orange-100 bg-white/75 p-5 leading-8 text-slate-700 shadow-sm">
              <p>{activeRecipe.methodSummary}</p>
              <p className="mt-5 border-t border-orange-100 pt-4 text-sm font-semibold text-slate-600">
                {activeRecipe.note}
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              המקור: {activeRecipe.sourceName}. ההוראות כאן הן תקציר מקורי ולא
              העתקה מלאה של המתכון.
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}

function SearchResults({
  query,
  results,
  activeRecipe,
  onSelectRecipe,
}: {
  query: string;
  results: RecipeSearchResult[];
  activeRecipe: Recipe;
  onSelectRecipe: (community: RecipeCommunity, recipe: Recipe) => void;
}) {
  if (!query) {
    return null;
  }

  const visibleResults = results.slice(0, 6);

  return (
    <div
      className="mb-6 border border-teal-200 bg-white/90 p-4 shadow-sm"
      role="region"
      aria-label="תוצאות חיפוש מתכונים"
    >
      <p className="mb-3 text-sm font-bold text-slate-600" aria-live="polite">
        {results.length > 0 ? `${results.length} תוצאות נמצאו` : "לא נמצאו מתכונים"}
      </p>
      {visibleResults.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {visibleResults.map(({ community, recipe }) => {
            const isSelected = recipe.id === activeRecipe.id;

            return (
              <div key={`${community.id}-${recipe.id}`} role="listitem">
                <button
                  type="button"
                  onClick={() => onSelectRecipe(community, recipe)}
                  className={`w-full border px-4 py-3 text-right transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 ${
                    isSelected
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-900 hover:border-teal-700"
                  }`}
                  aria-current={isSelected ? "true" : undefined}
                >
                  <span className="block text-sm font-black">{recipe.name}</span>
                  <span className={isSelected ? "text-xs text-slate-200" : "text-xs text-slate-500"}>
                    {community.name} · {recipe.type}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm font-semibold text-slate-500">אין מידע תואם בספר המתכונים.</p>
      )}
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-orange-100 bg-white/75 p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-orange-800">
        {icon}
        <span className="text-xs font-black uppercase">{label}</span>
      </div>
      <p className="text-sm font-bold leading-6 text-slate-800">{value}</p>
    </div>
  );
}
