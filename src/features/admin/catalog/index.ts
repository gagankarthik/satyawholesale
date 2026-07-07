/* Catalog feature barrel. Preserves the public surface of the former
   catalog.tsx so every `@/features/admin/catalog` import keeps working while
   each domain (products, categories, suppliers, promotions, import) now lives
   in its own focused module. */
export { ProductForm, ProductsTab } from "./products";
export { ImportTab } from "./bulk-import";
export { CategoriesTab, CategoryForm } from "./categories";
export { SuppliersTab, SupplierForm } from "./suppliers";
export { PromotionForm, PromotionsTab } from "./promotions";
