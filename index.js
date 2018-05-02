import Express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';
import fs from 'fs';

import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeExecutableSchema, makeRemoteExecutableSchema, mergeSchemas, introspectSchema } from 'graphql-tools';
import { createApolloFetch } from 'apollo-fetch';
import { HttpLink } from 'apollo-link-http';

const WEATHER_GRAPHQL_API_URL = 'https://nxw8w0z9q7.lp.gql.zone/graphql';
const HASURA_GRAPHQL_API_URL = 'https://data.' + process.env.CLUSTER_NAME + '.hasura-app.io/v1alpha1/graphql';

async function run() {

  const createRemoteSchema = async (uri) => {
    const fetcher = createApolloFetch({uri});
    return makeRemoteExecutableSchema({
      schema: await introspectSchema(fetcher),
      fetcher
    });
  }

  const executableWeatherSchema = await createRemoteSchema(WEATHER_GRAPHQL_API_URL);
  const hasuraLink = new HttpLink({ uri: HASURA_GRAPHQL_API_URL, fetch });

  // import graphql schema having person table
  const hasuraGraphSchema = fs.readFileSync('./schema.graphql', "utf8");

  const hasuraWeatherResolvers = {
    person: {
      city_weather : {
        resolve(parent, args, context, info) {
          return info.mergeInfo.delegateToSchema({
            schema: executableWeatherSchema,
            operation: 'query',
            fieldName: 'cityWeather',
            args: {
              city_name: parent.city,
            },
            context,
            info,
          });
        },
      },
    },
  };

// extend author to have city_weather data
  const linkHasuraTypeDefs = `
    extend type person {
      city_weather: CityWeather,
    }
  `;

  const executableHasuraSchema = await makeRemoteExecutableSchema({
    schema: hasuraGraphSchema,
    link: hasuraLink,
  });

  const finalSchema = mergeSchemas({
    schemas: [
      executableWeatherSchema,
      executableHasuraSchema,
      linkHasuraTypeDefs
    ],
    resolvers: hasuraWeatherResolvers
  });

  const app = new Express();

  app.use('/graphql', bodyParser.json(), graphqlExpress({ schema: finalSchema}));

  app.use('/graphiql',graphiqlExpress({endpointURL: '/graphql'}));

  app.listen(8080);
  console.log('Server running. Open http://localhost:8080/graphiql to run queries.');
} // end of async run

try {
  run();
} catch (e) {
  console.log(e, e.message, e.stack);
}
