---
layout: post
title:  "The purpose of redux-thunk"
date:   2017-01-16 21:43:41 +0800
categories: react
header_image: "/redux-thunk.png"
---
The benefit/purpose of the redux-thunk middleware was pretty hard to understand when I was first going through the redux docs, so I thought that writing some things down about it would be a good idea.

The goal of this post is to help better explain why redux-thunk exists, not how to use it. There is a ton of material out there that covers implementation details (I'll link to a few below). Also, this post will probably make most sense if you have background knowledge on react and redux.

<!-- read more -->

Anyways, let's get into it.

As a general overview, redux-thunk is middleware designed to help make using asynchronous actions easier. Below is an example of an asynchronous action:

{% highlight javascript %}
dispatch({
  type: START_NETWORK_REQUEST,
  payload: ACTION_PAYLOAD,
});

setTimeout(() => {
  dispatch({
    type: END_NETWORK_REQUEST,
  });
}, 5000);
{% endhighlight %}

Here, the `setTimeout` is used to mimic the delay that might occur during an async process (like a network call).

So everytime we wanted to perform the above action, we'd need to copy and paste the above code. Of course, we can avoid repeating ourselves by wrapping the code in a function:

{% highlight javascript %}
const emitAsyncAction = function(ACTION_PAYLOAD) {
  dispatch({
    type: START_NETWORK_REQUEST,
    payload: ACTION_PAYLOAD,
  });

  setTimeout(() => {
    dispatch({
      type: END_NETWORK_REQUEST,
    });
  }, 5000);
}

// Usage within a component.
emitAsyncAction(payload);
{% endhighlight %}

This looks alright but we will probably not have access to the `dispatch` function where `emitAsyncAction` is defined. We could somehow get around this if we have a singleton store but that introduces more complications if we also want to get server side rendering to work[1].

So the easiest appraoch is to just have dispatch be passed into `emitAsyncAction`:

{% highlight javascript %}
const emitAsyncAction = function(dispatch, ACTION_PAYLOAD) {
  dispatch({
    type: START_NETWORK_REQUEST,
    payload: ACTION_PAYLOAD,
  });

  setTimeout(() => {
    dispatch({
      type: END_NETWORK_REQUEST,
    });
  }, 5000);
}

// Usage within a component.
emitAsyncAction(this.props.dispatch, payload);
{% endhighlight %}

This works and is pretty reasonable. However, some people might prefer not having to pass `dispatch` to `emitAsyncAction`. This is where redux-thunk comes in. The middleware allows `dispatch` to accept functions instead of just action objects.

After refactoring our code a little bit, we have:

{% highlight javascript %}
const asyncActionCreator = function(ACTION_PAYLOAD) {
  return function() {
    dispatch({
      type: START_NETWORK_REQUEST,
      payload: ACTION_PAYLOAD,
    });

    setTimeout(() => {
      dispatch({
        type: END_NETWORK_REQUEST,
      });
    }, 5000);
  };
}

// Usage within a component.
this.props.dispatch(asyncActionCreator(payload));
{% endhighlight %}

Instead of having a function called `emitAsyncAction`, we have `asyncActionCreator`. Usually an "action" is just an object but we can think of the function returned by `asyncActionCreator` to be an action as well[2]. So when we dispatch our async action, redux/redux-thunk will execute the function in a context where `dispatch` is available.

And that's it. redux-thunk is basically a form of syntactic sugar to prevent having to pass `dispatch` around. To me, the biggest aesthetic benefit is that dispatching asyncrhonous and synchronous actions look the same with redux-thunk:

{% highlight javascript %}
const asyncActionCreator = function(ACTION_PAYLOAD) {
  return function() {
    ...
  };
}

const syncActionCreator = function(ACTION_PAYLOAD) {
  return {
    ...
  };
}

// Usage within a component.
this.props.dispatch(asyncActionCreator(payload));
this.props.dispatch(syncActionCreator(payload));
{% endhighlight %}

There are some other posts out there that help explain why redux-thunk exists, most notably this [stackoverflow answer](http://stackoverflow.com/questions/35411423/how-to-dispatch-a-redux-action-with-a-timeout/35415559#35415559). The answer gives a few other reasons why redux-thunk exists but, to be honest, I found most of them poorly explained and/or unconvincing. Regardless, you should check it out and judge for yourself.

If you want to learn how to use resux-thunk, check out some of these links:

 - [http://redux.js.org/docs/advanced/AsyncActions.html](http://redux.js.org/docs/advanced/AsyncActions.html)
 - [https://github.com/gaearon/redux-thunk](https://github.com/gaearon/redux-thunk)
 - [https://medium.com/@stowball/a-dummys-guide-to-redux-and-thunk-in-react-d8904a7005d3#.ffc3zyw1c](https://medium.com/@stowball/a-dummys-guide-to-redux-and-thunk-in-react-d8904a7005d3#.ffc3zyw1c)

[1] [http://redux.js.org/docs/recipes/ServerRendering.html](http://redux.js.org/docs/recipes/ServerRendering.html)
[2] I mean, technicallly, a JS function is an object but you know what I mean.
