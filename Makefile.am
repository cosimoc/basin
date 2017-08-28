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
	tools/processor.js \
	$(NULL)

nobase_pkgdata_DATA = \
	$(js_sources) \
	$(NULL)

edit = sed \
	-e 's|@pkgdatadir[@]|$(pkgdatadir)|g' \
	-e 's|@typelibdir[@]|$(typelibdir)|g' \
	-e 's|@pkglibdir[@]|$(pkglibdir)|g' \
	$(NULL)

basin: basin.in Makefile
	$(AM_V_GEN)rm -f $@ $@.tmp && \
	$(edit) $< >$@.tmp && \
	chmod +x $@.tmp && \
	chmod a-w $@.tmp && \
	mv $@.tmp $@

basin-processor: basin-processor.in Makefile
	$(AM_V_GEN)rm -f $@ $@.tmp && \
	$(edit) $< >$@.tmp && \
	chmod +x $@.tmp && \
	chmod a-w $@.tmp && \
	mv $@.tmp $@

# UTIL LIBRARY

basin_headers = \
	lib/basin-util.h \
	$(NULL)

basin_sources = \
	lib/basin-util.c \
	$(NULL)

pkglib_LTLIBRARIES = libbasin.la
libbasin_la_SOURCES = \
	$(basin_headers) \
	$(basin_sources) \
	$(NULL)
# Defining G_LOG_DOMAIN allows you to run any program with
# G_MESSAGES_DEBUG=Basin ./myprogram
# and turn on debug messages
libbasin_la_CPPFLAGS = \
	@BASIN_CFLAGS@ \
	-DG_LOG_DOMAIN=\"Basin\" \
	$(NULL)
libbasin_la_CFLAGS = $(AM_CFLAGS)
libbasin_la_LIBADD = @BASIN_LIBS@
libbasin_la_LDFLAGS = \
	-export-symbols-regex "^basin_" \
	-avoid-version \
	$(NULL)

CLEANFILES += \
	basin \
	basin-processor \
	$(NULL)

bin_SCRIPTS = \
	basin \
	basin-processor \
	basin-helper \
	$(NULL)

EXTRA_DIST += \
	$(js_sources) \
	basin.in \
	basin-processor.in \
	basin-helper \
	$(NULL)

# INTROSPECTION

-include $(INTROSPECTION_MAKEFILE)
INTROSPECTION_GIRS =
INTROSPECTION_SCANNER_ARGS = --add-include-path=$(srcdir) --warn-all $(BASIN_CFLAGS)
INTROSPECTION_COMPILER_ARGS = --includedir=$(srcdir)

introspection_sources = \
	$(basin_sources) \
	$(basin_headers) \
	$(NULL)

Basin-1.0.gir: libbasin.la
Basin_1_0_gir_INCLUDES = \
	GLib-2.0 \
	GObject-2.0 \
	$(NULL)
Basin_1_0_gir_SCANNERFLAGS = \
	--identifier-prefix=Basin \
	--symbol-prefix=basin \
	$(NULL)
Basin_1_0_gir_LIBS = libbasin.la
Basin_1_0_gir_FILES = $(introspection_sources)
INTROSPECTION_GIRS += Basin-1.0.gir

typelibdir = $(pkglibdir)/girepository-1.0
typelib_DATA = $(INTROSPECTION_GIRS:.gir=.typelib)
