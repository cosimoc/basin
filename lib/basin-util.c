#include "config.h"
#include "basin-util.h"

#include <libxml/HTMLparser.h>
#include <libxml/HTMLtree.h>
#include <libxml/xpath.h>

#define THUMBNAIL_SVG "<svg width=\"640\" height=\"480\" style=\"background: black\"/>"

static void
append_ids_from_xpath_expression(xmlXPathContextPtr cx,
                                 GList **list,
                                 const char *xpath_expr)
{
  xmlXPathObjectPtr objects = xmlXPathEvalExpression (xpath_expr, cx);
  xmlNodeSetPtr nodeset = objects->nodesetval;
  if (!xmlXPathNodeSetIsEmpty (nodeset))
    {
      for (int i = 0; i < nodeset->nodeNr; i++)
        {
          xmlChar *id = xmlGetProp (nodeset->nodeTab[i], "data-soma-job-id");
          *list = g_list_prepend (*list, g_strdup (id));
          xmlFree (id);
        }
    }
  xmlXPathFreeObject (objects);
}

/**
 * basin_find_resources:
 * @content: (type utf8): the HTML document content
 * Return value: (element-type utf8) (transfer full): list of resources ids
 */
GList*
basin_find_resources (const gchar *content)
{
  GList *list = NULL;
  htmlDocPtr doc;
  xmlXPathContextPtr context;

  doc = htmlReadDoc (content, "", NULL, HTML_PARSE_RECOVER | HTML_PARSE_NOERROR);
  context = xmlXPathNewContext (doc);
  append_ids_from_xpath_expression (context, &list, "//img[@data-soma-job-id]");

  /* from videos */
  append_ids_from_xpath_expression (context, &list, "//a[@data-soma-job-id]");

  xmlXPathFreeContext (context);
  xmlFreeDoc (doc);

  return g_list_reverse (list);
}

/**
 * basin_override_resources:
 * @content: (type utf8): the HTML document content
 * Return value: (type utf8) (transfer full): overrided document content
 */
gchar*
basin_override_resources (const gchar *content)
{
  htmlDocPtr doc;
  xmlXPathContextPtr context;
  xmlXPathObjectPtr objects;
  int len;
  xmlChar *result = NULL;
  xmlChar *id;
  xmlChar *prop;

  doc = htmlReadDoc (content, "", NULL, HTML_PARSE_RECOVER | HTML_PARSE_NOERROR);
  context = xmlXPathNewContext (doc);

  /* override images */
  objects = xmlXPathEvalExpression ("//img[@data-soma-job-id]", context);
  if (!xmlXPathNodeSetIsEmpty (objects->nodesetval))
    {
      xmlNodeSetPtr nodeset = objects->nodesetval;
      for (int i = 0; i < nodeset->nodeNr; i++)
        {
          id = xmlGetProp (nodeset->nodeTab[i], "data-soma-job-id");
          prop = g_strdup_printf ("ekn:///%s", id);
          xmlSetProp (nodeset->nodeTab[i], "src", prop);
          g_free (prop);
          xmlFree (id);
        }
    }
  xmlXPathFreeObject(objects);

  /* override image links */
  objects = xmlXPathEvalExpression ("//a[@data-soma-widget]", context);
  if (!xmlXPathNodeSetIsEmpty (objects->nodesetval))
    {
      xmlNodeSetPtr nodeset = objects->nodesetval;
      for (int i = 0; i < nodeset->nodeNr; i++)
        {
          xmlXPathContextPtr subcontext = xmlXPathNewContext ((xmlDocPtr) nodeset->nodeTab[i]);
          xmlXPathObjectPtr subobjects = xmlXPathEvalExpression ("//img[@data-soma-job-id]", subcontext);
          if (!xmlXPathNodeSetIsEmpty (subobjects->nodesetval))
            {
              xmlNodeSetPtr subnodeset = subobjects->nodesetval;
              id = xmlGetProp (subnodeset->nodeTab[0], "src");
              xmlSetProp (nodeset->nodeTab[i], "href", id);
              xmlFree (id);
            }
          xmlXPathFreeContext(subcontext);
          xmlXPathFreeObject(subobjects);
        }
    }
  xmlXPathFreeObject(objects);

  /* override videos links */
  objects = xmlXPathEvalExpression ("//a[@data-soma-job-id]", context);
  if (!xmlXPathNodeSetIsEmpty (objects->nodesetval))
    {
      htmlDocPtr img_node = htmlReadDoc (THUMBNAIL_SVG, "", NULL, HTML_PARSE_RECOVER | HTML_PARSE_NOERROR);
      xmlNodeSetPtr nodeset = objects->nodesetval;
      for (int i = 0; i < nodeset->nodeNr; i++)
        {
          id = xmlGetProp (nodeset->nodeTab[i], "data-soma-job-id");
          prop = g_strdup_printf ("ekn:///%s", id);
          xmlSetProp (nodeset->nodeTab[i], "href", prop);
          g_free (prop);
          xmlFree (id);

          /* add default thumbnail */
          xmlAddChild (nodeset->nodeTab[i], xmlCopyNode ((xmlNodePtr) img_node, 2));
        }

      xmlFreeDoc (img_node);
    }
  xmlXPathFreeObject(objects);

  xmlXPathFreeContext(context);
  htmlDocDumpMemory(doc, &result, &len);
  xmlFreeDoc(doc);

  return (gchar*) result;
}
