const { ApolloServer } = require("apollo-server-express");
const { createServer } = require("http");
const express = require("express");
const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { WebSocketServer } = require("ws");
const { useServer } = require("graphql-ws/lib/use/ws");

const mongoose = require("mongoose");
require("dotenv").config();

const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");
const schema = makeExecutableSchema({ typeDefs, resolvers });

const PORT = process.env.PORT || 5000;
const app = express();

const httpServer = createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

const serverCleanup = useServer({ schema }, wsServer);

const server = new ApolloServer({
  schema,
  context: ({ req }) => ({ req }),
  csrfPrevention: true,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),

    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    return server.start();
  })
  .then(() => {
    server.applyMiddleware({ app, path: "/graphql" });
    httpServer.listen(PORT, () => {
      console.log(`Server is running on ${server.graphqlPath}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
