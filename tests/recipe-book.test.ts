import { describe, expect, it } from "vitest";
import { recipeCommunities, totalRecipeCount } from "@/lib/recipe-book";

describe("recipeCommunities", () => {
  it("has several sourced recipes for each community", () => {
    expect(recipeCommunities.length).toBeGreaterThanOrEqual(4);

    recipeCommunities.forEach((community) => {
      expect(community.recipes.length).toBeGreaterThanOrEqual(3);
    });

    expect(totalRecipeCount).toBeGreaterThanOrEqual(12);
  });

  it("uses deterministic and unique recipe ids", () => {
    const recipeIds = recipeCommunities.flatMap((community) =>
      community.recipes.map((recipe) => recipe.id)
    );

    expect(new Set(recipeIds).size).toBe(recipeIds.length);
    recipeIds.forEach((id) => {
      expect(id).toMatch(/^h_[a-z0-9]+$/);
    });
  });

  it("keeps recipes sourced and free of placeholder media", () => {
    recipeCommunities.forEach((community) => {
      community.recipes.forEach((recipe) => {
        expect(recipe.sourceName).toBe("Jewish Food Society");
        expect(recipe.sourceUrl).toMatch(/^https:\/\/www\.jewishfoodsociety\.org\/recipes\//);
        expect(recipe.sourceUrl).not.toContain("placeholder");
        expect(recipe.ingredients.length).toBeGreaterThan(3);
        expect(recipe.methodSummary.length).toBeGreaterThan(30);
      });
    });
  });
});
