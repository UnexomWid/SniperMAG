/**
 * This is a sample scraper. Change it to suit your needs.
 * 
 * A scraper has 2 functions, both taking either the Cheerio $ object, or a JS object in the case of JSON.
 * 
 * scrapeData -> takes the page/JSON of a product, and extracts the availability and price
 * scrapeSearch -> takes a page/JSON containing search results, and extracts all product names and URLs
 */
export default {
    // Scrape data from one product page.
    // Returns { available: Bool, price: Number }
    scrapeData: ($) => {
        const available = $("#unavailable").length == 0;
        const price = parseFloat($("#price").text().replace(/\./g, '').replace(/,/g, '.'))

        return {
            available,
            price
        };
    },
    // Scrape the search results from a search page.
    // Returns a list of products, aka [{ name: String, url: String }, ...]
    scrapeSearch: ($) => {
        const products = $('#product-container').children('.product');

        let result = [];

        for (const product of products) {
            const title = $(product).find('.product-title')[0];

            result.push({
                name: $(title).text(),
                url: $(title).attr('href').split('?')[0] // No query, keep the URL clean
            })
        }

        return result;
    }
}