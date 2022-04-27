import { ApolloClient, gql, InMemoryCache } from '@apollo/client'

const client = new ApolloClient({
    uri: "http://graph.holaplex.com/v1",
    cache: new InMemoryCache()
})

export default client