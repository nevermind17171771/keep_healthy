/** A plain outbound search; no embedded player, API key, or workout data is sent. */
export function shortsSearchUrl(name: string) {
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(`${name.trim()} 운동 자세 쇼츠 #shorts`);
}
