import { expressServer } from './server';
import { serverPort } from './config';

///////////////////////////////////////////////////////////////////////////////////////////
// Start the http server that takes requests from nginx.
const httpServer = expressServer.listen(serverPort, () => {
  console.log(`Server is running on http://localhost:${serverPort}`);
});

///////////////////////////////////////////////////////////////////////////////////////////
// Need this in docker container to properly exit since node doesn't handle SIGINT/SIGTERM.
// Quit on ctrl-c when running docker in terminal.
process.on("SIGINT", function onSigint() {
  console.info(
    "Got SIGINT (aka ctrl-c in docker). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// Quit properly on docker stop.
process.on("SIGTERM", function onSigterm() {
  console.info(
    "Got SIGTERM (docker container stop). Graceful shutdown ",
    new Date().toISOString()
  );
  shutdown();
});

// Shut down server.
function shutdown() {
  httpServer.close((err: any) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
}
