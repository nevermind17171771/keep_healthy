import models from './muscle-models.json';
export { models };
const latPaths = new Set(['back-upper-back-left-1', 'back-upper-back-right-2']);
export function muscleRegionIds(side: string, region: string, path: string) {
  if (region === 'deltoids') return side === 'front' ? ['front-deltoids', 'side-deltoids'] : ['back-deltoids'];
  if (region === 'upper-back' && latPaths.has(path)) return ['lats'];
  return [region];
}
export function muscleFill(ids: string[], primary: string[], secondary: string[]) {
  return ids.some(id => primary.includes(id)) ? '#f16b59' : ids.some(id => secondary.includes(id)) ? '#d5ab65' : '#505b65';
}
export function muscleMapSvg(primary: string[], secondary: string[], width = 440, height = 380) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 440 380">${(['front', 'back'] as const).map((side, i) => {
    const m = models.models[side];
    return `<svg x="${i * 220}" y="0" width="220" height="350" viewBox="${m.viewBox}"><g transform="${m.transform}"><path d="${m.outline}" fill="#333941" stroke="#49515b" stroke-width="2"/>${m.regions.flatMap(region => region.paths.map(p => `<path d="${p.d}" fill="${muscleFill(muscleRegionIds(side, region.id, p.id), primary, secondary)}" stroke="#242930" stroke-width="2.8" stroke-linejoin="round"/>`)).join('')}</g></svg><text x="${110 + i * 220}" y="375" fill="#a9b0ba" font-size="16" text-anchor="middle" font-family="sans-serif">${i ? 'BACK' : 'FRONT'}</text>`;
  }).join('')}</svg>`;
}
