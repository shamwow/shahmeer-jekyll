---
layout: post
title:  "Avoiding overfetching of data using 'filtered' queries"
date:   2017-03-06 21:43:41 +0800
header_image: "/filtered-queries.svg"
---
Updated on May 1st, 2017.

GraphQL does a good job of making it easy to fetch only the data you need when making a specific request. A lot has been written about GraphQL and its benefits so I won't get too much into it. Basically, GraphQL queries make it dead simple to specify the data you want from an object.

{% highlight graphql %}
# An example GraphQL query fetching just the brand, capacity, and price for all water bottles that are blue.
{
  waterbottles(color: "blue") {
    id
    capacity
    brand
    price
  }
}
{% endhighlight %}

Note that you could definitely achieve the same thing with a typical REST endpoint and query parameters.

So GraphQL makes it easy to fetch only the data you want. Often times though, the data you want to fetch isn't always the smallest amount of data you need to fetch. Take the screen shot from Amazon for example:

![Amazon water bottle search](/assets/img/avoid_overfetching_filtered_queries/waterbottle-amazon.png)

Here, we have a page with a series of water bottles along with their brands, capacity, and prices (simplified and among other things). When you click on one of the bottles, a product page is opened, showing more information about the bottle. Assuming we have a single page app, what usually ends up happening is that another request for the selected water bottle is made:

{% highlight graphql %}
{
  waterbottle(id: 101) {
    capacity
    brand
    price
    description
    ...WaterBottleReviews
  }
}
{% endhighlight %}

We already had the capacity, brand, and price of this water bottle so it's inefficient to query for it again. In this example, the amount of duplicated data is pretty small. But it's not hard to imagine a scenario where we make a request for all the reviews of a water bottle despite already having this data in memory. This has the potential to use up a lot of unnecessary bandwidth.

We can use a dynamic 'filtered' query to help reduce what we ask for.

<!-- read more -->

We can figure out which fields we don't need by using our application state. If our water bottles are stored in memory, we can just compare against our queries.

Our state could look something like:

{% highlight text %}
{
  waterbottles: {
    ...

    101: {
      id: 101,
      capacity: 750,
      brand: 'Camelback',
      price: 25,
      description: null,
      reviews: null,
    },

    ...
  },
}
{% endhighlight %}

So we know we already have capacity, brand, and price. Our query for the water bottle's product page then only needs to be:

{% highlight graphql %}
{
  waterbottle(id: 101) {
    description
    ...WaterBottleReviews
  }
}
{% endhighlight %}

It turns out that Relay Classic already does this.<sup>[[1]](#citation-1)</sup> Relay Modern also has support for this via the `RefetchContainer`<sup>[[2]](#citation-2)</sup>. If you're using GraphQL but not using Relay though, there's a little more work involved. The approach that would work with most GraphQL clients would be to implement a query builder. The output of the query builder can then be passed into any client. For illustrative purposes, a very simplistic one in JavaScript might look like:

{% highlight javascript %}

/*
 * Example Input:
 * {
 *    brand: 1,
 *    color: 1,
 *    reviews: {
 *      username: 1,
 *      text: 1
 *    },
 *    price: 0
 * }
 *
 * Example Output:
 * {
 *    brand
 *    color
 *    reviews: {
 *      username
 *      text
 *    }
 * }
 *
 * @param jsonQuery: Object - JSON used to build the GraphQL query.
 * @returns String - The graphQL query string.
 **/
const QueryBuilder = function(jsonQuery) {
  let output = '{\n';
  for (let key of Object.keys(jsonQuery)) {
    if (jsonQuery[key] && typeof jsonQuery[key] === 'object') {
      output += `${key}: ${QueryBuilder(jsonQuery[key])}\n`;
    }
    else if (jsonQuery[key]) {
      output += `${key}\n`;
    }
  }
  return output + '}';
};

{% endhighlight %}

The above code will take a JSON object and include any keys with truthy values in the GraphQL query generated. Of course, this doesn't work completely as there are multiple GraphQL features, like variables and aliases, that aren't accounted for. To come up with a full fledged query builder, we would need a way to encode these features in JSON.

Because `jsonQuery` is a JavaScript object, we can easily diff it against any other JavaScript object, allowing us to perform our optimization. Again, there are some lingering questions, like "how would the diffing look like when the GraphQL query is fetching two different objects?". These should be solvable with a little bit of design work.

I also haven't discussed GraphQL on other platforms, like Android and iOS. Typically, GraphQL queries are statically written (I'll touch in this in a bit) and used to generate classes, allowing GraphQL to integrate well with each platform's type system. This of course makes what we talked about above difficult. Unfortunately, I don't have enough experience with GraphQL on mobile platforms so can't really offer any useful thoughts here.

Going back to REST though, we can achieve what we talked about pretty easily. We can set up our rest endpoint to return fields that are specified through query parameters: `GET /api/waterbottles/101?brand=1&price=1` would return the brand and the price for water bottle with id `101`.

Given existing data for a water bottle, the endpoint string is easy to construct. In fact, most request JavaScript libraries allow query parameters to be specified using an object. A similar situation exists in Java and Objective-C/Swift land.

Some notes. If you're using GraphQL (Relay or not), strongly consider static queries<sup>[[3]](#citation-3)</sup>. Even if you don't use Relay, you can still precompile these and have your request payload just be an identifier rather than sending up the entire GraphQL query. You can also optimize the amount of data you fetch by having different static queries and doing something similar to Relay's `RefetchContainer`. Regardless though, in almost all cases sending along some more data with a request isn't going to be the main bottleneck. Something like actually initiating the request will be. So if you're going to make a a request for data, sending along some more probably won't hurt performance too much. This can obviously differ on a case by case basis so, as with everything, understand your situation before taking action.

----

[1] <a name="citation-1" href="https://github.com/facebook/relay/blob/master/packages/react-relay/classic/traversal/diffRelayQuery.js#L77" target="_blank">https://github.com/facebook/relay/blob/master/packages/react-relay/classic/traversal/diffRelayQuery.js#L77</a><br />
[2] <a name="citation-2" href="https://facebook.github.io/relay/docs/refetch-container.html" target="_blank">https://facebook.github.io/relay/docs/refetch-container.html</a><br />
[3] <a name="citation-3" href="https://dev-blog.apollodata.com/5-benefits-of-static-graphql-queries-b7fa90b0b69a" target="_blank">https://dev-blog.apollodata.com/5-benefits-of-static-graphql-queries-b7fa90b0b69a</a><br />

