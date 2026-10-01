/**
 * Checks whether an uploaded asset publicId belongs to the specified userId.
 * Public IDs must strictly begin with posters/uploads/{userId}/
 */
export function assertUserOwnsPublicId(publicId: string, userId: string): boolean {
  if (!publicId || !userId) return false;
  const expectedPrefix = `posters/uploads/${userId}/`;
  return publicId.startsWith(expectedPrefix);
}
