"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function getSearchRecipes(searchQuery?: string, categoryFilter?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  // 2. Fetch matched recipes
  const whereClause: Record<string, any> = {};
  const andConditions: any[] = [];

  if (categoryFilter && categoryFilter !== "all") {
    andConditions.push({
      OR: [
        { category: categoryFilter },
        { tags: { has: categoryFilter } }
      ]
    });
  }

  if (searchQuery) {
    const q = searchQuery.trim().toLowerCase();
    andConditions.push({
      OR: [
        {
          title: {
            contains: q,
            mode: "insensitive"
          }
        },
        {
          description: {
            contains: q,
            mode: "insensitive"
          }
        },
        {
          ingredients: {
            some: {
              name: {
                contains: q,
                mode: "insensitive"
              }
            }
          }
        }
      ]
    });
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  try {
    const recipes = await prisma.recipe.findMany({
      where: whereClause,
      include: {
        ingredients: true,
        instructions: true,
        media: true,
        likes: {
          where: {
            userId: session.user.id
          }
        },
        author: {
          select: {
            name: true,
            image: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Transform into frontend format compatibility
    const formattedRecipes = recipes.map(r => {
      const imageUrl = r.media.find(m => m.type === "image")?.url || "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?auto=format&fit=crop&q=80&w=800";

      // Calculate display time
      let timeStr = "30 perc";
      const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
      if (totalTime > 0) {
        if (totalTime >= 60) {
          const hours = Math.floor(totalTime / 60);
          const mins = totalTime % 60;
          timeStr = mins > 0 ? `${hours} óra ${mins} perc` : `${hours} óra`;
        } else {
          timeStr = `${totalTime} perc`;
        }
      }

      // Calculate difficulty based on database field, with fallback to time
      let diffVal: "Könnyű" | "Közepes" | "Nehéz" = "Könnyű";
      if (r.difficulty) {
        diffVal = r.difficulty as "Könnyű" | "Közepes" | "Nehéz";
      } else {
        const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
        if (totalTime > 60) diffVal = "Nehéz";
        else if (totalTime > 30) diffVal = "Közepes";
      }

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrl,
        time: timeStr,
        prepTime: r.prepTime || 0,
        cookTime: r.cookTime || 0,
        difficulty: diffVal,
        isLiked: r.likes.length > 0,
        servings: r.servings || 4,
        category: r.category,
        tags: r.tags || [],
        videoUrl: r.videoUrl || null,
        ingredients: r.ingredients.map((i) => i.name.toLowerCase()),
        rawIngredients: r.ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
        })),
        authorId: r.authorId,
        authorName: r.author.name || "Szakács",
      };
    });

    return { recipes: formattedRecipes };
  } catch (err: any) {
    console.error("GET SEARCH RECIPES ERROR:", err);
    return { error: "Nem sikerült lekérni a scoopet!" };
  }
}

export async function getUserPreferences() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { preferences: true }
    });

    return { preferences: user?.preferences || [] };
  } catch (err: any) {
    console.error("GET USER PREFERENCES ERROR:", err);
    return { error: "Nem sikerült lekérni a preferenciákat!" };
  }
}

export async function toggleLikeRecipe(recipeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  const userId = session.user.id;

  try {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_recipeId: {
            userId,
            recipeId,
          },
        },
      });
      return { success: true, liked: false };
    } else {
      await prisma.like.create({
        data: {
          userId,
          recipeId,
        },
      });
      return { success: true, liked: true };
    }
  } catch (err: any) {
    console.error("TOGGLE LIKE RECIPE ERROR:", err);
    return { error: "Nem sikerült módosítani a kedvenceket!" };
  }
}

export async function getLikedRecipes() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  try {
    const likes = await prisma.like.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        recipe: {
          include: {
            ingredients: true,
            instructions: true,
            media: true,
            likes: {
              where: {
                userId: session.user.id,
              },
            },
            author: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedRecipes = likes.map((like) => {
      const r = like.recipe;
      const imageUrl = r.media.find((m) => m.type === "image")?.url || "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?auto=format&fit=crop&q=80&w=800";

      let timeStr = "30 perc";
      const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
      if (totalTime > 0) {
        if (totalTime >= 60) {
          const hours = Math.floor(totalTime / 60);
          const mins = totalTime % 60;
          timeStr = mins > 0 ? `${hours} óra ${mins} perc` : `${hours} óra`;
        } else {
          timeStr = `${totalTime} perc`;
        }
      }

      let diffVal: "Könnyű" | "Közepes" | "Nehéz" = "Könnyű";
      if (r.difficulty) {
        diffVal = r.difficulty as "Könnyű" | "Közepes" | "Nehéz";
      } else {
        const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
        if (totalTime > 60) diffVal = "Nehéz";
        else if (totalTime > 30) diffVal = "Közepes";
      }

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrl,
        time: timeStr,
        prepTime: r.prepTime || 0,
        cookTime: r.cookTime || 0,
        difficulty: diffVal,
        isLiked: true,
        servings: r.servings || 4,
        category: r.category,
        tags: r.tags || [],
        videoUrl: r.videoUrl || null,
        ingredients: r.ingredients.map((i) => i.name.toLowerCase()),
        authorId: r.authorId,
        authorName: r.author.name || "Szakács",
      };
    });

    return { recipes: formattedRecipes };
  } catch (err: any) {
    console.error("GET LIKED RECIPES ERROR:", err);
    return { error: "Nem sikerült lekérni a kedvenceket!" };
  }
}

export async function getRecipeById(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  try {
    const r = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: true,
        instructions: {
          orderBy: {
            step: "asc",
          },
        },
        media: true,
        likes: {
          where: {
            userId: session.user.id,
          },
        },
        author: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    if (!r) {
      return { error: "A recept nem található!" };
    }

    const imageUrl = r.media.find((m) => m.type === "image")?.url || "https://images.unsplash.com/photo-1543353071-10c8ba85a904?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D?auto=format&fit=crop&q=80&w=800";

    let timeStr = "30 perc";
    const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
    if (totalTime > 0) {
      if (totalTime >= 60) {
        const hours = Math.floor(totalTime / 60);
        const mins = totalTime % 60;
        timeStr = mins > 0 ? `${hours} óra ${mins} perc` : `${hours} óra`;
      } else {
        timeStr = `${totalTime} perc`;
      }
    }

    let diffVal: "Könnyű" | "Közepes" | "Nehéz" = "Könnyű";
    if (r.difficulty) {
      diffVal = r.difficulty as "Könnyű" | "Közepes" | "Nehéz";
    } else {
      const totalTime = (r.prepTime || 0) + (r.cookTime || 0);
      if (totalTime > 60) diffVal = "Nehéz";
      else if (totalTime > 30) diffVal = "Közepes";
    }

    return {
      recipe: {
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrl,
        time: timeStr,
        prepTime: r.prepTime || 0,
        cookTime: r.cookTime || 0,
        difficulty: diffVal,
        isLiked: r.likes.length > 0,
        category: r.category,
        tags: r.tags || [],
        videoUrl: r.videoUrl || null,
        servings: r.servings || 4,
        ingredients: r.ingredients.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit || "",
        })),
        instructions: r.instructions.map((ins) => ({
          step: ins.step,
          content: ins.content,
        })),
        authorName: r.author.name || "Szakács",
        authorImage: r.author.image || "Face1",
      },
    };
  } catch (err: any) {
    console.error("GET RECIPE BY ID ERROR:", err);
    return { error: "Nem sikerült lekérni a recept részleteit!" };
  }
}

export async function updateRecipe(
  recipeId: string,
  data: {
    title: string;
    description?: string | null;
    prepTime: number;
    cookTime: number;
    servings: number;
    category?: string | null;
    difficulty?: string | null;
    tags?: string[];
    videoUrl?: string | null;
    imageUrl?: string | null;
    ingredients?: { name: string; quantity?: number | null; unit?: string | null }[];
    instructions?: { step: number; content: string }[];
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const r = await tx.recipe.update({
        where: { id: recipeId },
        data: {
          title: data.title,
          description: data.description,
          prepTime: data.prepTime,
          cookTime: data.cookTime,
          servings: data.servings,
          category: data.category,
          difficulty: data.difficulty,
          tags: data.tags,
          videoUrl: data.videoUrl,
        },
      });

      if (data.ingredients) {
        await tx.ingredient.deleteMany({
          where: { recipeId },
        });

        await tx.ingredient.createMany({
          data: data.ingredients
            .filter((i) => i.name.trim() !== "")
            .map((i) => ({
              recipeId,
              name: i.name.trim(),
              quantity: i.quantity || null,
              unit: i.unit?.trim() || null,
            })),
        });
      }

      if (data.instructions) {
        await tx.instruction.deleteMany({
          where: { recipeId },
        });

        await tx.instruction.createMany({
          data: data.instructions
            .filter((ins) => ins.content.trim() !== "")
            .map((ins, idx) => ({
              recipeId,
              step: idx + 1,
              content: ins.content.trim(),
            })),
        });
      }

      if (data.imageUrl !== undefined) {
        // Delete old media records of type "image"
        await tx.media.deleteMany({
          where: {
            recipeId,
            type: "image",
          },
        });

        if (data.imageUrl) {
          // Create new media record
          await tx.media.create({
            data: {
              recipeId,
              url: data.imageUrl,
              type: "image",
            },
          });
        }
      }

      return r;
    });

    return { success: true, recipe: updated };
  } catch (err: any) {
    console.error("UPDATE RECIPE ERROR:", err);
    return { error: "Nem sikerült frissíteni a receptet!" };
  }
}

export async function uploadRecipeImage(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { error: "Nincs fájl kiválasztva!" };
  }

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique name
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${randomStr}-${sanitizedName}`;
    const filePath = join(uploadsDir, filename);

    // Write file
    await writeFile(filePath, buffer);

    return { success: true, url: `/api/uploads/${filename}` };
  } catch (err: any) {
    console.error("FÁJL FELTÖLTÉS HIBA:", err);
    return { error: "Sikertelen fájlfeltöltés!" };
  }
}

export async function createRecipe(data: {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  category?: string;
  difficulty?: string;
  tags?: string[];
  videoUrl?: string;
  ingredients: { name: string; quantity?: number; unit?: string }[];
  instructions: { step: number; content: string }[];
  imageUrl?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  try {
    const recipe = await prisma.recipe.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || "",
        prepTime: data.prepTime ?? 0,
        cookTime: data.cookTime ?? 0,
        servings: data.servings ?? 4,
        category: data.category || "mains",
        difficulty: data.difficulty || "Könnyű",
        tags: data.tags || [],
        videoUrl: data.videoUrl || null,
        authorId: session.user.id,
        ingredients: {
          create: data.ingredients
            .filter(i => i.name.trim() !== "")
            .map(i => ({
              name: i.name.trim(),
              quantity: i.quantity || null,
              unit: i.unit?.trim() || null,
            }))
        },
        instructions: {
          create: data.instructions
            .filter(ins => ins.content.trim() !== "")
            .map(ins => ({
              step: ins.step,
              content: ins.content.trim(),
            }))
        },
        media: data.imageUrl?.trim() ? {
          create: [
            { url: data.imageUrl.trim(), type: "image" }
          ]
        } : undefined
      }
    });

    return { success: true, recipeId: recipe.id };
  } catch (err: any) {
    console.error("CREATE RECIPE ERROR:", err);
    return { error: "Nem sikerült létrehozni a receptet!" };
  }
}

export async function deleteRecipe(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Nincs bejelentkezve!" };
  }

  try {
    const [recipe, user] = await Promise.all([
      prisma.recipe.findUnique({
        where: { id },
        select: { authorId: true }
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })
    ]);

    if (!recipe) {
      return { error: "A recept nem található!" };
    }

    const isAdmin = user?.role === "ADMIN";
    if (recipe.authorId !== session.user.id && !isAdmin) {
      return { error: "Nincs jogosultságod a recept törléséhez!" };
    }

    await prisma.recipe.delete({
      where: { id }
    });

    return { success: true };
  } catch (err: any) {
    console.error("DELETE RECIPE ERROR:", err);
    return { error: "Nem sikerült törölni a receptet!" };
  }
}



