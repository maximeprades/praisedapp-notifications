# Notifications server

This is the equivalent of our current WebSockets notifications server, but
rewritten using NodeJS and Socks.js.
It's main purpose is to allow us to easily deploy it as a separate Heroku
instance.

## Dependencies

* NodeJS / NPM
* Redis

## Configuration

The server needs the following environment variables to run:

* `REDISTOGO_URL`: e.g. `REDISTOGO_URL="redis://localhost:6379"`

## Run

Make sure to run `npm install` to get the dependencies.

Start using foreman:

    foreman start -f Procfile

Also, Procfile.dev is available to start the server in a development environment
(currently it only starts Redis in addition).


## Todo

* As it's only a raw port of the original notifications server, we need to
  add the support of user authentication and per company messages broadcasting.
* Disable `console.log`s on production: Heroku's logging system is quite slow
  imho.
