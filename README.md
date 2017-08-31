basin
=====

A toolkit for packing offline content for Endless' knowledge apps.

Building
--------

```
./autogen.sh
./make
./make install
```

Tools
-----

- basin-helper: packs content from files in a directory hierarchy.
- basin-hatch: packs content from a [libingester2](https://github.com/endlessm/libingester) hatch.

basin-helper usage example
--------------------------

`$basin-helper /path/to/input/directory /path/to/output/content`

Say you have some HTML,PDFs, OGG and WEBM files for your animals app, and you put them into a directory like this:

```
directory/
├── Mammals
│   ├── thumbnail.jpg
│   ├── Bats.pdf
│   ├── Cows.webm
│   └── Whales.ogg
└── Reptiles
    ├── thumbnail.jpg
    └── Pythons.html
```

Using `basin-helper`, you will generate offline content structured in 2 categories (*Mammals* and *Reptiles*) with their corresponding articles (*Bats*, *Cows* and *Whales*) and (*Pythons*).

The `thumbnail.jpg` file is used as the thumbnail image for the category.

You can add sub-directories and you will obtain sub-categories.

basin-hatch usage example
-------------------------

`$basin-hatch /path/to/input/hatch/directory /path/to/output/content`

Say you run your [libingester2](https://github.com/endlessm/libingester) script, and it generates a hatch `/path/to/hatch_yourapp_20170821_133843/`.

Using `basin-hatch`, you will generate offline content containing the articles that are ingested by your script. The structure of the content is derived from the articles tags, creating one category for each unique tag.

You can modify the properties of these categories by providing a `hatch_sets.json` file and placing it into the hatch directory, e.g, `hatch_yourapp_20170821_133843/hatch_sets.json`. See the examples below:

 If your script tags the articles with *Sports*, *Politics* and *International*, and you only want the *Sports* category to be featured, then your `hatch_sets.json` should look like this:
```
{
  "tags":{
    "Sports":{
      "featured":true
    }
  }
}
```

If you want all the categories to be featured, except for *Sports* then your `hatch_sets.json` should look like this:
```
{
  "featured-by-default": true,
  "tags":{
    "Sports":{
      "featured":false
    }
  }
}
```

If the `hatch_sets.json` doesn't exist or is empty then all categories will default to non-featured.
