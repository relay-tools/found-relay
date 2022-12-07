import { type Match } from 'found';
import { type ConcreteRequest, getRequest } from 'relay-runtime';

export function getRouteRequest(
  match: Match,
): ConcreteRequest | undefined | null {
  const { route } = match as any;
  const query = route.getQuery ? route.getQuery(match) : route.query;
  return query && getRequest(query);
}

export default function getNullDataProps(match: Match) {
  const request = getRouteRequest(match);
  const missing: Record<string, null> = {};

  // loop through the relay query metadata to get the top level query fields
  // that will become props, and default them to null to shut relay up about missing data
  if (request) {
    const selections = [...request.operation.selections];
    for (const selection of selections) {
      if (selection.kind === 'LinkedField' && 'name' in selection) {
        missing[selection.alias || selection.name] = null;
      }
      // top level fields may be nested under a condition (@include directive)
      // Make a reasonanble attempt to handle the case
      else if (selection.kind === 'Condition' && 'condition' in selection) {
        selections.push(...selection.selections);
      }
    }
  }
  return missing;
}
