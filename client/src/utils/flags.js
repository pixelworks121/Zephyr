// Best-effort mapping of common country names to flag emojis.
// Falls back to an empty string when unknown so callers can render plainly.
const NAME_TO_CODE = {
  'united states': 'US',
  usa: 'US',
  us: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  england: 'GB',
  canada: 'CA',
  australia: 'AU',
  germany: 'DE',
  france: 'FR',
  spain: 'ES',
  italy: 'IT',
  netherlands: 'NL',
  india: 'IN',
  china: 'CN',
  japan: 'JP',
  brazil: 'BR',
  mexico: 'MX',
  singapore: 'SG',
  ireland: 'IE',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  switzerland: 'CH',
  austria: 'AT',
  belgium: 'BE',
  portugal: 'PT',
  poland: 'PL',
  'new zealand': 'NZ',
  'south africa': 'ZA',
  'united arab emirates': 'AE',
  uae: 'AE',
  israel: 'IL',
  'south korea': 'KR',
  korea: 'KR',
};

function codeToFlag(code) {
  if (!code || code.length !== 2) return '';
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function countryFlag(country) {
  if (!country) return '';
  const key = String(country).trim().toLowerCase();
  const code = NAME_TO_CODE[key] || (key.length === 2 ? key.toUpperCase() : null);
  return code ? `${codeToFlag(code)} ` : '';
}
