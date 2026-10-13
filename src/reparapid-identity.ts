export const reparapidWorkshopName = 'RépaRapid · Maxxi Games';

// Present the imported application's default name in the new brand, while
// retaining any workshop name that its administrator has chosen.
export function workshopDisplayName(name: string) {
  return name === 'La Clinique Rétro' ? reparapidWorkshopName : name;
}
