# NATS CQRS test

Testing a mechanism of notifying users when an asynchronous process has completed.

This uses NATS and SSEs to

## Reationale

In a standard CRUD app, requests can both create/change data and also return
that data.

But when we take an event-driven approach - especially when leveraging CQRS
principles - we decouple the commands/mutations from data retrieval.

While this boasts a range of benefits, it comes with a major downside - user experience.

For example, if a user requests to create a resource, there is no guarantee that
the resource will be available immediately in an event-driven architecture. And
even in the case that it is, the processes that would be responsible with
writing the read model (ie. persisting a projection into a relational DB) may
have no means of communicating the completion back to the user making the changes.

However, with the power of NATS and async channels such as SSE, we can bridge this
gap.

The rough process is:

- Frontend sends request API server to create new resource
- API server validates payload and publishes the command message onto a stream
  - In an event-sourced world, you would likely parse the command and generate
    one or more events, which are published onto a stream - But I'm cutting
    out the middle-man for simplicity here
- API server sends success response to user

At this point, the user would likely want to navigate to the newly created resource.
But the API server is not able to send this resource back, and it is likely not even
in the DB yet (this is handled by another service), and it's not the API server's
responsibility to try and return this data (that would reintroduce coupling).

So, at this point we can do a couple of things:

- Return some basic metadata (ie. command ID) from the API server and let the
  client subscribe for updates, with a timeout.
- Perform this at the server, stalling the HTTP response and return the full
  payload.

In this example, the frontend then subscribes to a Server Sent Events (SSE)
channel provided by the API server, and waits for notification of completion.

- At the same time, the reactor application is subscribed to stream, and
  processes messages as they are published
- ...Stumbles upon our newly published command and writes a projection into our DB
  - I'm using NATS KV as a data store to minimise external dependencies (and because
    it's cool)
- Reactor sends notification via NATS pubsub to API server

- _API server has been listening for notifications all this time_
- Notification received from reactor, publishes SSE

All of this can happen extremely quickly so that the user still thinks it's all
a single, synchronous request.

Or, in the event that this happens slower than we wanted (ie. the reactor is under
heavy load), the frontend can instead stop waiting and display a notification to the user
that the resource will be available shortly. And fortunately, this architecture lets
us effortlessly scale, so this scenario should be unlikely!

## Development

This project uses [taskfile](https://taskfiled.dev).

To see a list of tasks, run `task --list`.
