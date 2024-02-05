# NATS CQRS test

Testing a mechanism of notifying users when an asynchronous process has completed.

This uses NATS and SSEs to bridge the gap from asynchronous, event-based architecture.

## Development

This project uses [taskfile](https://taskfiled.dev).

To see a list of tasks, run `task --list`.

## Getting started

First, spin up the docker infra:

```bash
task infra:up
```

You can run everything together with:

```
task serve
```

But I suggest running 3x terminal instances and running the following separately:

```bash
# Provide env var DEBUG=true to get debug logging
task serve:backend:server
task serve:backend:reactor
task serve:frontend
```

Now head over to http://localhost:3001/locations and create a new location.

See `task --list` for more info

## Reationale

In a standard CRUD app, requests can both create/change data and also return
that data.

But when we take an event-driven approach - especially when leveraging CQRS
principles - we decouple the commands/mutations from data retrieval.

While this boasts a range of benefits, it comes with a major downside - user experience.

For example, if a user requests to create a resource, there is no guarantee that
the resource will be available immediately in an event-driven architecture.

And even in the case that the read model is ready, the processes that would be
responsible for writing that read model - ie. persisting a projection into a
relational DB - may have no means of communicating the completion back to the
user.

However, with the power of NATS and async communication channels such as SSE, we
can bridge this gap.

The high-level process is:

- Frontend sends request API server to create new resource

- API server validates payload and publishes the command message onto a stream

  - 🗒️ In an event-sourced world, you would likely parse the command and generate
    one or more events, which are published onto a stream - But I'm cutting
    out the middle-man for simplicity here

- API server sends success response to user

At this point, the user would likely want to navigate to the newly created resource.

But the API server is not able to send this resource back to the client, and a read
model may not have even been created yet as this is handled by a separate service.

Additionally, it's not really the API server's responsibility to try and hunt down this
data as that potentially reintroduces coupling, or the API server being responsible for
providing an optimistic projection of the data (again, more coupling).

So, at this point we can do a couple of things:

- Return some basic metadata (ie. command ID) from the API server and let the
  client subscribe for updates, with a timeout.

- Perform this at the server, stalling the HTTP response and return the full
  payload.

Based off the example that the frontend is subscribing for updates, we can use
technologies like Server Sent Events (SSE) to receive the update.

- The reactor application is subscribed to the commands stream, and processes
  messages as they are published, persisting read models into the DB

- After each successfully processed message, it will send a notification via.
  NATS (pub-sub)

  - 🗒️ In this implementation, we are using NATS pub-sub (not JetStream) as
    we only need a 'fire-and-forget' approach.

- The API server is listening for any notifications and forwards them on to
  subscribers via. SSE.

  - The clients could connect directly to NATS via. websockets, but I wanted
    to have all clients connect via. the API server.

    Alternatively, a separate service could be providing the SSE functionality,
    to simplify the API server's role.

- Client recieves notification payload containing actions to peform - ie.
  redirect to the newly created resource URL or display a message to the user.

  This payload could even potentially contain the read model, ready for instance
  consumption.

All of this can happen extremely quickly - so much so, that this all looks like a
single request, and they are completely unaware of any additional background processing.

But, what happens if the notification takes too long or never arrives? (ie. the reactor
is under heavy load)

Then, the frontend can instead stop waiting and display a notification to the user
that the resource will be available shortly. This could also be built upon to then
notify the user when it is finally ready.

And fortunately, this architecture lets us effortlessly scale, so this scenario should
be easily resolved!

**TODO:** Write pros & cons of client vs. server notification subscription
**TODO:** Add excalidraw diagrams
