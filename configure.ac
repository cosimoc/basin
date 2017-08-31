dnl Process this file with autoconf to produce configure

# Copyright 2017 Endless Mobile, Inc.

dnl ------------
dnl configure.ac
dnl ------------
dnl Please keep this file well-commented. Autotools involve a lot of magical
dnl incantations, and it is easy to mess things up if you don't know what you
dnl are doing.

# Initialization
# --------------
# Initialize Autoconf: package name, version, bug report address, tarball name,
# website
AC_INIT([Basin], [0],
    [], [basin], [http://endlessm.com])
# Verify that the source directory can be found
AC_CONFIG_SRCDIR([lib/basin-util.h])
# Initialize Automake: enable all warnings and do not insist on GNU standards
# no-portability suppresses warnings about syntax specific to GNU make
AM_INIT_AUTOMAKE([-Wall -Wno-portability foreign 1.11 tar-ustar dist-xz no-dist-gzip subdir-objects])
# Initialize Libtool; don't build static libraries
LT_INIT([disable-static])
# Avoid spewing garbage over the terminal ('make V=1' to see the garbage)
AM_SILENT_RULES([yes])
# Keep Autotools macros local to this source tree
AC_CONFIG_MACRO_DIR([m4])

AC_CACHE_SAVE

# Required build tools
# --------------------
# Make sure we can create directory hierarchies
AC_PROG_MKDIR_P
# C compiler
AC_PROG_CC
AC_PROG_CC_C99
# Make sure the C compiler supports per-target CFLAGS
AM_PROG_CC_C_O
# Library configuration tool
PKG_PROG_PKG_CONFIG
# GObject Introspection
GOBJECT_INTROSPECTION_REQUIRE([1.30])

AC_CACHE_SAVE

# Check that the compiler really supports C99
AS_IF([test "x$ac_cv_prog_cc_c99" = "xno"], [AC_MSG_ERROR([C99 is required.])])

# Required libraries
# ------------------
PKG_CHECK_MODULES([BASIN], [
    glib-2.0
    gobject-2.0
    libxml-2.0
])

AX_CHECK_GIRS_GJS(
    [Gio], [2.0],
    [GLib], [2.0],
    [EosShard], [0])

AX_CHECK_GIR_SYMBOLS_GJS([Xapian], [1.0], [Document.add_numeric_value])

AC_CACHE_SAVE

AC_CONFIG_HEADERS([config.h])  dnl Header with system-dependent #defines

# Output
# ------
# List files here that the configure script should output
AC_CONFIG_FILES([ 
    Makefile
])
# Do the output
AC_OUTPUT
