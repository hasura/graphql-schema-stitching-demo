# GraphQL Schema Stitching Demo

Schema stitching is the process of creating a single GraphQL schema from multiple underlying GraphQL APIs.

Schema stitching allows you to have one unified API that allows the client to query multiple GraphQL Schemas at the same time, including relations between the schemas.

### Prerequisites

This demo requires Hasura's GraphQL Engine running with the following schema:
A table called `Person` with columns `id`, `name`, and `city`.

### Usage

```
npm install
HASURA_GRAPHQL_ENGINE_URL=http://localhost:9000 npm start
```

Change the `HASURA_GRAPHQL_ENGINE_URL` environment variable to point to a hasura graphql-engine with the `person` schema. Then, open [localhost:8080/graphiql](http://localhost:8080/graphiql) in your web browser, and start exploring with your query.

### Merge Schemas
This demo combines two GraphQL schemas and exposes them on a single API:

1. The [public GraphQL API](https://www.metaweather.com/api/) of Meta Weather, to fetch the temperature information for a given city. Explore this on [Apollo Launchpad](https://launchpad.graphql.com/nxw8w0z9q7)
2. The Hasura GraphQL API, having a table called `Person` with columns `id`, `name` and `city`.

```graphql
# Get weather info
query {
  cityWeather(city_name: "Bangalore") {
    city_name
    temp
    min_temp
    max_temp
    applicable_date
  }
}

# Get person data from Hasura Data API
query fetch_person {
  person {
    id
    name
    city
  }
}
```

We can extend the `person`s city column to include weather information.

```graphql
extend type person {
  city_weather: CityWeather
}
```

Now this can be merged and queried using the same API like:

```graphql

query {
    person {
       id
       name
       city
       # fetching weather after schema stitching
       city_weather {
        city_name
        temp
        min_temp
        max_temp
        applicable_date
      }
    }
}

```
