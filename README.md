# Awayjs Graphics

Dependency for Awayjs applications requiring graphical output: contains data structures for shapes and textures, and interface descriptions for additional APIs such as material and animator data.

## Awayjs Dependencies

* core

## Internal Structure

* animators<br>
Interface APIs for animator classes

* base<br>
Interface APIs for graphics dependents, and root classes for core graphics functionality

* draw<br>
Drawing API for sequential stroke and fill drawing commands

* elements<br>
Data classes for graphical elements such as triangle / line collections

* events<br>
Events for graphics classes

* image<br>
Image data wrappers for binary / compressed and 2D / Cubic images

* managers<br>
(to be moved to materials module)

* materials<br>
(to be moved to materials module)

* parsers<br>
Library parsers for image classes

* pick<br>
Collision object

* textures<br>
Data classes for textures that wrap image data sources

* utils<br>
Helper classes for Bitmap / Image conversion and / or generation