---
layout: post
title:  "Triangle strips and Hamiltonian paths"
date:   2017-02-02 21:43:41 +0800
categories: math
header_image: "/graph-theory-and-comp-sci.svg"
---
Graph theory is one of my favorite topics within math. The subject not only offers some pretty fun problems to solve but it also has some important applications in many other fields, not just computer science.

Most of graph theory's computer science applications seem to be related to finding shortest paths though - whether it's for finding the shortest route to a location on a map or it's for finding the shortest path from one node to another in a network. There are a whole bunch of other cool graph theory applications so I decided to write about one that seemed pretty interesting to me: using graph theory to help determine if a triangle mesh can be represented using a triangle strip.

<!-- read more -->

Fair warning though - what I'm about to talk about is actually pretty useless. This is partly because of being outdated but I'll expand on why in a bit.

If you're not familiar, graphics hardware is really good at rendering triangles. So most graphics models are represented as just that, a whole bunch of triangles. Triangles themselves are represented as 3 vertices. So in 3D space each triangle is represented using 9 numbers (xyz coordinates for each of the 3 vertices). A mesh is just a bunch of triangles that form some model, like a cube for example. Typical meshes can be made up of hundreds, if not thousands, of triangles.

The data for these meshes usually first exists on the CPU and needs to be transferred to the GPU. Of course, the faster this transfer, the faster our graphics application is. So it makes sense to try to minimize the amount of data we transfer.

The naive way to represent triangles meshes is to simply include each vertex of each triangle. We can do better than that though.

![Example of a triangle strip](/assets/img/graph_theory_and_comp_sci/triangle_strip.svg)

If you look at the mesh above, you'll notice that the triangles share vertices. The above is actually a triangle strip and can be represented using something like:

{% highlight obj %}

v1_x v1_y v1_z
v2_x v2_y v2_z
v3_x v3_y v3_z
v4_x v4_y v4_z
v5_x v5_y v5_z
v6_x v6_y v6_z
v7_x v7_y v7_z
v8_x v8_y v8_z

{% endhighlight %}

Only the first triangle in the strip needs to have all its vertices declared. Each subsequent triangle can be defined with just one additional vertex. Formally, a triangle strip is a series of triangles where each pair of consecutive triangles share an edge.

This is pretty good compared to the naive representation, which uses 18 vertices compared just 8 vertices:

{% highlight obj %}

# Triangle 1
v1_x v1_y v1_z
v2_x v2_y v2_z
v3_x v3_y v3_z

# Triangle 2
v2_x v2_y v2_z
v4_x v4_y v4_z
v3_x v3_y v3_z

# Triangle 3
v3_x v3_y v3_z
v4_x v4_y v4_z
v5_x v5_y v5_z

# Triangle 4
v4_x v4_y v4_z
v6_x v6_y v6_z
v5_x v5_y v5_z

# Triangle 5
v5_x v5_y v5_z
v6_x v6_y v6_z
v7_x v7_y v7_z

# Triangle 6
v6_x v6_y v6_z
v8_x v8_y v8_z
v7_x v7_y v7_z

{% endhighlight %}

Aside: If you're paying attention, you'll notice that the order of the vertices is kind of weird. This is because the front face of the triangle needs to be known for things like culling. OpenGL uses the order the vertices are declared in, either clockwise or counter clockwise, to determine where the front face of the triangle is. You can read more about it <a traget="_blank" href="https://www.khronos.org/opengl/wiki/Face_Culling">here</a>.

Anyways, now about why this is kind of useless. For one, not everything can be represented as triangle strips. Consider the poorly drawn polygon below and it's triangulation:

![Non triangle strip polygon](/assets/img/graph_theory_and_comp_sci/polygon.svg)

It's impossible to give a series of triangles where each consecutive pair of triangles share an edge.

So in the old days, people would decompose a model to as many triangle strips as possible and then also include any remaining triangles. However, better methods exists today, which brings me to the second reason why this is kind of useless: indexed meshes.

With indexed meshes, all vertices are declared once and upfront. These vertices are then referenced when defining the triangles that make up the mesh. When sent to the GPU, the defined vertices are loaded into memory and then used as needed. As far as I know, this is pretty much what everyone in industry does<sup>[[1]](#citation-1)</sup>.

Despite this though, I still think it's worthwhile to learn about old methods. So back to the kind of useless (but interesting!) triangle strips. We know that having a triangle strip can help reduce the data we send to the GPU but that not all triangulated polygons can be represented as triangle strips. So how can we determine if a triangulation of a polygon can be represented as a triangle strip? It turns out we can use the concept of Hamiltonian paths.

![Examples of graph with and without Hamiltonian paths](/assets/img/graph_theory_and_comp_sci/graphs.svg)

A Hamiltonian path is a walk through a graph that visits every vertex exactly once. Above, the graph on the left has a Hamiltonian path (highlighted) while the one on the right does not.

Say we have a polygon and it's triangulation. We can construct a dual graph where each triangle is a vertex and each vertex is connected if and only if their respective triangles share an edge. Below is an example using a modified version of the triangle strip from before:

![Example of a triangle strip](/assets/img/graph_theory_and_comp_sci/dual.svg)

If the dual graph contains a Hamiltonian path, we can say that the corresponding sequence of triangles form a triangle strip. We could formally write up a proof for this but it should be pretty easy to see.

There are many conditions we can use to help determine if a graph has a Hamiltonian path. For example, if a graph has more than two vertices with degree 1, it can't have a Hamiltonian path. Another example is Dirac's theorem<sup>[[2]](#citation-2)</sup>: a graph with `n > 2` vertices has a Hamiltonian cycle if every vertex has degree greater than `n/2`.

A couple of notes on Dirac's theorem:

    1. If a graph has a Hamiltonian cycle, we know it must have a Hamiltonian path (just remove one edge in the cycle).
    2. Dirac's theorem only applies to simple graphs. So no loops or duplicate edges.

There are a ton of other conditions<sup>[[3]](#citation-3)</sup> but each one is either sufficient or necessary, not both at the same time. This basically means we don't have a quick way of determining if a graph has a Hamiltonian path; the problem actually turns out to be NP complete<sup>[[4]](#citation-4)</sup>.

Kind of a bummer right? Regardless, it's pretty cool to me that something like Hamiltonian paths can be somewhat relevant in computer graphics, a seemingly unrelated field.

There are a couple of things I didn't touch on here. For example, I talked about triangulations assuming we already had one. What if we're given an arbitrary polygon and have to compute the triangulation? How many triangulations exist for a polygon and so all their corresponding dual graphs contain Hamiltonian paths? If you're interested, these questions and more are discussed in <a traget="_blank" href="https://www.palfrader.org/research/misc/2011-tristrips.pdf">this paper</a>.

[1] <a name="citation-1" traget="_blank" href="http://hacksoflife.blogspot.sg/2010/01/to-strip-or-not-to-strip.html">http://hacksoflife.blogspot.sg/2010/01/to-strip-or-not-to-strip.html</a><br />
[2] <a name="citation-2" traget="_blank" href="https://en.wikipedia.org/wiki/Hamiltonian_path#Bondy.E2.80.93Chv.C3.A1tal_theorem">https://en.wikipedia.org/wiki/Hamiltonian_path"></a><br />
[3] <a name="citation-3" traget="_blank" href="http://www.rose-hulman.edu/mathjournal/archives/2000/vol1-n1/paper4/v1n1-4pd.PDF">http://www.rose-hulman.edu</a><br />
[4] <a name="citation-4" traget="_blank" href="https://en.wikipedia.org/wiki/Hamiltonian_path_problem">https://en.wikipedia.org/wiki/Hamiltonian_path_problem</a><br />
