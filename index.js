import Express from 'express';
import fetch from 'node-fetch';
import bodyParser from 'body-parser';

import { graphqlExpress, graphiqlExpress } from 'apollo-server-express';
import { makeRemoteExecutableSchema, mergeSchemas, introspectSchema } from 'graphql-tools';
import { HttpLink } from 'apollo-link-http';

const WEATHER_GRAPHQL_API_URL = 'https://nxw8w0z9q7.lp.gql.zone/graphql'; // metaweather graphql api
const HASURA_GRAPHQL_API_URL = process.env.HASURA_GRAPHQL_ENGINE_URL + '/v1alpha1/graphql'; // replace this url

async function run() {

  const createRemoteSchema = async (uri) => {
    const link = new HttpLink({uri: uri, fetch});
    const schema = await introspectSchema(link);
    return makeRemoteExecutableSchema({
      schema,
      link,
    });
  };

  const executableWeatherSchema = await createRemoteSchema(WEATHER_GRAPHQL_API_URL);
  const executableHasuraSchema = await createRemoteSchema(HASURA_GRAPHQL_API_URL);

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
