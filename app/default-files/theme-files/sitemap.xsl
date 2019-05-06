<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
    xmlns:html="http://www.w3.org/TR/REC-html40">
    <xsl:output version="1.0" method="html" encoding="UTF-8" />
    <xsl:template match="/">
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head>
                <title>Sitemap XML</title>
                <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                <style type="text/css">
                    html,
                    body {
                        color: #333;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        line-height: 1.4;
                    }

                    a {
                        color: #000;
                        text-decoration: none;
                    }

                    a:hover {
                        text-decoration: underline;
                    }

                    .wrapper {
                        margin: 20px auto;
                        width: 1240px;
                    }

                    .header {
                        font-size: 32px;
                        font-weight: normal;
                    }

                    .info {
                        margin: 25px 0;
                    }

                    .list {
                        width: 100%;
                    }

                    .list,
                    .list td,
                    .list th {
                        border: none;
                    }

                    .list td,
                    .list th {
                        padding: 5px;
                    }

                    .list thead th {
                        background: #eee;
                    }

                    .list tr:nth-child(even) td {
                        background-color: #f0f0f0;
                    }
                </style>
            </head>
		    <body>
                <div class="wrapper">
                    <h1 class="header">Sitemap XML</h1>

                    <div class="info">This sitemap contains <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/> URLs.</div>
                    <table class="list" border="none" cellspacing="0" cellpadding="3">
                        <thead>
                            <tr>
                                <th width="70%">URL</th>
                                <th width="10%">Images</th>
                                <th width="20%">Last Modified</th>
                            </tr>
                        </thead>
                        <tbody>
                            <xsl:for-each select="sitemap:urlset/sitemap:url">
                            <tr>
                                <td>
                                    <xsl:variable name="url"><xsl:value-of select="sitemap:loc"/></xsl:variable>
                                    <a href="{$url}"><xsl:value-of select="sitemap:loc"/></a>
                                </td>
                                <td style="text-align: center;">
                                    <xsl:value-of select="count(image:image)"/>
                                </td>
                                <td style="text-align: center; font-family: monospace;">
                                    <xsl:value-of select="concat( substring( sitemap:lastmod, 0, 11), concat(' ', substring( sitemap:lastmod, 12, 14 ) ) )"/>
                                </td>
                            </tr>
                            </xsl:for-each>
                        </tbody>
                    </table>
                </div>
            </body>
		</html>
    </xsl:template>
</xsl:stylesheet>
