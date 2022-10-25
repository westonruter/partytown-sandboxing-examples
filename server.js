const path = require("path");
const fs = require("fs");

// Require the fastify framework and instantiate it
const fastify = require("fastify")({
  // set this to true for detailed logging:
  logger: false,
});

// See <https://partytown.builder.io/atomics#document-response-headers>.
const crossOriginIsolationHeaders = {
  "Cross-Origin-Embedder-Policy": "credentialless",
  "Cross-Origin-Opener-Policy": "same-origin",
};

// Setup our static files
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
  setHeaders(res) {
    for (const [key, value] of Object.entries(crossOriginIsolationHeaders)) {
      res.setHeader(key, value);
    }
  },
});

// point-of-view is a templating manager for fastify
fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

const partytownInlineScript = fs.readFileSync(
  path.join(__dirname, "public/~partytown/partytown.js")
);

fastify.get("/", function (request, reply) {
  reply.headers(crossOriginIsolationHeaders);

  const partytownEnabled = request.query.partytown === 'true' || ! ('partytown' in request.query);

  reply.view("/src/index.hbs", {
    partytown_inline_script: partytownInlineScript,
    using_partytown: partytownEnabled,
    script_content_type: partytownEnabled ? 'text/partytown' : 'text/javascript'
  });
});

// Run the server and report out to the logs
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      fastify.log.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
    fastify.log.info(`server listening on ${address}`);
  }
);
