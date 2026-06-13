"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  Search,
  Soup,
  Utensils,
  Salad,
  ChefHat,
  Coffee,
  CakeSlice,
  Leaf,
  Drumstick,
  Fish,
  Apple,
  Clock,
  Egg,
  TreePine,
  SlidersHorizontal,
  X,
  Flame,
} from "lucide-react"
import { Button3D } from "react-3d-button"
import "react-3d-button/styles"
import { getSearchRecipes, getUserPreferences } from "@/app/actions/recipes"
import { RecipeCard } from "@/components/recipe/recipe-card"
import { Modal } from "@/components/ui/modal"
import { toast } from "sonner"

const CATEGORIES = [
  { id: "all", label: "Összes", icon: <Utensils size={16} /> },
  { id: 'breakfast', label: 'Reggeli', icon: <Coffee size={16} /> },
  { id: 'soups', label: 'Levesek', icon: <Soup size={16} /> },
  { id: 'mains', label: 'Főételek', icon: <ChefHat size={16} /> },
  { id: 'pasta', label: 'Tészták', icon: <Flame size={16} /> },
  { id: 'onepot', label: 'Egytálételek', icon: <Utensils size={16} /> },
  { id: 'desserts', label: 'Desszertek', icon: <CakeSlice size={16} /> },
  { id: 'salads', label: 'Saláták', icon: <Salad size={16} /> },
  { id: 'baking', label: 'Sütés', icon: <Egg size={16} /> },
  { id: 'poultry', label: 'Szárnyasok', icon: <Drumstick size={16} /> },
  { id: 'pork_beef', label: 'Sertés & Marha', icon: <Drumstick size={16} /> },
  { id: 'vegetarian', label: 'Vegetáriánus', icon: <Leaf size={16} /> },
  { id: 'quick', label: 'Gyors', icon: <Clock size={16} /> },
  { id: 'healthy', label: 'Egészséges', icon: <Apple size={16} /> },
]

const INGREDIENT_OPTIONS = [
  { id: "csirkehús", label: "Csirkehús 🍗" },
  { id: "sertéshús", label: "Sertéshús 🥩" },
  { id: "tojas", label: "Tojás 🥚" },
  { id: "sajt", label: "Sajt 🧀" },
  { id: "tejfol", label: "Tejföl 🥛" },
  { id: "tej", label: "Tej & Tejszín 🥛" },
  { id: "burgonya", label: "Burgonya 🥔" },
  { id: "hagyma", label: "Hagyma 🧅" },
  { id: "paradicsom", label: "Paradicsom 🍅" },
  { id: "paprika", label: "Paprika 🫑" },
  { id: "liszt", label: "Liszt 🌾" },
  { id: "rizs", label: "Rizs & Tészta 🍚" },
  { id: "gomba", label: "Gomba 🍄" },
]

const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  csirkehús: ["csirke", "csirkemell", "csirkecomb", "szárnyas", "kakas", "tyúk", "pulyka", "szárnyashús", "hús"],
  sertéshús: ["sertés", "marha", "marhahús", "karaj", "tarja", "oldalas", "szalonna", "bacon", "sonka", "pörkölt", "lapocka", "hús"],
  tojas: ["tojás"],
  sajt: ["sajt", "trappista", "parmezán", "mozzarella", "cheddar", "mascarpone"],
  tejfol: ["tejföl", "joghurt", "kefir"],
  tej: ["tej", "tejszín", "vaj", "margarin"],
  burgonya: ["burgonya", "krumpli"],
  hagyma: ["hagyma", "fokhagyma", "póréhagyma", "újhagyma"],
  paradicsom: ["paradicsom"],
  paprika: ["paprika", "kaliforniai"],
  liszt: ["liszt", "búzadara", "gríz"],
  rizs: ["rizs", "tészta", "makaróni", "spagetti", "nokedli", "galuska", "penne", "fuzilli"],
  gomba: ["gomba"],
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchIngredientWithSynonyms(ingNormalized: string, queryNormalized: string): boolean {
  if (ingNormalized.includes(queryNormalized) || queryNormalized.includes(ingNormalized)) {
    return true;
  }
  for (const [groupKey, groupSynonyms] of Object.entries(INGREDIENT_SYNONYMS)) {
    const groupKeyNormalized = normalize(groupKey);
    const normalizedSynonyms = groupSynonyms.map(s => normalize(s));
    const allGroupTerms = [groupKeyNormalized, ...normalizedSynonyms];

    const queryMatchesGroup = allGroupTerms.some(term =>
      queryNormalized.includes(term) || term.includes(queryNormalized)
    );
    const ingredientMatchesGroup = allGroupTerms.some(term =>
      ingNormalized.includes(term) || term.includes(ingNormalized)
    );

    if (queryMatchesGroup && ingredientMatchesGroup) {
      return true;
    }
  }
  return false;
}

export default function SearchPage() {
  const { data: session } = useSession()
  const [recipes, setRecipes] = useState<any[]>([])
  const [filteredRecipes, setFilteredRecipes] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [loading, setLoading] = useState(true)

  // User Preferences
  const [userPrefs, setUserPrefs] = useState<string[]>([])

  // Modal State & Filters
  const [showModal, setShowModal] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [maxPrepTime, setMaxPrepTime] = useState<number>(180) // 180 mins max
  const [activeIngredients, setActiveIngredients] = useState<string[]>([])
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string>("all")

  // Extract other users (uploader) names from the recipes
  const otherAuthors = useMemo(() => {
    const currentUserId = session?.user?.id
    const authorsMap = new Map<string, string>()
    recipes.forEach((r) => {
      if (r.authorId && r.authorId !== currentUserId && r.authorName) {
        authorsMap.set(r.authorId, r.authorName)
      }
    })
    return Array.from(authorsMap.entries()).map(([id, name]) => ({ id, name }))
  }, [recipes, session])

  const initialFetchRef = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input if focus=true query param is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("focus") === "true") {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [])

  // 1. Fetch initial recipes and user preferences on mount
  useEffect(() => {
    if (initialFetchRef.current) return
    initialFetchRef.current = true

    async function loadData() {
      try {
        const [recipesRes, prefsRes] = await Promise.all([
          getSearchRecipes(),
          getUserPreferences(),
        ])

        if (recipesRes.error) {
          toast.error(recipesRes.error)
        } else if (recipesRes.recipes) {
          setRecipes(recipesRes.recipes)
          setFilteredRecipes(recipesRes.recipes)
        }

        if (prefsRes && "preferences" in prefsRes) {
          setUserPrefs(prefsRes.preferences || [])
        }
      } catch {
        toast.error("Hiba történt az adatok betöltésekor!")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // 2. Perform dynamic client-side filtering whenever inputs change
  useEffect(() => {
    let result = [...recipes]

    // A. Text Search
    if (searchQuery.trim()) {
      const q = normalize(searchQuery)
      result = result.filter((r) => {
        const titleMatch = normalize(r.title).includes(q)
        const categoryMatch = r.category ? normalize(r.category).includes(q) : false
        const tagsMatch = r.tags ? r.tags.some((t: string) => normalize(t).includes(q)) : false
        const descMatch = r.description ? normalize(r.description).includes(q) : false
        const authorMatch = r.authorName ? normalize(r.authorName).includes(q) : false
        const ingredientMatch = r.ingredients ? r.ingredients.some((ing: string) =>
          matchIngredientWithSynonyms(normalize(ing), q)
        ) : false

        return titleMatch || categoryMatch || tagsMatch || descMatch || authorMatch || ingredientMatch
      })
    }

    // B. Category Pills
    if (selectedCategory !== "all") {
      result = result.filter((r) => r.category === selectedCategory || (r.tags && r.tags.includes(selectedCategory)))
    }

    // C. Difficulty Filter
    if (selectedDifficulty !== "all") {
      result = result.filter((r) => r.difficulty === selectedDifficulty)
    }

    // D. Prep/Cook Time Limit
    if (maxPrepTime < 180) {
      result = result.filter((r) => {
        let minutes = 30
        const timeStr = r.time.toLowerCase()
        if (timeStr.includes("óra")) {
          const parts = timeStr.split("óra")
          const hours = parseInt(parts[0]) || 0
          const mins = parts[1] ? parseInt(parts[1]) || 0 : 0
          minutes = hours * 60 + mins
        } else if (timeStr.includes("perc")) {
          minutes = parseInt(timeStr) || 0
        }
        return minutes <= maxPrepTime
      })
    }

    // E. Scanned Ingredients Filter
    if (activeIngredients.length > 0) {
      result = result.filter((r) => {
        if (!r.ingredients) return false
        return activeIngredients.every((ai) => {
          const aiNormalized = normalize(ai)
          return r.ingredients.some((ri: string) => {
            return matchIngredientWithSynonyms(normalize(ri), aiNormalized)
          })
        })
      })
    }

    // F. Author Filter
    if (selectedAuthorFilter !== "all" && session?.user?.id) {
      const currentUserId = session.user.id
      if (selectedAuthorFilter === "my") {
        result = result.filter((r) => r.authorId === currentUserId)
      } else {
        result = result.filter((r) => r.authorId === selectedAuthorFilter)
      }
    }

    setFilteredRecipes(result)
  }, [searchQuery, selectedCategory, selectedDifficulty, maxPrepTime, activeIngredients, selectedAuthorFilter, recipes, session])

  // 3. Dynamic Category list prioritizing user preferences
  const visibleCategories = useMemo(() => {
    const allItem = CATEGORIES.find((c) => c.id === "all")!
    if (userPrefs.length === 0) {
      return CATEGORIES
    }
    const preferredItems = CATEGORIES.filter((c) => userPrefs.includes(c.id))
    const otherItems = CATEGORIES.filter((c) => c.id !== "all" && !userPrefs.includes(c.id))
    return [allItem, ...preferredItems, ...otherItems]
  }, [userPrefs])

  const handleResetFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedDifficulty("all")
    setMaxPrepTime(180)
    setActiveIngredients([])
    setSelectedAuthorFilter("all")
  }

  const toggleIngredient = (ing: string) => {
    setActiveIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    )
  }

  const removeIngredient = (ing: string) => {
    // Defer unmounting to prevent react-3d-button from double-firing on sibling nodes that shift under the cursor
    setTimeout(() => {
      setActiveIngredients((prev) => prev.filter((i) => i !== ing))
    }, 50)
  }

  return (
    <main className="flex flex-col h-full overflow-hidden bg-bg-primary w-full pb-24 max-w-5xl mx-auto">
      {/* Top Search & Filter Bar */}
      <section className="px-4 md:px-8 pt-2 shrink-0 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {/* 3D Search Input */}
          <div className="flex-1 relative flex items-center bg-white border-2 border-border-default rounded-2xl px-4 h-12 shadow-[0_3px_0_#E5E2E1] transition-all duration-200 focus-within:translate-y-[2px] focus-within:shadow-[0_2px_0_#007bff] focus-within:border-[#007bff] group">
            <Search className="text-text-tertiary mr-3 group-focus-within:text-[#007bff] transition-colors duration-200" size={20} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Mit főznél ma?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none font-bold text-text-primary placeholder:text-text-tertiary p-0 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-text-tertiary hover:text-text-primary p-1 rounded-full cursor-pointer ml-1"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Open Filter Modal Button */}
          <div data-sound="off">
            <Button3D
              type={selectedCategory !== "all" || selectedDifficulty !== "all" || maxPrepTime < 180 || activeIngredients.length > 0 || selectedAuthorFilter !== "all" ? "primary" : "secondary"}
              iconOnly
              rounded="xl"
              containerProps={{ style: { width: "48px", height: "48px" } }}
              className="p-0 flex items-center justify-center cursor-pointer"
              onPress={() => setShowModal(true)}
            >
              <SlidersHorizontal size={20} />
            </Button3D>
          </div>
        </div>
      </section>

      {/* Categories Horizontal Pills Scroll */}
      <section className="mt-3 shrink-0">
        <div className="flex overflow-x-auto pb-3 snap-x snap-mandatory scroll-pl-4 md:scroll-pl-8 hide-scrollbar px-4 md:px-8">
          <div className="w-1 flex-shrink-0 snap-start" aria-hidden="true" />

          {/* Main Pills list */}
          {visibleCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id
            const isPreferred = userPrefs.includes(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 font-bold text-[13px] select-none snap-start cursor-pointer mr-3 transition-all duration-200 active:translate-y-[1px] active:shadow-none
                  ${isSelected
                    ? "border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white translate-y-[1px] active:translate-y-[2px]"
                    : isPreferred
                      ? "border-[#FFB347] shadow-[0_2px_0_#E89C33] bg-[#FFF8EE] text-[#D47E1F] hover:bg-[#FFF2DF] hover:translate-y-[-1px] hover:shadow-[0_3px_0_#E89C33]"
                      : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] hover:text-text-primary"
                  }`}
              >
                {cat.icon}
                {cat.label}
                {isPreferred && !isSelected && <span className="text-[9px] font-black uppercase text-[#FFB347]">★</span>}
              </button>
            )
          })}

          {/* Quick Trigger Modal Pill with 3D Effect */}
          <button
            onClick={() => setShowModal(true)}
            data-sound="off"
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-solid border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] hover:text-[#007BFF] hover:border-[#007BFF] transition-all duration-200 font-bold text-[13px] select-none cursor-pointer mr-3 active:translate-y-[1px] active:shadow-none"
          >
            <span>+ Szűrők & Kategóriák</span>
          </button>

          <div className="w-3 flex-shrink-0" aria-hidden="true" />
        </div>
      </section>

      {activeIngredients.length > 0 && (
        <section className="px-4 md:px-8 mb-2 shrink-0 flex flex-wrap gap-1.5 items-center font-nunito">
          <span className="text-[10px] text-text-tertiary font-bold uppercase mr-1">Aktív hozzávalók:</span>
          {activeIngredients.map((ing) => (
            <div key={ing} data-sound="off">
              <Button3D
                type="primary"
                rounded="full"
                className="px-2.5 py-0 min-w-0 flex items-center justify-center cursor-pointer"
                containerProps={{
                  style: {
                    height: "28px",
                    "--button-primary-color": "#4ADE80",
                    "--button-primary-color-dark": "#16A34A",
                    "--button-primary-color-hover": "#34D399",
                    "--button-primary-color-light": "#FFFFFF",
                  } as React.CSSProperties
                }}
                onPress={() => removeIngredient(ing)}
              >
                <span className="font-nunito font-bold text-[11px] flex items-center gap-1 text-white">
                  {INGREDIENT_OPTIONS.find(o => o.id === ing)?.label || ing}
                  <X size={11} strokeWidth={3} className="text-white/80" />
                </span>
              </Button3D>
            </div>
          ))}
        </section>
      )}

      {/* Grid of Results / Scroll Container */}
      <section className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 pt-2 hide-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-[#007BFF] border-t-transparent rounded-full animate-spin" />
            <span className="font-bold text-sm text-text-tertiary">Főzzük a scoopet... 🥣</span>
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} {...recipe} />
            ))}
          </div>
        ) : (
          /* Premium Playful Empty State */
          <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border-2 border-border-default rounded-3xl shadow-[0_4px_0_#E5E2E1] max-w-sm mx-auto mt-4">

            {/* 3D emoji container */}
            <div className="w-18 h-18 rounded-3xl border-2 border-border-default bg-white shadow-[0_6px_0_#E5E2E1] flex items-center justify-center text-4xl mb-6 transform hover:rotate-12 hover:-translate-y-1 transition-all duration-200 select-none">
              🍽️
            </div>

            <h3 className="font-nunito font-black text-2xl tracking-tight text-text-primary mb-3">Upsz, üres a kotyesz!</h3>
            <p className="text-text-secondary text-sm font-bold leading-relaxed max-w-[280px] mb-6">
              Nem találtunk ilyen receptet a könyvben. Próbálj meg más szavakra keresni, vagy töröld a szűrőket!
            </p>
            <Button3D
              type="primary"
              rounded="xl"
              containerProps={{ style: { height: "40px" } }}
              className="cursor-pointer font-bold text-xs px-6"
              onPress={handleResetFilters}
            >
              Szűrők törlése
            </Button3D>
          </div>
        )}
      </section>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Szűrők">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1 hide-scrollbar flex flex-col gap-5 py-2">

          {/* Common Ingredients Badges (Replaces Image Upload) */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="font-bold text-xs text-text-secondary block font-nunito font-nunito">Keresés alapanyag szerint 🥔</span>
            <div className="flex flex-wrap gap-1.5 font-nunito">
              {INGREDIENT_OPTIONS.map((ing) => {
                const isSelected = activeIngredients.includes(ing.id)
                return (
                  <button
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`h-10 px-4 rounded-2xl border-2 text-xs font-bold transition-all duration-150 cursor-pointer select-none flex items-center justify-center
                          ${isSelected
                        ? "border-[#4ADE80] shadow-[0_2px_0_#16a34a] bg-[#4ADE80] text-white translate-y-[1px] active:translate-y-[2px] active:shadow-none"
                        : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:bg-[#FAF7F6] hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] active:translate-y-[1px] active:shadow-none"
                      }`}
                  >
                    {ing.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#E5E2E1] shrink-0" />

          {/* All Categories Wrap */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="font-bold text-xs text-text-secondary block font-nunito">Kategória választása</span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter((c) => c.id !== "all").map((cat) => {
                const isSelected = selectedCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(isSelected ? "all" : cat.id)}
                    className={`h-10 px-4 rounded-2xl border-2 flex items-center justify-center gap-1.5 font-bold text-xs select-none transition-all duration-150 cursor-pointer
                          ${isSelected
                        ? "border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white translate-y-[1px] active:translate-y-[2px] active:shadow-none"
                        : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:bg-[#FAF7F6] hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] active:translate-y-[1px] active:shadow-none"
                      }`}
                  >
                    <span className={isSelected ? "text-white" : "text-[#007BFF]"}>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#E5E2E1] shrink-0" />

          {/* Recipe Upload Filter */}
          <div className="shrink-0 flex flex-col gap-2">
            <span className="font-bold text-xs text-text-secondary block font-nunito">Feltöltő</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedAuthorFilter("all")}
                className={`h-10 px-4 rounded-2xl border-2 text-xs font-bold transition-all duration-150 cursor-pointer select-none flex items-center justify-center
                      ${selectedAuthorFilter === "all"
                    ? "border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white translate-y-[1px] active:translate-y-[2px] active:shadow-none"
                    : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:bg-[#FAF7F6] hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] active:translate-y-[1px] active:shadow-none"
                  }`}
              >
                Összes
              </button>
              <button
                onClick={() => setSelectedAuthorFilter("my")}
                className={`h-10 px-4 rounded-2xl border-2 text-xs font-bold transition-all duration-150 cursor-pointer select-none flex items-center justify-center
                      ${selectedAuthorFilter === "my"
                    ? "border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white translate-y-[1px] active:translate-y-[2px] active:shadow-none"
                    : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:bg-[#FAF7F6] hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] active:translate-y-[1px] active:shadow-none"
                  }`}
              >
                Saját
              </button>
              {otherAuthors.map((author) => (
                <button
                  key={author.id}
                  onClick={() => setSelectedAuthorFilter(author.id)}
                  className={`h-10 px-4 rounded-2xl border-2 text-xs font-bold transition-all duration-150 cursor-pointer select-none flex items-center justify-center
                        ${selectedAuthorFilter === author.id
                      ? "border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white translate-y-[1px] active:translate-y-[2px] active:shadow-none"
                      : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:bg-[#FAF7F6] hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] active:translate-y-[1px] active:shadow-none"
                    }`}
                >
                  {author.name}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#E5E2E1] shrink-0" />

          {/* Difficulty Selector */}
          <div className="shrink-0 flex flex-col gap-2">
            <span className="font-bold text-xs text-text-secondary block font-nunito">Nehézség</span>
            <div className="flex flex-wrap gap-1.5">
              {["all", "Könnyű", "Közepes", "Nehéz"].map((diff) => {
                const isSelected = selectedDifficulty === diff;
                let selectedStyle = "border-[#007BFF] shadow-[0_2px_0_#0056b3] bg-[#007BFF] text-white";
                if (diff === "Könnyű") {
                  selectedStyle = "border-[#4ADE80] shadow-[0_2px_0_#16a34a] bg-[#4ADE80] text-white";
                } else if (diff === "Közepes") {
                  selectedStyle = "border-[#FFA726] shadow-[0_2px_0_#FB8C00] bg-[#FFA726] text-white";
                } else if (diff === "Nehéz") {
                  selectedStyle = "border-[#EF5350] shadow-[0_2px_0_#E53935] bg-[#EF5350] text-white";
                }

                return (
                  <button
                    key={diff}
                    onClick={() => setSelectedDifficulty(diff)}
                    className={`h-10 px-4 rounded-2xl border-2 text-xs font-bold transition-all duration-150 cursor-pointer text-center flex items-center justify-center select-none
                          ${isSelected
                        ? `${selectedStyle} translate-y-[1px] active:translate-y-[2px] active:shadow-none`
                        : "border-[#E5E2E1] shadow-[0_2px_0_#E5E2E1] bg-white text-text-secondary hover:bg-[#FAF7F6] hover:translate-y-[-1px] hover:shadow-[0_3px_0_#D5D2D1] active:translate-y-[1px] active:shadow-none"
                      }`}
                  >
                    {diff === "all" ? "Mind" : diff}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prep Time Slider */}
          <div className="shrink-0 flex flex-col gap-2 mb-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-xs text-text-secondary">Elkészítési idő</span>
              <span className="font-black text-xs text-accent-primary">
                {maxPrepTime === 180 ? "Ráérek" : `${maxPrepTime} perc`}
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="180"
              step="15"
              value={maxPrepTime}
              onChange={(e) => setMaxPrepTime(Number(e.target.value))}
              className="w-full h-1.5 bg-white border-2 border-border-default rounded-lg appearance-none cursor-pointer accent-[#007BFF]"
            />
          </div>

        </div>

        {/* Footer Actions - Fixed */}
        <div className="flex gap-3 pt-3 border-t border-[#E5E2E1] mt-2 shrink-0">
          <Button3D
            type="secondary"
            rounded="full"
            fullWidth
            containerProps={{
              style: {
                height: "48px",
                "--button-secondary-color": "#ffffff",
                "--button-secondary-color-dark": "#E5E2E1",
                "--button-secondary-color-hover": "#FCF9F8",
                "--button-secondary-color-light": "#1C1B1B",
              } as React.CSSProperties
            }}
            onPress={() => {
              handleResetFilters()
              setShowModal(false)
            }}
          >
            <span className="font-nunito font-bold text-sm text-text-primary flex items-center justify-center">
              Alaphelyzet
            </span>
          </Button3D>
          <Button3D
            type="primary"
            rounded="full"
            fullWidth
            containerProps={{
              style: {
                height: "48px",
                "--button-primary-color": "#007BFF",
                "--button-primary-color-dark": "#0056b3",
                "--button-primary-color-hover": "#0047a8",
                "--button-primary-color-light": "#FFFFFF",
              } as React.CSSProperties
            }}
            onPress={() => setShowModal(false)}
          >
            <span className="font-nunito font-bold text-sm text-white flex items-center justify-center">
              Alkalmazás
            </span>
          </Button3D>
        </div>
      </Modal>
    </main>
  )
}
