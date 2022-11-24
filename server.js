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
  "utf8"
);

// Load homepage.
fastify.get("/", function (request, reply) {
  const stream = fs.createReadStream(path.join(__dirname, `src/index.html`));
  reply.type("text/html").send(stream);
});

// Load example.
fastify.get("/examples/:example", (request, reply) => {
  const { example } = request.params;

  if (!/^[a-z0-9-]+$/.test(example)) {
    throw new Error("Invalid URL");
  }

  const exampleFilePath = path.join(__dirname, `src/examples/${example}.html`);
  if (!fs.existsSync(exampleFilePath)) {
    throw new Error("Not found");
  }

  let page = fs.readFileSync(exampleFilePath, "utf8");

  // Inject logic to toggle whether Partytown is enabled.
  if (request.query.partytown === "true" || !("partytown" in request.query)) {
    page = page.replaceAll("text/javascript", "text/partytown");
    page = page.replace(
      "</head>",
      `<script>${partytownInlineScript}</script></head>`
    );
    page = page.replace(
      "</body>",
      '<p><strong><a href="?partytown=false" style="color:red">Disable Partytown</a></strong></p></body>'
    );
  } else {
    page = page.replace(
      "</body>",
      '<p><strong><a href="?partytown=true" style="color:green">Enable Partytown</a></strong></p></body>'
    );
  }

  page = page.replace(
    "</body>",
    `
      <hr>
      <nav>
        <a href="/">Partytown Sandboxing Examples</a>,
        <a href="https://weston.ruter.net/">@westonruter</a>
      </nav>
      </body>
    `
  );

  reply
    .headers(crossOriginIsolationHeaders)
    .code(200)
    .type("text/html")
    .send(page);
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
