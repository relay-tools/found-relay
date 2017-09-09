import React from 'react';
import warning from 'warning';

export default function renderElement({
/* eslint-disable react/prop-types */
  match,
  Component,
  isComponentResolved,
  hasComponent,
  readyState,
  resolving, // Whether it's safe to throw a RedirectException or an HttpError.
/* eslint-enable react/prop-types */
}) {
  const { route } = match;
  const { error, props } = readyState;

  if (!route.render) {
    if (!isComponentResolved || (!error && !props)) {
      return undefined;
    }

    if (!props || !hasComponent) {
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
