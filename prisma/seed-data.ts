/**
 * Shared seed data and logic for the Scoop demo.
 * Used by both `prisma/seed.ts` (CLI) and `/api/demo-reset` (CRON).
 */

import { PrismaClient, Role } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// ---------------------------------------------------------------------------
// Demo user credentials
// ---------------------------------------------------------------------------
export const DEMO_EMAIL = "demo@scoop.app";
export const DEMO_PASSWORD = "demo1234";
export const DEMO_USER_ID = "demo-user-001";

// ---------------------------------------------------------------------------
// Helper: create a Prisma client for seeding (avoids importing the app's
// singleton which may not be available during CLI seed runs).
// ---------------------------------------------------------------------------
export function createSeedClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// ---------------------------------------------------------------------------
// WIPE - delete all data in FK-safe order
// ---------------------------------------------------------------------------
export async function wipeAllData(prisma: PrismaClient) {
  // Delete in reverse dependency order
  await prisma.pushSubscription.deleteMany();
  await prisma.shoppingList.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.mealPlan.deleteMany();
  await prisma.like.deleteMany();
  await prisma.media.deleteMany();
  await prisma.instruction.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
}

// ---------------------------------------------------------------------------
// SEED - create demo user + recipes
// ---------------------------------------------------------------------------
export async function seedDemoData(prisma: PrismaClient) {
  // Hash for "demo1234" - pre-computed bcrypt hash to avoid needing bcryptjs
  // during seed. Generated with: bcryptjs.hash("demo1234", 12)
  const demoPasswordHash =
    "$2b$12$Zh6.W0uRtNDYptu1RUgCkOD.nwgi8Pho9qMr6HihnIpKC9aNQcq3K";

  // Create the demo user
  const demoUser = await prisma.user.create({
    data: {
      id: DEMO_USER_ID,
      name: "Demo Chef",
      email: DEMO_EMAIL,
      passwordHash: demoPasswordHash,
      role: Role.ADMIN,
      onboardingComplete: false, // Forces onboarding on every reset
      familyName: "Scoop Demo",
      image: "Face1",
      preferences: [],
    },
  });

  // ---------------------------------------------------------------------------
  // Recipe seed data - 8 traditional Hungarian recipes
  // ---------------------------------------------------------------------------
  const recipes = [
    {
      title: "Gulyásleves",
      description:
        "A legmagyarabb leves: sűrű, paprikás, tartalmas. Igazi hungarikum, amit mindenki szeret.",
      prepTime: 20,
      cookTime: 90,
      servings: 6,
      category: "soups",
      difficulty: "Közepes",
      tags: ["magyar", "hagyományos", "leves"],
      imageUrl:
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=800",
      ingredients: [
        { name: "Marhalábszár", quantity: 500, unit: "g" },
        { name: "Burgonya", quantity: 3, unit: "db" },
        { name: "Sárgarépa", quantity: 2, unit: "db" },
        { name: "Vöröshagyma", quantity: 2, unit: "db" },
        { name: "Édespaprika", quantity: 2, unit: "ek" },
        { name: "Fokhagyma", quantity: 3, unit: "gerezd" },
        { name: "Paradicsompüré", quantity: 1, unit: "ek" },
        { name: "Zöldpaprika", quantity: 2, unit: "db" },
        { name: "Csipetke tészta", quantity: 100, unit: "g" },
        { name: "Só", quantity: null, unit: "ízlés szerint" },
      ],
      instructions: [
        "A húst kockákra vágjuk, a hagymát apróra vágjuk.",
        "Egy nagy lábasban kevés olajon megpároljuk a hagymát, hozzáadjuk a paprikát.",
        "Rádobjuk a húst és megdinszteljük, amíg fehéredik.",
        "Felöntjük vízzel, sózzuk és főzzük 1 órát fedő alatt.",
        "Hozzáadjuk a kockára vágott burgonyát, sárgarépát és paprikát.",
        "Még 30 percet főzzük, amíg a zöldségek megpuhulnak.",
        "Végül beleszórjuk a csipetkét és még 5 percig főzzük.",
      ],
    },
    {
      title: "Töltött káposzta",
      description:
        "Karácsonyi klasszikus: savanyú káposztalevelekbe tekert darált húsos töltelék, tejföllel tálalva.",
      prepTime: 45,
      cookTime: 120,
      servings: 8,
      category: "mains",
      difficulty: "Nehéz",
      tags: ["magyar", "hagyományos", "karácsony", "sertés"],
      imageUrl:
        "https://images.unsplash.com/photo-1625937286074-9ca519d5d9df?auto=format&fit=crop&q=80&w=800",
      ingredients: [
        { name: "Savanyú káposzta levél", quantity: 12, unit: "db" },
        { name: "Darált sertéshús", quantity: 500, unit: "g" },
        { name: "Rizs", quantity: 150, unit: "g" },
        { name: "Vöröshagyma", quantity: 1, unit: "db" },
        { name: "Tojás", quantity: 1, unit: "db" },
        { name: "Fokhagyma", quantity: 2, unit: "gerezd" },
        { name: "Füstölt szalonna", quantity: 150, unit: "g" },
        { name: "Tejföl", quantity: 200, unit: "ml" },
        { name: "Édespaprika", quantity: 1, unit: "ek" },
        { name: "Só, bors", quantity: null, unit: "ízlés szerint" },
      ],
      instructions: [
        "A rizst félig megfőzzük sós vízben, leszűrjük.",
        "A darált húst összekeverjük a rizzsel, apróra vágott hagymával, tojással és fűszerekkel.",
        "A káposztalefeleket kiterítjük és mindegyikbe tölteléket teszünk.",
        "Szorosan feltekerjük és a végeit behajtjuk.",
        "Egy nagy lábasba rétegenként elrendezzük a töltött káposztákat, köztük szalonnát teszünk.",
        "Felöntjük vízzel, hogy ellepje, és lefedve 2 órát főzzük lassú tűzön.",
        "Tejföllel és friss kenyérrel tálaljuk.",
      ],
    },
    {
      title: "Lángos",
      description:
        "A magyar street food király: aranybarnára sült kelt tészta, fokhagymás tejföllel és reszelt sajttal.",
      prepTime: 30,
      cookTime: 15,
      servings: 4,
      category: "appetizers",
      difficulty: "Könnyű",
      tags: ["magyar", "street food", "gyors"],
      imageUrl:
        "https://images.unsplash.com/photo-1625937329935-673a74d5de3c?auto=format&fit=crop&q=80&w=800",
      ingredients: [
        { name: "Finomliszt", quantity: 500, unit: "g" },
        { name: "Élesztő", quantity: 25, unit: "g" },
        { name: "Langyos tej", quantity: 250, unit: "ml" },
        { name: "Só", quantity: 1, unit: "tk" },
        { name: "Cukor", quantity: 1, unit: "tk" },
        { name: "Olaj (sütéshez)", quantity: 500, unit: "ml" },
        { name: "Tejföl", quantity: 200, unit: "ml" },
        { name: "Fokhagyma", quantity: 4, unit: "gerezd" },
        { name: "Reszelt sajt", quantity: 200, unit: "g" },
      ],
      instructions: [
        "Az élesztőt a langyos tejben felfuttatjuk a cukorral.",
        "A lisztbe sót teszünk, hozzáöntjük az élesztős tejet és dagasztunk.",
        "Pihentetjük 30 percig, amíg megkel.",
        "Lisztezett felületen ujjnyi vastagra nyújtjuk, kerek formára szakítjuk.",
        "Forró olajban mindkét oldalát aranybarnára sütjük.",
        "Fokhagymás tejföllel megkenjük és reszelt sajttal megszórjuk.",
      ],
    },
    {
      title: "Somlói galuska",
      description:
        "Három színű piskóta, vaníliakrém, csokoládéöntet és tejszínhab - a magyar desszertek koronázatlan királya.",
      prepTime: 40,
      cookTime: 30,
      servings: 8,
      category: "desserts",
      difficulty: "Közepes",
      tags: ["magyar", "desszert", "édes"],
      imageUrl:
        "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&q=80&w=800",
      ingredients: [
        { name: "Tojás", quantity: 6, unit: "db" },
        { name: "Cukor", quantity: 200, unit: "g" },
        { name: "Finomliszt", quantity: 200, unit: "g" },
        { name: "Kakaópor", quantity: 30, unit: "g" },
        { name: "Dió (darált)", quantity: 100, unit: "g" },
        { name: "Mazsola", quantity: 50, unit: "g" },
        { name: "Rum", quantity: 3, unit: "ek" },
        { name: "Tej", quantity: 500, unit: "ml" },
        { name: "Vaníliás pudingpor", quantity: 2, unit: "csomag" },
        { name: "Étcsokoládé", quantity: 100, unit: "g" },
        { name: "Tejszín", quantity: 300, unit: "ml" },
      ],
      instructions: [
        "Három piskótalapot sütünk: sima, kakaós és diós változatban.",
        "A pudingporból és tejből vaníliakrémet főzünk.",
        "A mazsolát rumban beáztatjuk.",
        "A piskótalapokat kockákra vágjuk.",
        "Rétegezzük: piskóta, krém, mazsola, piskóta, krém...",
        "Az étcsokoládét tejszínnel megolvasztjuk és ráöntjük.",
        "A megmaradt tejszínt felhabosítjuk és tetejére halmozzuk.",
        "Hűtőben legalább 2 órát pihentetjük tálalás előtt.",
      ],
    },
    {
      title: "Paprikás csirke",
      description:
        "Klasszikus magyar fogás: szaftos csirkecombok paprikás-tejfölös szószban, nokedlivel tálalva.",
      prepTime: 15,
      cookTime: 45,
      servings: 4,
      category: "mains",
      difficulty: "Közepes",
      tags: ["magyar", "csirke", "nokedli"],
      imageUrl:
        "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=800",
      ingredients: [
        { name: "Csirkecomb", quantity: 8, unit: "db" },
        { name: "Vöröshagyma", quantity: 2, unit: "db" },
        { name: "Édespaprika", quantity: 2, unit: "ek" },
        { name: "Tejföl", quantity: 200, unit: "ml" },
        { name: "Zöldpaprika", quantity: 1, unit: "db" },
        { name: "Paradicsom", quantity: 1, unit: "db" },
        { name: "Liszt", quantity: 1, unit: "ek" },
        { name: "Só", quantity: null, unit: "ízlés szerint" },
      ],
      instructions: [
        "A hagymát apróra vágjuk és kevés zsírban üvegesre pároljuk.",
        "Levesszük a tűzről, belekeverjük a paprikát.",
        "Beletesszük a csirkedarabokat, sózzuk.",
        "Hozzáadjuk a felszeletelt paprikát és paradicsomot.",
        "Fedő alatt pároljuk kb. 40 percig.",
        "A tejfölt liszttel elkeverjük és hozzáadjuk a szószhoz.",
        "Még 5 percig forraljuk. Nokedlivel tálaljuk.",
      ],
    },
    {
      title: "Túrós csusza",
      description:
        "Egyszerű, laktató magyar tészta: szélesmetélt tejföllel, túróval és ropogós szalonnával.",
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      category: "pasta",
      difficulty: "Könnyű",
      tags: ["magyar", "gyors", "tészta"],
      imageUrl:
        "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&q=80&w=800",
      ingredients: [
        { name: "Széles metélt tészta", quantity: 500, unit: "g" },
        { name: "Túró", quantity: 250, unit: "g" },
        { name: "Tejföl", quantity: 200, unit: "ml" },
        { name: "Füstölt szalonna", quantity: 200, unit: "g" },
        { name: "Só", quantity: null, unit: "ízlés szerint" },
      ],
      instructions: [
        "A tésztát sós vízben al dente-re főzzük.",
        "A szalonnát kis kockákra vágjuk és ropogósra sütjük.",
        "A leszűrt tésztát a tejföllel összekeverjük.",
        "Rétegezzük: tészta, morzsolt túró, szalonna, tészta, túró...",
        "Tetejére bőven szórunk ropogós szalonnát. Azonnal tálaljuk.",
      ],
    },
    {
      title: "Lecsó",
      description:
        "Nyári zöldséges egytálétel: paprika, paradicsom és tojás - egyszerű, de fenségesen finom.",
      prepTime: 10,
      cookTime: 25,
      servings: 4,
      category: "mains",
      difficulty: "Könnyű",
      tags: ["magyar", "vegetáriánus", "egytálétel", "gyors"],
      imageUrl:
        "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&q=80&w=800",
      ingredients: [
        { name: "Zöldpaprika", quantity: 4, unit: "db" },
        { name: "Paradicsom", quantity: 4, unit: "db" },
        { name: "Vöröshagyma", quantity: 1, unit: "db" },
        { name: "Tojás", quantity: 3, unit: "db" },
        { name: "Kolbász (opcionális)", quantity: 200, unit: "g" },
        { name: "Édespaprika", quantity: 1, unit: "tk" },
        { name: "Olaj", quantity: 2, unit: "ek" },
        { name: "Só, bors", quantity: null, unit: "ízlés szerint" },
      ],
      instructions: [
        "A hagymát karikákra vágjuk és olajon megdinszteljük.",
        "Ha használunk kolbászt, karikázzuk fel és süssük meg a hagymával.",
        "A paprikát csíkokra vágjuk és hozzáadjuk.",
        "A paradicsomot kockázzuk és rádobjuk.",
        "Sózzuk, borsozzuk, paprikázzuk és fedő alatt pároljuk 15 percig.",
        "A tojásokat belekeverjük és addig keverjük, míg megalvad.",
        "Friss kenyérrel tálaljuk.",
      ],
    },
    {
      title: "Dobos torta",
      description:
        "Hatlapos piskótatorta csokoládés vajkrémmel és karamellás tetővel - a magyar cukrászipar ikonja.",
      prepTime: 60,
      cookTime: 30,
      servings: 12,
      category: "desserts",
      difficulty: "Nehéz",
      tags: ["magyar", "desszert", "torta", "sütés"],
      imageUrl:
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800",
      ingredients: [
        { name: "Tojás", quantity: 6, unit: "db" },
        { name: "Cukor", quantity: 300, unit: "g" },
        { name: "Finomliszt", quantity: 180, unit: "g" },
        { name: "Vaj", quantity: 250, unit: "g" },
        { name: "Étcsokoládé", quantity: 150, unit: "g" },
        { name: "Porcukor", quantity: 200, unit: "g" },
        { name: "Tojássárgája", quantity: 3, unit: "db" },
        { name: "Vanília kivonat", quantity: 1, unit: "tk" },
        { name: "Karamellhez: cukor", quantity: 100, unit: "g" },
      ],
      instructions: [
        "A tojásokat és cukrot habosra keverjük, óvatosan beforgatjuk a lisztet.",
        "6 vékony piskótalapot sütünk (egyenként 170°C-on 8 percig).",
        "A vajkrémhez: a csokoládét megolvasztjuk, a vajat porcukorral habosítjuk.",
        "Hozzáadjuk a tojássárgákat, vaníliát és az olvasztott csokoládét.",
        "5 lapot megkenünk vajkrémmel és egymásra helyezzük.",
        "A 6. lapot karamellizált cukorral vonjuk be (ez lesz a tető).",
        "A tetőt feltesszük, az oldalát is megkenjük vajkrémmel.",
        "Hűtőben legalább 4 órát pihentetjük szeletelés előtt.",
      ],
    },
  ];

  // Create all recipes with their relations
  for (const recipe of recipes) {
    await prisma.recipe.create({
      data: {
        title: recipe.title,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        category: recipe.category,
        difficulty: recipe.difficulty,
        tags: recipe.tags,
        authorId: demoUser.id,
        ingredients: {
          create: recipe.ingredients.map((ing) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        },
        instructions: {
          create: recipe.instructions.map((content, idx) => ({
            step: idx + 1,
            content,
          })),
        },
        media: {
          create: [{ url: recipe.imageUrl, type: "image" }],
        },
      },
    });
  }

  return { user: demoUser, recipeCount: recipes.length };
}
