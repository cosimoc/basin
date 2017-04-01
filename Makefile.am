## Process this file with automake to produce Makefile.in

# Copyright 2017 Endless Mobile, Inc.

## -----------
## Makefile.am
## -----------
## Please keep this file well-commented.

# Our Autoconf macros are kept in the m4/ directory
ACLOCAL_AMFLAGS = -I m4

# Generated files that 'make clean' should erase
CLEANFILES =
EXTRA_DIST =

js_sources = \
	src/main.js \
	src/shard.js \
	src/links.js \
	src/index.js \
	src/packer.js \
	$(NULL)

nobase_pkgdata_DATA = \
	$(js_sources) \
	$(NULL)

edit = sed \
	-e 's|@pkgdatadir[@]|$(pkgdatadir)|g' \
	$(NULL)
basin: basin.in Makefile
	$(AM_V_GEN)rm -f $@ $@.tmp && \
	$(edit) $< >$@.tmp && \
	chmod +x $@.tmp && \
	chmod a-w $@.tmp && \
	mv $@.tmp $@

CLEANFILES += basin

bin_SCRIPTS = basin

EXTRA_DIST += \
	$(js_sources) \
	basin.in \
	$(NULL)
