import type { Metadata } from "next";
import RecipeBook from "@/components/RecipeBook";
import { recipeCommunities, totalRecipeCount } from "@/lib/recipe-book";

export const metadata: Metadata = {
  title: "ספר מתכונים ממוין לעדות",
  description: `ספר מתכונים נפתח בעברית עם ${totalRecipeCount} מתכונים ממקורות גלויים, מחולק לפי עדות.`,
  alternates: {
    canonical: "/recipes",
  },
};

export default function RecipesPage() {
  return <RecipeBook communities={recipeCommunities} />;
}
