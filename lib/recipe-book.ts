import { hashId } from "@/lib/utils/hashId";

export type Recipe = Readonly<{
  id: string;
  name: string;
  originalName: string;
  sourceName: string;
  sourceUrl: string;
  time: string;
  servings: string;
  type: string;
  ingredients: readonly string[];
  methodSummary: string;
  note: string;
}>;

export type RecipeCommunity = Readonly<{
  id: string;
  name: string;
  region: string;
  accent: string;
  description: string;
  recipes: readonly Recipe[];
}>;

const recipeId = (communityId: string, recipeName: string) =>
  hashId("recipe-book", communityId, recipeName);

export const recipeCommunities = [
  {
    id: "moroccan",
    name: "העדה המרוקאית",
    region: "צפון אפריקה",
    accent: "from-rose-700 via-orange-500 to-amber-400",
    description:
      "מטבח עשיר בפלפל, עגבניות, דגים, קטניות ותבשילי שבת ארוכים.",
    recipes: [
      {
        id: recipeId("moroccan", "Matbucha"),
        name: "מטבוחה",
        originalName: "Matbucha",
        sourceName: "Jewish Food Society",
        sourceUrl:
          "https://www.jewishfoodsociety.org/recipes/matbucha-moroccan-tomato-and-pepper-spread",
        time: "3.5 שעות",
        servings: "כ-3.5 כוסות",
        type: "סלט מבושל",
        ingredients: ["עגבניות", "פלפל אדום", "שום", "שמן", "פפריקה", "מלח"],
        methodSummary:
          "קולפים עגבניות, מבשלים באיטיות עם פלפלים, שום, שמן ופפריקה עד שמתקבל ממרח סמיך.",
        note: "מתאים להגשה עם חלה, לחם או כחלק משולחן סלטים.",
      },
      {
        id: recipeId("moroccan", "Hand-Rolled Couscous"),
        name: "קוסקוס בעבודת יד",
        originalName: "Hand-Rolled Couscous",
        sourceName: "Jewish Food Society",
        sourceUrl: "https://www.jewishfoodsociety.org/recipes/hand-rolled-couscous",
        time: "שעה עבודה + השריה ואידוי",
        servings: "8-10 מנות",
        type: "מנה מרכזית",
        ingredients: ["סולת", "חומוס", "עוף", "דלעת", "כרוב", "קישואים", "כורכום"],
        methodSummary:
          "מגלגלים סולת עם מים ושמן, מאדים בשלבים ומגישים עם מרק ירקות, עוף וחומוס.",
        note: "המקור מתאר מסורת משפחתית מצפון אפריקה וישראל.",
      },
      {
        id: recipeId("moroccan", "Spicy Moroccan Fish"),
        name: "דג מרוקאי חריף",
        originalName: "Spicy Moroccan Fish",
        sourceName: "Jewish Food Society",
        sourceUrl: "https://www.jewishfoodsociety.org/recipes/spicy-moroccan-fish",
        time: "50 דקות",
        servings: "4-5 מנות",
        type: "דגים לשבת",
        ingredients: ["דג", "פלפל אדום", "פלפל חריף", "שום", "עגבניות", "לימון", "כוסברה"],
        methodSummary:
          "מבשלים ירקות ותבלינים לרוטב קצר, יוצקים על הדג ואופים עד שהדג עשוי ועדיין עסיסי.",
        note: "מנה נפוצה בפתיחת ארוחת שבת במשפחות צפון-אפריקאיות.",
      },
    ],
  },
  {
    id: "yemenite",
    name: "העדה התימנית",
    region: "תימן וישראל",
    accent: "from-emerald-700 via-lime-500 to-yellow-300",
    description:
      "בצקים איטיים, חילבה, סחוג וחוויאג' יוצרים מטבח מדויק ועמוק טעמים.",
    recipes: [
      {
        id: recipeId("yemenite", "Jachnun"),
        name: "ג'חנון עם ביצים חומות",
        originalName: "Jachnun with Slow-Cooked Eggs",
        sourceName: "Jewish Food Society",
        sourceUrl:
          "https://www.jewishfoodsociety.org/recipes/jachnun-yemenite-jewish-bread-with-slow-cooked-egg",
        time: "עבודה קצרה + אפייה כל הלילה",
        servings: "8-10 מנות",
        type: "מאפה שבת",
        ingredients: ["קמח", "סוכר חום", "מלח", "מים", "שמן", "חמאה", "ביצים"],
        methodSummary:
          "מכינים בצק רך, נותנים לו מנוחה, מותחים ליריעות דקות, מגלגלים ואופים לילה בסיר מכוסה.",
        note: "מוגש עם ביצים חומות, עגבנייה מגוררת וסחוג.",
      },
      {
        id: recipeId("yemenite", "Kubaneh"),
        name: "כובאנה",
        originalName: "Kubaneh",
        sourceName: "Jewish Food Society",
        sourceUrl: "https://www.jewishfoodsociety.org/recipes/kubaneh-yemenite-overnight-bread",
        time: "התפחה ואפייה ארוכה",
        servings: "4-6 מנות",
        type: "לחם שבת",
        ingredients: ["קמח", "סוכר חום", "מלח", "שמרים", "מים חמימים", "חמאה", "קצח"],
        methodSummary:
          "לשים בצק שמרים רך, מתפיחים, משמנים ומקפלים, ואז אופים בסיר עד שמתקבל לחם רך ושחום.",
        note: "לחם שבת תימני שמוגש לרוב לצד סחוג ועגבנייה.",
      },
      {
        id: recipeId("yemenite", "Lachuch"),
        name: "לחוח",
        originalName: "Lachuch",
        sourceName: "Jewish Food Society",
        sourceUrl: "https://www.jewishfoodsociety.org/recipes/lachuch",
        time: "30 דקות + מנוחה",
        servings: "10-12 יחידות",
        type: "פנקייק תימני",
        ingredients: ["קמח", "שמרים", "סוכר", "מלח", "מים חמימים", "שמן"],
        methodSummary:
          "מתפיחים בלילה דלילה, יוצקים למחבת קרה ומשומנת קלות ומבשלים עד שהחלק העליון נקבובי.",
        note: "המרקם מזכיר שילוב בין פנקייק לאינג'רה.",
      },
    ],
  },
  {
    id: "iraqi",
    name: "העדה העיראקית",
    region: "בגדד וקהילות עיראק",
    accent: "from-violet-700 via-fuchsia-500 to-pink-400",
    description:
      "אורז, עמבה, קובות ותבשילי שבת מתובלים שמחזיקים סיפור הגירה משפחתי.",
    recipes: [
      {
        id: recipeId("iraqi", "Sabich"),
        name: "סביח",
        originalName: "Sabich",
        sourceName: "Jewish Food Society",
        sourceUrl: "https://www.jewishfoodsociety.org/recipes/sabich",
        time: "כשעה",
        servings: "6-8 מנות",
        type: "כריך בוקר",
        ingredients: ["פיתה", "חציל", "תפוחי אדמה", "ביצים", "טחינה", "סלט", "עמבה"],
        methodSummary:
          "מכינים רכיבים בנפרד ומרכיבים כריך עם חציל, ביצה, תפוח אדמה, סלט, טחינה ועמבה.",
        note: "קשור למסורת בוקר שבת של יהודי עיראק.",
      },
      {
        id: recipeId("iraqi", "Tbit"),
        name: "טבית",
        originalName: "T'bit",
        sourceName: "Jewish Food Society",
        sourceUrl:
          "https://www.jewishfoodsociety.org/recipes/iraqi-tbit-iraqi-stuffed-chicken-with-spiced-rice",
        time: "כ-2 שעות בגרסה המקוצרת",
        servings: "6 מנות",
        type: "תבשיל אורז ועוף",
        ingredients: ["עוף", "אורז", "בצל", "כורכום", "פפריקה", "תבלינים", "עשבי תיבול"],
        methodSummary:
          "מתבלים עוף ואורז, מבשלים יחד כך שהאורז סופג את נוזלי העוף והתבלינים ונוצרה שכבה שחומה.",
        note: "במקור מתואר כמאכל שבת עיראקי שמתבשל לאט.",
      },
      {
        id: recipeId("iraqi", "Beet Kubbeh Soup"),
        name: "מרק קובה סלק",
        originalName: "Beet Kubbeh Soup",
        sourceName: "Jewish Food Society",
        sourceUrl: "https://www.jewishfoodsociety.org/recipes/beet-kubbeh-soup",
        time: "2 שעות",
        servings: "8-10 מנות",
        type: "מרק קובה",
        ingredients: ["סולת", "בשר בקר", "בצל", "בהרט", "סלק", "רסק עגבניות", "לימון"],
        methodSummary:
          "ממלאים מעטפת סולת בבשר מתובל ומבשלים את הקובות במרק סלק חמצמץ עד שהן יציבות ורכות.",
        note: "המקור מציין שהמרק הוגש במשפחה בימי שישי.",
      },
    ],
  },
  {
    id: "ethiopian",
    name: "העדה האתיופית",
    region: "אתיופיה וביתא ישראל",
    accent: "from-sky-700 via-cyan-500 to-teal-300",
    description:
      "תבשילי ווט, ברברה, דאבו ואינג'רה שמדגישים ארוחה משותפת סביב שולחן אחד.",
    recipes: [
      {
        id: recipeId("ethiopian", "Doro Wat"),
        name: "דורו ווט לשבת",
        originalName: "Doro Wat",
        sourceName: "Jewish Food Society",
        sourceUrl:
          "https://www.jewishfoodsociety.org/recipes/doro-wat-ethiopian-shabbat-chicken-stew",
        time: "שעה ורבע",
        servings: "4-6 מנות",
        type: "תבשיל עוף",
        ingredients: ["עוף", "ביצים קשות", "בצל", "שום", "ג'ינג'ר", "ברברה", "אינג'רה"],
        methodSummary:
          "מבשלים בצל ותבלינים לבסיס סמיך, מוסיפים עוף ומים, מצרפים ביצים קשות ומגישים עם אינג'רה.",
        note: "מנה קלאסית של שולחן שבת אתיופי.",
      },
      {
        id: recipeId("ethiopian", "Dabo"),
        name: "דאבו",
        originalName: "Dabo",
        sourceName: "Jewish Food Society",
        sourceUrl: "https://www.jewishfoodsociety.org/recipes/dabo-ethiopian-bread-1",
        time: "10 דקות עבודה + 10-12 שעות מנוחה",
        servings: "10 מנות",
        type: "לחם אתיופי",
        ingredients: ["קמח לחם", "קמח מלא", "כורכום", "זרעי כוסברה", "קצח", "שמרים"],
        methodSummary:
          "מערבבים בצק רטוב ומתובל, מתפיחים לילה ואופים בסיר מכוסה לקבלת כיכר רכה וריחנית.",
        note: "דאבו הוא חלק חשוב משבת וחגים אצל יהודי אתיופיה.",
      },
      {
        id: recipeId("ethiopian", "Messer Wot"),
        name: "מסר ווט",
        originalName: "Messer Wot",
        sourceName: "Jewish Food Society",
        sourceUrl:
          "https://www.jewishfoodsociety.org/recipes/messer-wot-ethiopian-red-lentil-stew",
        time: "שעה",
        servings: "6-8 מנות",
        type: "תבשיל עדשים",
        ingredients: ["עדשים אדומות", "בצל", "שום", "ג'ינג'ר", "רסק עגבניות", "ברברה"],
        methodSummary:
          "טוחנים בצל, שום וג'ינג'ר למשחה, מטגנים עם רסק וברברה ומבשלים עם עדשים עד לרכות.",
        note: "המקור כולל גם תערובת ברברה שאפשר לשמור בכלי אטום.",
      },
    ],
  },
] as const satisfies readonly RecipeCommunity[];

export const totalRecipeCount = recipeCommunities.reduce(
  (count, community) => count + community.recipes.length,
  0
);
