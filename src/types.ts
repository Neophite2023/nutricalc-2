export type Nutrients = {
  kcal: number;
  kJ?: number;
  protein?: number;
  fat?: number;
  saturatedFat?: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;
  transFat?: number;
  carbs?: number;
  availableCarbs?: number;
  sugars?: number;
  fiber?: number;
  ash?: number;
  sodium?: number;
  salt?: number;
  water?: number;
};

export type MealItem = {
  id: string;
  foodName: string;
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sourceVersion: string;
};

export type Meal = {
  id: string;
  name: string;
  eatenAt: string;
  items: MealItem[];
  totals: Nutrients;
  createdAt: string;
  updatedAt: string;
};

export type MealTemplateItem = {
  foodName: string;
  kcal: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sourceVersion: string;
};

export type MealTemplate = {
  id: string;
  name: string;
  items: MealTemplateItem[];
  createdAt: string;
  updatedAt: string;
};

export type WeightEntry = {
  id: string;
  measuredAt: string;
  kg: number;
  createdAt: string;
  updatedAt: string;
};

export type StoreName = "meals" | "mealTemplates" | "settings" | "weights";
