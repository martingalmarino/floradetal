// Short original copy derived strictly from each record's fields. No facts are added.
import { CATEGORY_SINGULAR, LIGHT_LABEL, MAINTENANCE_LABEL, SPACE_LABEL, WATER_LABEL } from './labels';
import { compareSpanish } from './text';
import type { Plant } from './schemas';

export function plantIntro(plant: Plant): string {
  const where = plant.environments.includes('interior')
    ? 'para cultivar en interior'
    : 'para cultivar al aire libre, en balcón, patio o jardín';
  const light = LIGHT_LABEL[plant.lightProfile].toLocaleLowerCase('es-AR');
  const water = WATER_LABEL[plant.waterProfile].toLocaleLowerCase('es-AR');
  const care = plant.maintenance === 'low' ? 'pide pocos cuidados, aunque no ninguno' : 'pide cuidados regulares';
  const size =
    plant.spaceClass === 'varies'
      ? 'Su tamaño depende de la variedad o de cómo la conduzcas.'
      : plant.spaceClass === 'large'
        ? 'Es una planta que necesita bastante espacio.'
        : plant.spaceClass === 'small'
          ? 'Se adapta a espacios chicos.'
          : 'Ocupa un espacio moderado.';
  return `${plant.commonName} (${plant.scientificName}) es una ${CATEGORY_SINGULAR[plant.category]} que en esta guía incluimos ${where}. Prefiere ${light}, se maneja con ${water} y ${care}. ${size}`;
}

export function plantDescription(plant: Plant): string {
  const parts = [
    LIGHT_LABEL[plant.lightProfile].toLocaleLowerCase('es-AR'),
    WATER_LABEL[plant.waterProfile].toLocaleLowerCase('es-AR'),
    MAINTENANCE_LABEL[plant.maintenance].toLocaleLowerCase('es-AR'),
  ];
  return `Cómo cuidar ${plant.commonName.toLocaleLowerCase('es-AR')}: ${parts.join(', ')}. Nota práctica, revisiones de cuidado, calendario y fuentes.`;
}

export function spaceText(plant: Plant): string {
  return SPACE_LABEL[plant.spaceClass];
}

/** Same category first, then shared light and care profile; ties by Spanish name. */
export function relatedPlants(plant: Plant, all: readonly Plant[], limit = 3): Plant[] {
  return all
    .filter((other) => other.id !== plant.id && other.category === plant.category)
    .map((other) => ({
      other,
      score:
        (other.lightProfile === plant.lightProfile ? 2 : 0) +
        (other.waterProfile === plant.waterProfile ? 1 : 0) +
        (other.maintenance === plant.maintenance ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || compareSpanish(a.other.commonName, b.other.commonName))
    .slice(0, limit)
    .map(({ other }) => other);
}
