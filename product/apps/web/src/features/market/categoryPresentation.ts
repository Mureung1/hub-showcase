import {
  BedDouble,
  Coffee,
  Dumbbell,
  Flower2,
  GraduationCap,
  Scissors,
  Shirt,
  ShoppingBasket,
  Store,
  Utensils,
  Wheat,
  type LucideIcon,
} from "lucide-react";

import {
  categoryGroupLabel,
  categoryTone,
  resolveCategorySemanticGroup,
  type CategorySemanticGroup,
} from "./categorySemantics";

const CATEGORY_ICONS: Record<CategorySemanticGroup, LucideIcon> = {
  cafe: Coffee,
  food: Utensils,
  bakery: Wheat,
  convenience: ShoppingBasket,
  flower: Flower2,
  beauty: Scissors,
  apparel: Shirt,
  sports: Dumbbell,
  academy: GraduationCap,
  lodging: BedDouble,
  generic: Store,
};

export function resolveCategoryPresentation(category: string) {
  const group = resolveCategorySemanticGroup(category);
  return {
    group,
    label: categoryGroupLabel(category),
    tone: categoryTone(category),
    icon: CATEGORY_ICONS[group],
  };
}
