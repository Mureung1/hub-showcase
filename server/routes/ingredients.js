import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { supabase } from "../lib/supabase.js";

export const ingredientsRouter = Router();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const ingredientInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  subcategory: z.string().trim().max(50).nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(50)).default([]),
  quantity: z.number().nonnegative().nullable(),
  unit: z.string().trim().max(30).nullable(),
  quantity_mode: z.enum(["exact", "notTracked"]),
  storage: z.enum(["fridge", "freezer", "room"]),
  expiration_type: z.enum(["relative", "absolute", "longTerm"]),
  expiration_date: dateSchema.nullable(),
  shelf_life_days: z.number().int().nonnegative().nullable(),
  stored_at: dateSchema,
  is_staple: z.boolean(),
  is_instant: z.boolean(),
  is_prepared: z.boolean(),
  icon: z.string().max(20),
  memo: z.string().max(500).default(""),
}).superRefine((ingredient, context) => {
  if (ingredient.quantity_mode === "exact" && ingredient.quantity === null) {
    context.addIssue({
      code: "custom",
      path: ["quantity"],
      message: "정확한 수량을 관리할 때는 수량이 필요합니다.",
    });
  }
});

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getDueDate(ingredient) {
  if (ingredient.expiration_date) return ingredient.expiration_date;
  if (ingredient.expiration_type === "relative" && ingredient.shelf_life_days !== null) {
    return addDays(ingredient.stored_at, ingredient.shelf_life_days);
  }
  return null;
}

function hasSameInventoryIdentity(candidate, ingredient) {
  return candidate.name === ingredient.name
    && candidate.storage === ingredient.storage
    && (candidate.unit ?? null) === (ingredient.unit || null)
    && getDueDate(candidate) === getDueDate(ingredient);
}

function normalizeIngredientInput(ingredient) {
  return {
    ...ingredient,
    unit: ingredient.unit || null,
    quantity: ingredient.quantity_mode === "notTracked" ? null : ingredient.quantity,
  };
}

function getWritableIngredient(ingredient) {
  const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...writableIngredient } = ingredient;
  return writableIngredient;
}

function sendIngredientNotFound(res) {
  return res.status(404).json({
    error: {
      code: "INGREDIENT_NOT_FOUND",
      message: "재료를 찾을 수 없습니다.",
    },
  });
}

ingredientsRouter.get("/", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      ingredients: data,
    });
  } catch (error) {
    next(error);
  }
});

ingredientsRouter.post("/", async (req, res, next) => {
  try {
    const parsed = ingredientInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "INVALID_INGREDIENT",
          message: "재료 입력값을 확인해 주세요.",
        },
      });
    }

    const ingredient = normalizeIngredientInput(parsed.data);

    if (ingredient.quantity_mode === "exact") {
      const { data: candidates, error: findError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("name", ingredient.name)
        .eq("storage", ingredient.storage)
        .eq("quantity_mode", "exact");

      if (findError) throw findError;

      const matchingIngredient = candidates.find((candidate) => hasSameInventoryIdentity(candidate, ingredient));

      if (matchingIngredient) {
        const { data, error } = await supabase
          .from("ingredients")
          .update({ quantity: matchingIngredient.quantity + ingredient.quantity })
          .eq("id", matchingIngredient.id)
          .select("*")
          .single();

        if (error) throw error;

        req.log.info({ ingredientId: data.id }, "Ingredient quantity merged");
        return res.status(200).json({ ingredient: data, merged: true });
      }
    }

    const { data, error } = await supabase
      .from("ingredients")
      .insert({ id: `ingredient-${randomUUID()}`, ...ingredient })
      .select("*")
      .single();

    if (error) throw error;

    req.log.info({ ingredientId: data.id }, "Ingredient created");
    return res.status(201).json({ ingredient: data, merged: false });
  } catch (error) {
    return next(error);
  }
});

ingredientsRouter.patch("/:id", async (req, res, next) => {
  try {
    const parsed = ingredientInputSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "INVALID_INGREDIENT",
          message: "재료 입력값을 확인해 주세요.",
        },
      });
    }

    const { data: currentIngredient, error: currentError } = await supabase
      .from("ingredients")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!currentIngredient) return sendIngredientNotFound(res);

    const ingredient = normalizeIngredientInput(parsed.data);

    if (ingredient.quantity_mode === "exact") {
      const { data: candidates, error: findError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("name", ingredient.name)
        .eq("storage", ingredient.storage)
        .eq("quantity_mode", "exact")
        .neq("id", req.params.id);

      if (findError) throw findError;

      const matchingIngredient = candidates.find((candidate) => hasSameInventoryIdentity(candidate, ingredient));

      if (matchingIngredient) {
        const mergedIngredient = {
          ...ingredient,
          quantity: matchingIngredient.quantity + ingredient.quantity,
        };
        const { data, error: mergeError } = await supabase
          .from("ingredients")
          .update(mergedIngredient)
          .eq("id", matchingIngredient.id)
          .select("*")
          .single();

        if (mergeError) throw mergeError;

        const { error: deleteError } = await supabase
          .from("ingredients")
          .delete()
          .eq("id", currentIngredient.id);

        if (deleteError) {
          const { error: rollbackError } = await supabase
            .from("ingredients")
            .update(getWritableIngredient(matchingIngredient))
            .eq("id", matchingIngredient.id);

          if (rollbackError) {
            req.log.error({ err: rollbackError, ingredientId: matchingIngredient.id }, "Ingredient merge rollback failed");
          }
          throw deleteError;
        }

        req.log.info({ ingredientId: data.id, removedIngredientId: currentIngredient.id }, "Ingredients merged after update");
        return res.status(200).json({ ingredient: data, merged: true });
      }
    }

    const { data, error } = await supabase
      .from("ingredients")
      .update(ingredient)
      .eq("id", currentIngredient.id)
      .select("*")
      .single();

    if (error) throw error;

    req.log.info({ ingredientId: data.id }, "Ingredient updated");
    return res.status(200).json({ ingredient: data, merged: false });
  } catch (error) {
    return next(error);
  }
});

ingredientsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("ingredients")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return sendIngredientNotFound(res);

    req.log.info({ ingredientId: data.id }, "Ingredient deleted");
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});
