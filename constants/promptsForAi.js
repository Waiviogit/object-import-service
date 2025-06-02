const promptGallerySchema = (images, galleryLength) => `
You are given a JSON array of all images on a product page, each with all their HTML attributes (with class listed first if present).

**Your task:**
1. Select the image that should be used as the main avatar (profile or primary product photo).
2. Select up to ${galleryLength} images suitable for the gallery.

**Instructions:**
- Only include images in the gallery if they are clearly relevant product photos (e.g., showing the product from different angles or in different contexts).
- Do NOT repeat the avatar image in the gallery, unless absolutely no other product images exist.
- Ignore icons, logos, banners, or decorative/non-product images.
- Base your selection on clues from the class, alt text, filename, image dimensions, and any other attribute.

Here is the array of images:
${images}
`;

module.exports = {
  promptGallerySchema,
};
