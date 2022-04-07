import { type Match } from 'found';
import React from 'react';

import QuerySubscription from './QuerySubscription';

interface Props {
  match: Match & { route: any };
  Component: React.ElementType | null | undefined;
  isComponentResolved: boolean;
  hasComponent: boolean;
  querySubscription: QuerySubscription;
  resolving: boolean;
}

export default function renderElement({
  /* eslint-disable react/prop-types */
  match,
  Component,
  isComponentResolved,
  hasComponent,
  querySubscription,
  resolving, // Whether it's safe to throw a RedirectException or an HttpError.
}: /* eslint-enable react/prop-types */
Props) {
  const { route, router } = match;
  const { readyState, environment, variables } = querySubscription;
  const { error, props } = readyState;

  if (!route.render) {
    if (!isComponentResolved || (!error && !props)) {
      return undefined;
    }

    if (!props || !hasComponent) {
      if (process.env.NODE_ENV !== 'production')
        console.error(
          `Route with query \`${querySubscription.getQueryName()}\` has no render method or component.`,
        );

      return null;
    }
    // @ts-ignore
    return <Component match={match} router={router} {...props} />;
  }

  return route.render({
    ...readyState,
    match,
    Component: isComponentResolved ? Component : null,
    props: props && { match, router, ...props },
    environment,
    variables,
    resolving,
  });
}
