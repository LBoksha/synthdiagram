Synthdiagram
============

Synthdiagram is a tiny (<500 lines) PoC for a customizable diagramming
tool. Its end-goal is being a graphical frontend for a modular sound
generator program (synthesizer), allowing the user to connect and
configure various components that together create a sound (to be output
as a wave file), for example a musical note or a sound effect that can
be used in a video game.

I already had code for the program that creates the sounds from a JSON
configuration, but writing the configuration files by hand is a highly
unpleasant task.

Originally I had planned on using a 3rd party library, but I couldn't
find anything I liked (and could actually compile without a lot of
extra steps) in C++ or Python, so an in-browser tool using a JS or
Typescript library would be a logical next choice. Of course after
making that decision I was quickly reminded I know very little about
web development, so using a full-featured and complicated library
seemed counterproductive. (although I do plan on trying this again
with JointJS at some point)

I originally set the following scope:

* Predefined nodes can be dragged onto a diagram
* Nodes can be removed individually
* Nodes can be dragged around in the diagram
* Nodes have ports that can be connected by dragging between them
* Connections can be removed individually
* Nodes contain editable text input fields to represent configuration
* The finished diagram can be exported as JSON

While building I decided to add two goals

* An exported diagram can be imported from JSON
* New node types can be easily added in a separate file

If you don't mind reading Dutch, these goals can be found back in
wat.txt in this project's git history.

While working, I found the following tutorials helpful:

https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web
and other followup tutorials on developer.mozilla.org

https://www.petercollingridge.co.uk/tutorials/svg/interactive/dragging/
and related tutorials on the same page.

I was also surprised to learn input field styling is very different
from styling other HTML/SVG elements:
https://www.456bereastreet.com/lab/styling-form-controls-revisited/text-input-single/

The project is uploaded to Github in the hopes that having access to
project history and considerations that went into making it can be of
help to others that plan to build a similar toy project.

Of course, if you do find the code useful, you are free to build on it
and use the code however you like (in accordance with the included
license).

Usage
-----

The tool runs entirely in a browser; Firefox, Chrome and Edge work.
The synthesizer_node_templates.js file can be changed to create
custom diagram nodes.

Eventually I may connect a backend allowing sounds to be generated and
played immediately from the editor page. For now, all it does is export
JSON.
