import React from 'react';
import warning from 'warning';

export default function renderElement({
/* eslint-disable react/prop-types */
  match,
  Component,
  hasComponent,
  readyState,
  resolving, // Whether it's safe to throw a RedirectException or an HttpError.
/* eslint-enable react/prop-types */
}) {
  const { route } = match;
  const { props } = readyState;

  if (!route.render) {
    if (__DEV__ && !hasComponent) {
      let { query } = route;
      if (query.modern) {
        query = query.modern;
      }

      warning(
        false,
        'Route with query %s has no render method or component.',
        typeof query === 'function' ? query().name : 'UNKNOWN',
      );
    }

    if (!Component || !props) {
      return null;
    }

    return <Component {...match} {...props} />;
  }

  return route.render({
    ...readyState,
    match,
    Component,
    props: props && { ...match, ...props },
    resolving,
  });
}
