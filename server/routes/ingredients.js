import { Router } from "express";

import { supabase } from "../lib/supabase.js";

export const ingredientsRouter = Router();

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