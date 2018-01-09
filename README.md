# Relay TodoMVC
Relay TodoMVC with routing.

This repo includes multiple examples on separate branches:

- [`found-modern`](https://github.com/taion/relay-todomvc/tree/found-modern): Relay Modern with [Found] and [Found Relay]
- [`found-modern-universal`](https://github.com/taion/relay-todomvc/tree/found-modern-universal): Relay Modern with server-side rendering with [Found] and [Found Relay]
- [`found-classic`](https://github.com/taion/relay-todomvc/tree/found-classic): Relay Classic with [Found] and [Found Relay]
- [`found`](https://github.com/taion/relay-todomvc/tree/found): Legacy Relay with [Found] and [Found Relay]
- [`react-router`](https://github.com/taion/relay-todomvc/tree/react-router): Relay Classic with [React Router](https://reacttraining.com/react-router/) and [`react-router-relay`](https://github.com/relay-tools/react-router-relay)

## Usage

Visit http://fashionablenonsense.com/relay-todomvc, or clone this repo and run:

```shell
npm install
npm start
```

Then point your browser at [http://localhost:8080/](http://localhost:8080/).

## Notes

- Most of the code is taken directly from [the official example](https://github.com/relayjs/relay-examples/tree/master/todo) and falls under [the license there](https://github.com/relayjs/relay-examples/tree/master/todo#license).
- The `npm start` command runs webpack-dev-server, and accepts other options, e.g. `npm start -- --port 5000`.

[Found]: https://github.com/4Catalyzer/found
[Found Relay]: https://github.com/4Catalyzer/found-relay
