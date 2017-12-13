import React from 'react';
import warning from 'warning';

import getQueryName from './getQueryName';

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
      warning(
        hasComponent,
        'Route with query `%s` has no render method or component.',
        getQueryName(route),
      );

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
