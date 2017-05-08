---
layout: post
title:  "Avoiding single page application cache staleness"
date:   2017-05-04 21:43:41 +0800
header_image: "/avoiding-cache-staleness.svg"
---

There are a ton of frameworks and libraries out there that address different aspects of single page application (SPA) development. However, <i>when</i> to update a client's cache seems to get neglected<sup>[[1]](#citation-1)</sup>.

The problem I'm referring to is probably best illustrated with an example. With a SPA, the client typically makes one request to the server for the HTML of a page. Other pages are generated dynamically through JavaScript and the data from an AJAX request. So if Shirley visits the home page of a SPA and then she clicks on a link to view Kevin's profile, an API request is sent off to the server to retrieve data related to Kevin. This data is then used to generated HTML which will make up Kevin's profile page.

<!-- read more -->

Say Shirley goes to someone else's profile but then returns back to Kevin's. It would be poor UX if our SPA made another request for Kevin's data after having made the same request a few moments ago. So, typically, data from requests is cached by the client. If you're using REST, your might have a map of urls to responses (which might actually be unnecessary because the browser might actually do this caching for you). If you're using Relay and GraphQL you'll have a normalized cache of response objects<sup>[[2]](#citation-2)</sup>.

Caching is great but it introduces the problem of staleness. What if by the time Shirley went back to Kevin's profile, Kevin changed his display name to 'Kevin da Great'? Because Kevin's data is cached it never gets updated until Shirley refreshes the page.

In some cases, this may not be a problem. But let's assume staleness is something we want to solve. There are a couple of ways to go about it:

1. Always make an AJAX request each time we visit a profile page. This still gives us poor UX though.

2. Have a time to live (TTL) for the items in our cache. A good value for the TTL would depend on what type of application you have. For most use cases, it would be pretty small since the UX problem we're trying to avoid usually occurs when the user quickly goes back to a page that they've already loaded.

    This is actually similar to what the browser does if you have a multi page app. Hitting the back button loads the page from cache, which is why it's usually so quick.

3. Have the server tell us when something has been updated. This might be complicated to implement though. We could subscribe to updates on particular objects through something like postgres triggers<sup>[[3]](#citation-3)</sup>. This works fine when we update objects directly but updates often happen indirectly. For example, if Kevin adds a photo his user object doesn't get updated, a new photos object is added that has a foreign key reference to Kevin. It's easy to see how this can quickly increase in complexity.

    On top of that, there's the issue of scalability. Obviously polling isn't going to work - we might as well have just made a full request. Some sort of long lived connection is probably the way to go. Whether you end up using websockets or something else, your server will need to maintain a long lived connection with the client. The number of clients we can support becomes limited.

So which solution do we pick? Approach 1 doesn't really solve the UX problem and approach 3 introduces a ton of complexity and cost. From the 3, approach number 2 looks the most attractive.

There's actually one other thing we can do - forget about single page and go back to multi page apps. Just some of the benefits: we get caching for free since it gets handled by the browser; it reduces a lot of UI work needed to create various loading screens - something that may actually give your app a better impression<sup>[[4]](#citation-4)</sup>; in a mobile centric world, it's actually better to have a thin client and a thick server than the other way around; multi page apps work better for people with JavaScript disabled; etc, etc.

To be clear, when I say multi page apps, I'm referring to applications whose main routing logic is handled by the server but this doesn't mean that everything needs to be a separate page. If Shirley wants to look at Kevin's pictures, it doesn't make since to load up a separate page for each picture. So this part of the app should be handled with AJAX. Basically, use good judgment.

----

[1] Based on me not being able to find good information on the topic.<br />
[2] <a name="citation-2" target="_blank" href="https://facebook.github.io/relay/docs/thinking-in-graphql.html#client-caching">https://facebook.github.io/relay/docs/thinking-in-graphql.html#client-caching</a><br />
[3] <a name="citation-3" target="_blank" href="https://en.wikipedia.org/wiki/Comet_(programming) ">https://en.wikipedia.org/wiki/Comet_(programming)</a><br />
[4] I've noticed that a loading screen gives the impression that the app is slow but waiting for a page to load in a multi page app gives the impression that the internet connection is slow<a name="citation-4"></a><br />
