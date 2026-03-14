const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {

  // Pass through static assets
  eleventyConfig.addPassthroughCopy({"static": "/"});
  eleventyConfig.addPassthroughCopy("src/og-image.png");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // Articles collection — ordered by date
  eleventyConfig.addCollection("articles", function(collectionApi) {
    return collectionApi.getFilteredByGlob("src/articles/*.njk")
      .sort((a, b) => a.data.order - b.data.order);
  });

  // Date filter
  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("MMMM d, yyyy");
  });

  // ISO date for sitemap
  eleventyConfig.addFilter("isoDate", dateObj => {
    if (!dateObj) return '';
    return DateTime.fromJSDate(new Date(dateObj), { zone: "utc" }).toFormat("yyyy-MM-dd");
  });

  // RFC 822 date for RSS
  eleventyConfig.addFilter("rssDate", dateObj => {
    if (!dateObj) return '';
    return DateTime.fromJSDate(new Date(dateObj), { zone: "utc" }).toRFC2822();
  });

  // Previous article filter
  eleventyConfig.addFilter("prevArticle", (collection, currentOrder) => {
    return collection.find(a => a.data.order === currentOrder - 1) || null;
  });

  // Next article filter
  eleventyConfig.addFilter("nextArticle", (collection, currentOrder) => {
    return collection.find(a => a.data.order === currentOrder + 1) || null;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
