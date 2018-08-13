---
layout: post
title:  "End to end rest API typing"
date:   2018-08-05 21:43:41 +0800
header_image: "/end_to_end_api_typing.svg"
---

A lot of apps use Typescript / JavaScript + Flow for frontend and backend code but I haven't seen apps take advantage of this to create rest APIs that are statically typed end to end. I decided to set up what was needed to get a fully typed API on top of express. It's worked pretty well for some personal projects so I'm sharing it here.

<!-- read more -->

For posterity, at the time of writing I'm using Typescript v3.0.1 and Express v4.16.3.

There are two main files in my backend setup. The first contains my API definition and looks something like this:

{% highlight ts %}
export interface RouteDef {
  body: any;
  params: any;
  query: any;
  response: any;
}

export interface MethodDef {
  [path: string]: RouteDef;
}

export interface ApiDefBase {
  GET: MethodDef;
  POST: MethodDef;
  PUT: MethodDef;
  DELETE: MethodDef;
}

export interface AppApiDef extends ApiDefBase {
  GET: {
    '/api/sample': {
      body: void;
      params: void;
      query: { count: number };
      response: { status: 200; data: { message: 'Success' } };
    };
  };
  POST: {};
  PUT: {};
  DELETE: {};
}
{% endhighlight %}

For each API route you can define the type of the `body` and `query` parameters and what the response should look like. My responses are typed as objects with a `data` and `status` property but you could also extend it to include whatever you want - for example, a `header` property. 

Express also allows you to specify parameters in your routes. So `/api/share/:id` would match routes like `/api/share/123456` where `123456` would be made available via the `id` property on the Express request object. When the route is `/api/share/:id`, the `params` property for the route should be `{id: string}`. Ideally there should be something complaining if the route and params property are inconsistent in the API definition but Typescript doesn't parse strings when type checking so it's something that we'll have to live with.

This API definition is used by the second main file, a custom router:

{% highlight typescript %}
// Middlware for identifying routes that are authenticated. AuthenticatedMiddleware
// requires the user to be logged in and exposes the user object for that user. If not, the 
// route will return a 404. PopulateUserMiddleware just exposes the user object of 
// the logged in user if possible.
import { AuthenticatedMiddleware, PopulateUserMiddleware } from '...';
// Type for express middlware.
import { Middleware } from '...';
 
type HttpMethod = 'GET' | 'PUT' | 'POST' | 'DELETE';

type Handler<
  Def extends { [_: string]: any },
  Auth extends 'authenticated' | 'populate' | 'no' = 'no'
> = (
  input: {
    body: Def['body'];
    params: Def['params'];
    query: Def['query'];
    user: Auth extends 'authenticated'
      ? User
      : Auth extends 'populate' ? User | void : void;
  },
  req: Request,
  res: Response,
) => Promise<Def['response']>;

interface RouterMethod<Method extends HttpMethod> {
  // I wanted to keep route definitions the same as they would be with 
  //vanilla express but also wanted to be able to type whether or not the user 
  // object is defined. The multiple definitions here are to support the 
  // arbitrary number of middleware that express allows in route definitions 
  // while still typing authenticated routes properly.

  <Path extends keyof AppApiDef[Method]>(
    path: Path,
    handler: Handler<AppApiDef[Method][Path]>,
  ): void;
  <Path extends keyof AppApiDef[Method]>(
    path: Path,
    authMiddleware: AuthenticatedMiddleware,
    handler: Handler<AppApiDef[Method][Path], 'authenticated'>,
  ): void;
  <Path extends keyof AppApiDef[Method]>(
    path: Path,
    populateMiddleware: PopulateUserMiddleware,
    handler: Handler<AppApiDef[Method][Path], 'populate'>,
  ): void;

  <Path extends keyof AppApiDef[Method]>(
    path: Path,
    middlewareOne: Middleware,
    handler: Handler<AppApiDef[Method][Path]>,
  ): void;
  <Path extends keyof AppApiDef[Method]>(
    path: Path,
    authMiddleware: AuthenticatedMiddleware,
    middlewareOne: Middleware,
    handler: Handler<AppApiDef[Method][Path], 'authenticated'>,
  ): void;
  <Path extends keyof AppApiDef[Method]>(
    path: Path,
    middlewareOne: Middleware,
    authMiddleware: AuthenticatedMiddleware,
    handler: Handler<AppApiDef[Method][Path], 'authenticated'>,
  ): void;
  <Path extends keyof AppApiDef[Method]>(
    path: Path,
    populateMiddleware: PopulateUserMiddleware,
    middlewareOne: Middleware,
    handler: Handler<AppApiDef[Method][Path], 'populate'>,
  ): void;
  <Path extends keyof AppApiDef[Method]>(
    path: Path,
    middlewareOne: Middleware,
    populateMiddleware: PopulateUserMiddleware,
    handler: Handler<AppApiDef[Method][Path], 'populate'>,
  ): void;
  
  // More definitions like the ones above to support more middleware.
}

export class Router {
  private readonly router: ExpressRouter;

  constructor() {
    this.router = express.Router();
  }

  use(router: Router) {
    this.router.use(router.expressRouter());
  }

  // In case I need to original express router.
  expressRouter(): ExpressRouter {
    return this.router;
  }

  _createRouteMethod(method: 'get' | 'post' | 'put' | 'delete') {
    return (path: string, ...middlewareAndHandler: Function[]) => {
      // `nullx` throws an error if the argument is null - since 
      // `middlewareAndHandler.pop()` can be undefined.
      const handler = nullx(middlewareAndHandler.pop());

      this.router[method](
        path.toString(),
        ...(<any>middlewareAndHandler),
        // AsyncFunc just wraps the async function passed in to return a 500 
        // error code if something goes wrong.
        AsyncFunc(async function(req, res) {
          const { status, data } = <any>await handler(
            {
              query: req.query,
              params: req.params,
              body: req.body,
              user: req.user,
            },
            // Pass in original Express request and response objects in case I 
            // need them.
            req,
            res,
          );
          res.status(status).json(data);
        }),
      );
    };
  }

  get: RouterMethod<'GET'> = this._createRouteMethod('get');
  put: RouterMethod<'PUT'> = this._createRouteMethod('put');
  post: RouterMethod<'POST'> = this._createRouteMethod('post');
  delete: RouterMethod<'DELETE'> = this._createRouteMethod('delete');
}
{% endhighlight %}


The results (shown with visual studio code), trying an invalid route:
![Incorrect route](/assets/img/end_to_end_api_typing/incorrect_route.png)

Trying an incorrect status:
![Incorrect status](/assets/img/end_to_end_api_typing/incorrect_status.png)

Trying incorrect data:
![Incorrect response data](/assets/img/end_to_end_api_typing/incorrect_data.png)

Trying a correct route:
![Correct](/assets/img/end_to_end_api_typing/correct.png)

A route that requires the user to be logged in makes the user available to the handler:
![Authenticated route](/assets/img/end_to_end_api_typing/authenticated_route.png)


The frontend setup has 1 file that looks something like:

{% highlight typescript %}
// Imported as fetch.js

const get = async function<Path extends keyof AppApiDef['GET']>(
  path: Path,
  queryParams: AppApiDef['GET'][Path]['query'],
): Promise<
  | AppApiDef['GET'][Path]['response']
  // The result could also be one of these and we should handle the error cases.
  // Even though the url for the API request is statically checked for, this 404 
  // needs to be included because authenticated routes can return a 404 (see above). 
  // We could avoid this by explicitly passing in a user object to this method 
  // but it hasn't been a source of errors for me so I haven't bothered.
  | { status: 404; data: void }
  | { status: 500; data: void }
> {
  // Make request, return response.
}

// Other methods for other HTTP methods.

export default { get };
{% endhighlight %}

And the result when making an API request in frontend code:

![End result](/assets/img/end_to_end_api_typing/end_result.png)



