#include "config.h"
#include "basin-util.h"

#include <libxml/HTMLparser.h>
#include <libxml/HTMLtree.h>
#include <libxml/xpath.h>

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
  xmlXPathObjectPtr objects;

  doc = htmlReadDoc (content, "", NULL, HTML_PARSE_RECOVER | HTML_PARSE_NOERROR);
  context = xmlXPathNewContext (doc);
  objects = xmlXPathEvalExpression ("//img[@data-soma-job-id]", context);

  if (!xmlXPathNodeSetIsEmpty (objects->nodesetval))
    {
      xmlNodeSetPtr nodeset = objects->nodesetval;
      for (int i = 0; i < nodeset->nodeNr; i++)
        {
          xmlChar *ekn_id = xmlGetProp (nodeset->nodeTab[i], "data-soma-job-id");
          list = g_list_append (list, ekn_id);
        }
    }
  xmlXPathFreeObject (objects);
  xmlXPathFreeContext (context);
  xmlFreeDoc (doc);

  return list;
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
  xmlChar *ekn_id;
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
          ekn_id = xmlGetProp (nodeset->nodeTab[i], "data-soma-job-id");
          prop = g_strdup_printf ("ekn:///%s", ekn_id);
          xmlSetProp (nodeset->nodeTab[i], "src", prop);
          xmlFree (prop);
          xmlFree (ekn_id);
        }
    }
  xmlXPathFreeObject(objects);

  /* override links */
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
              ekn_id = xmlGetProp (subnodeset->nodeTab[0], "src");
              xmlSetProp (nodeset->nodeTab[i], "href", ekn_id);
              xmlFree (ekn_id);
            }
          xmlXPathFreeContext(subcontext);
          xmlXPathFreeObject(subobjects);
        }
    }
  xmlXPathFreeObject(objects);

  xmlXPathFreeContext(context);
  htmlDocDumpMemory(doc, &result, &len);
  xmlFreeDoc(doc);

  return (gchar*) result;
}
