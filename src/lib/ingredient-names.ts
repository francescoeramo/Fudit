/** Exclude quantity-parser leftovers and preparation notes from food names. */
export const cleanIngredientName = (value: string): string | null => {
  const name = value
    .replace(/^[\s.,;:–—-]+|[\s.,;:–—-]+$/g, "")
    .replace(/\s+/g, " ");
  if (
    !/\p{L}{2}/u.test(name) ||
    /^(?:e|ed|o|oppure|un|uno|una|a|con|condit[oaie]|per)(?:\s|$)/i.test(
      name,
    ) ||
    /^(?:q\.?\s*b\.?|quanto basta)$/i.test(name)
  )
    return null;
  return name;
};
