const path = require("path");
const fs = require("fs");

const fastify = require("fastify")({
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
  path.join(__dirname, "public/~partytown/partytown.js"),
  'utf8'
);

fastify.get("/", function (request, reply) {
  reply.headers(crossOriginIsolationHeaders);

  const partytownEnabled = request.query.partytown === 'true' || ! ('partytown' in request.query);

  let blockingTime = parseInt( request.query.blocktime, 10 );
  if ( isNaN( blockingTime ) || blockingTime <= 0 ) {
    blockingTime = 300;
  }

  reply.view("/src/index.hbs", {
    partytown_inline_script: partytownInlineScript,
    using_partytown: partytownEnabled,
    blocking_time: blockingTime,
    script_content_type: partytownEnabled ? 'text/partytown' : 'text/javascript'
  });
});

fastify.get("/tests/:test/", (request, reply) => {
  const { test } = request.params;

  if (!/^[a-z0-9-]+$/.test(test)) {
    throw new Error('Invalid URL');
  }

  const testFilePath = path.join(__dirname, `src/tests/${test}.html`);
  if (!fs.existsSync(testFilePath)) {
    throw new Error('Not found');
  }

  let page = fs.readFileSync(
    testFilePath,
    'utf8'
  );

  const partytownEnabled = request.query.partytown === 'true' || ! ('partytown' in request.query);

  if (partytownEnabled) {
    page = page.replace('text/javascript', 'text/partytown');
    page = page.replace('</head>', `<script>${partytownInlineScript}</script></head>`);
    page = page.replace('</body>', '<a href="?partytown=false">Disable Partytown</a></body>');
  } else {
    page = page.replace('</body>', '<a href="?partytown=true">Enable Partytown</a></body>');
  }

  reply
    .code(200)
    .type('text/html')
    .send(page);
});

// fastify.get("/tests/:test/:file", (request, reply) => {
//   const { test } = request.params;

//   const partytownInlineScript = fs.readFileSync(
//     path.join(__dirname, `src/tests/${test}/index.html`)
//   );
// });

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
