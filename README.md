# SaaSMap
<h3>A NodeJS server processing and providing MSP client-user data</h3>

SaaSMap takes data from SaaS Alerts, a platform that aggregates data from various SaaS providers such as Microsoft 365, Google, Slack, etc and provides a basic API for a webclient (a rudimentary NOC monitor) to use.

The server is exclusively written in NodeJS, whereas the client is React.JS using MapboxGL for rendering data to the map.

If using Docker (a Dockerfile for the server is included), be sure to expose port 4000, or whichever port you decide to assign to the environmental variable `PORT`.

Future commits for the server will see the use of an ORM for query handling and a better logging system.
Future commits for the client will include an expansion of features such as visualizations of bad login events as opposed to just the display of valid logins, and any other additions requested for, as this is a webapp currently in use by a client.
