export default function getQueryName(route) {
  if (__DEV__) {
    let { query } = route;
    if (query && query.modern) {
      query = query.modern;
    }

    if (typeof query === 'function') {
      query = query();
      if (query.name) return query.name;
      if (query.params && query.params.name) return query.params.name;
    }
  }

  return 'UNKNOWN';
}
