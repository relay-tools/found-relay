export default function getQueryName(route) {
  if (__DEV__) {
    let { query } = route;
    if (query && query.modern) {
      query = query.modern;
    }

    if (typeof query === 'function') {
      return query().name;
    }
  }

  return 'UNKNOWN';
}
