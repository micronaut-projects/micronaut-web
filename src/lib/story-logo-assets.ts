import { withBasePath } from "./base-path.ts";

export type LogoSource = {
  src: string;
  srcset?: string;
  sizes?: string;
  width?: number;
  height?: number;
};

const intrinsicDimensions: Record<string, { width: number; height: number }> = {
  "/micronaut-assets/main-site/wp-content/uploads/2025/01/Agorapulse-logo-blue.svg":
    { width: 1204, height: 251 },
  "/micronaut-assets/main-site/wp-content/uploads/2025/01/Agorapulse-logo-dark.svg":
    { width: 1204, height: 251 },
  "/micronaut-assets/main-site/wp-content/uploads/2025/01/Kestra.full_.logo_.dark_.svg":
    { width: 889, height: 203 },
  "/micronaut-assets/main-site/wp-content/uploads/2025/01/Kestra.full_.logo_.light-text.svg":
    { width: 889, height: 203 },
  "/micronaut-assets/main-site/wp-content/uploads/2025/02/Sonar_Logo_Dark-Backgrounds.svg":
    { width: 225, height: 87 },
  "/micronaut-assets/main-site/wp-content/uploads/2025/02/Sonar_Logo_Light-Backgrounds.svg":
    { width: 225, height: 87 },
  "/micronaut-assets/main-site/wp-content/uploads/2025/02/oracle.svg": {
    width: 710,
    height: 410,
  },
  "/micronaut-assets/home/minecraft.png": { width: 429, height: 185 },
  "/micronaut-assets/home/mojang.png": { width: 387, height: 185 },
  "/micronaut-assets/home/samsung-smart-things.png": {
    width: 429,
    height: 185,
  },
  "/micronaut-assets/home/sonar-black-and-grey.svg": { width: 224, height: 86 },
  "/micronaut-assets/home/target.png": { width: 142, height: 185 },
};

/** Raster logos that ship pre-scaled WebP variants for the sizes we render. */
const responsiveVariants: Record<
  string,
  { widths: [number, number]; height: number }
> = {
  "/micronaut-assets/home/samsung-smart-things.png": {
    widths: [111, 222],
    height: 48,
  },
  "/micronaut-assets/home/mojang.png": { widths: [100, 200], height: 48 },
  "/micronaut-assets/home/minecraft.png": { widths: [111, 222], height: 48 },
};

/**
 * Resolves the `src`, `srcset`, `sizes` and intrinsic dimensions for a logo
 * asset path. Every surface that renders an organisation logo goes through
 * here so the responsive variants and dimensions cannot drift per page.
 */
export function logoSource(assetPath: string): LogoSource;
export function logoSource(assetPath: undefined): undefined;
export function logoSource(assetPath?: string): LogoSource | undefined;
export function logoSource(assetPath?: string): LogoSource | undefined {
  if (!assetPath) {
    return undefined;
  }
  const variant = responsiveVariants[assetPath];
  if (variant) {
    const [small, large] = variant.widths;
    const variantPath = (width: number) =>
      withBasePath(assetPath.replace(/\.[^.]+$/, `-${width}w.webp`));
    return {
      src: variantPath(large),
      srcset: `${variantPath(small)} ${small}w, ${variantPath(large)} ${large}w`,
      sizes: `${small}px`,
      width: small,
      height: variant.height,
    };
  }
  return { src: withBasePath(assetPath), ...intrinsicDimensions[assetPath] };
}
