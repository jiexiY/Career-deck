import type { Opportunity } from "./types";

const allowedMainlandChinaCompanies = [
  "Paper Games",
  "Papergames",
  "InFold Games",
  "Infold Games",
  "NetEase",
  "Tencent",
  "HoYoverse",
  "miHoYo",
  "Lilith",
  "Century Games",
] as const;

const unitedStatesLocationPattern =
  /\b(united states(?: of america)?|u\.?s\.?a\.?|u\.?s\.?\s+(?:only|remote)|remote\s*(?:-|\u2013|\u2014)\s*u\.?s\.?|u\.?s\.?\s*(?:-|\u2013|\u2014)\s*remote|alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|district of columbia|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i;
const unitedStatesPostalCodePattern =
  /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i;
const mainlandChinaLocationPattern =
  /\b(mainland china|china|beijing|shanghai|shenzhen|guangzhou|hangzhou|chengdu|wuhan|suzhou|nanjing|xiamen|chongqing|tianjin|qingdao|ningbo|dongguan|foshan|zhuhai|hefei|changsha|xi'?an)\b/i;
const excludedChinaRegionPattern = /\b(hong kong|macau|macao|taiwan)\b/i;

export function matchesPreferredOpportunityRegion(opportunity: Opportunity) {
  const location = opportunity.location.trim();

  if (
    unitedStatesLocationPattern.test(location) ||
    unitedStatesPostalCodePattern.test(location)
  ) {
    return true;
  }

  if (
    !mainlandChinaLocationPattern.test(location) ||
    excludedChinaRegionPattern.test(location)
  ) {
    return false;
  }

  const organization = opportunity.organization.toLowerCase();
  return allowedMainlandChinaCompanies.some((company) =>
    organization.includes(company.toLowerCase()),
  );
}
