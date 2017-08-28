/* -*- mode: C; c-file-style: "gnu"; indent-tabs-mode: nil; -*- */

#include <glib.h>

#ifndef BASIN_UTIL_H
#define BASIN_UTIL_H

G_BEGIN_DECLS

GList*
basin_find_resources (const gchar *content);

gchar*
basin_override_resources (const gchar *content);

G_END_DECLS

#endif /* BASIN_UTIL_H */
