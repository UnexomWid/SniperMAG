# About <a href="https://nodejs.org/en"><img align="right" src="https://img.shields.io/badge/NodeJS-16+-339933?logo=node.js" alt="NodeJS" /></a>
**SniperMAG** is a product sniper. Basically, it notifies you when a product's stock/price changes,
and when new products are added. It can be modified to work with any website.

# Setting up

1. Rename the `config.sample.json` file to `config.json`
2. Enter your email details in the config file (the address is used to send the notifications via nodemailer)
3. Add products/search queries in the config (see the [config docs](#Config))

# Running

**TL;DR:**

Your first time using this project:

```sh
npm run populate
npm start
```

You changed the config by adding or removing products/search queries:

```sh
npm run clean
npm run populate
npm start
```

---

If you're running the script for the first time, or you're adding new products/search queries, it's recommended
to run the `populate` command. This populates the database with the products, and doesn't send any notifications.
Basically, it's like `start`, but it only runs once in order to populate the database, and also doesn't spam notifications.

```sh
npm run populate
```

In any other cases, just run the script normally:

```sh
npm start 
```

All of the products are cached in an SQLite3 database. Even if you remove products/search queries from the config,
those are still cached in the database. To remove them, simply run the `clean` command.

```sh
npm run clean
```

# Config

If you don't feel like reading this whole section, see [Common scenarios](#common-scenarios).

The config file is `config.json`. All of the options listed below should be present in the config.
The *'default'* values refer to what the sample config comes with; the script doesn't set any defaults.

- **database** - the path to the SQLite database (*default:* `data/data.db`)
- **email**
    - **notifications** - whether or not to send email notifications; set this to *false* to disable all email notifications (*default: true*)
    - **host** - email host
    - **port** - email port (*default:* `465`)
    - **secure** - secure email (*default: true*)
    - **user** - email username
    - **pass** - email password
    - **name** - email name, which will appear on the notification emails (*default: SniperMAG*)
    - **address** - email address; this is probably the same as the username; this will appear on the notification emails
- **requestDelay** - delay in ms between requests (*default:* `5000` *aka 5 seconds*)
- **snipeDelay** - the script scrapes all products, and then waits for a bit; this is how long to wait in ms (*default:* `300000` *aka 5 minutes*)
- **maxRetries** - if a request fails, this value says how many times to retry before giving up (*default:* `3`)
- **products** - an array of products, each one having:
    - **url** - the URL of the product; the script sends a request here and receives a response (either HTML or JSON); this response is then scraped by a provider (more details [here](#custom-scraping)) in order to obtain the price and status
    - **name** - the name of the product; should be unique, because it's used as the primary key in the SQLite database
    - **provider** - the JS module that knows how to scrape the response (more details [here](#custom-scraping))
    - **format** - how to pass the response to the provider script
        - `html` if the response is an HTML page (*default*) - this loads the response with Cheerio and passes it to the provider
        - `json` if the response is JSON - this just sends the JSON response to the provider
    - **threshold** - if the new product price is higher than this, the script won't send an email notification when the product becomes available or the price changes;
    if this is `0`, the threshold will be ignored and the script will always send notifications (*default:* `0` *aka no threshold*)
    - **recipients** - a list of strings, each one being an email address; the notification emails regarding this product will only be sent to these addresses
- **searches** - an array of search queries, each one having:
    - **url** - the URL of the search query; the script sends a request here and receives a response (either HTML or JSON); this response is then scraped by a provider (more details [here](#custom-scraping)) in order to obtain the results
    - **keywords** - a list of strings, each one being a **lowercase** keyword; the products that result from this search must contain **all keywords** 9case insensitive); those that don't contain all of them will be ignored
    - **provider** - the JS module that knows how to scrape the response for this search query, and also for each resulting product (more details [here](#custom-scraping))
    - **searchFormat** - how to pass the search response to the provider script
        - `html` if the response is an HTML page (*default*) - this loads the response with Cheerio and passes it to the provider
        - `json` if the response is JSON - this just sends the JSON response to the provider
    - **format** - each product resulting from this search query will have this format passed to it; see the same field from the **products** config object;
    **searchFormat** applies only on the search query response, while this applies on the resulting products
        - *example* - the search URL returns JSON, but each product's URL is an HTML page -> in this case, set `searchFormat` to JSON, and `format` to HTML 
    - **threshold** - each product resulting from this search query will have this threshold passed to it; see the same field in the **products** config object
    - **recipients** - each product resulting from this search query will have this list passed to it; see the same field in the **products** config object

## Common scenarios

#### I just want to scrape a product by its HTML page

Add an entry to the `products` list, and set `format: "html"`

---

#### I'm scraping search results and also the resulting products, both using URLs that return HTML

Use `"html"` for both the `searchFormat` and `format`

---

#### The search URL returns JSON, but each product's URL returns HTML aka the product's page

Use `searchFormat: "json"` and `format: "html"` for the search query

---

#### The search URL returns JSON, just like each product's URL

Use `"json"` for both the `searchFormat` and `format`

---

#### How do I ignore the price of products? I want to always receive notifications, regardless of the price

Set `threshold: 0`

---

#### I (temporarily) don't want to receive any emails

Set `notifications: false` in the `email` object

---


# Custom scraping

In order to scrape content from multiple websites, the script uses so-called providers. A **provider** is simply a JS module that exports 2 functions:

- **scrapeData** - takes the HTML/JSON content of a product, and returns the price and status (available/unavailable) for that product
- **scrapeSearch** - takes the HTML/JSON result from a search, and returns a list of products (name + URL)

To create a provider, simply copy the `providers/sample.js` file to `providers/your_provider.js` and change those 2 functions to suit your needs.

The script supports both HTML and JSON:

- if the URL you use for a product returns **HTML**, then `scrapeData` will receive the HTML content
in the form of Cheerio's `$` object. You can use this to scrape the page by using selectors (refer to the [Cheerio documentation](https://www.npmjs.com/package/cheerio)).

- if the URL returns **JSON**, each product using this provider should have `format: "json"` in the config. The `scrapeData` function
will receive a JS object, parsed from the JSON response

The same goes for `scrapeSearch`; if you use a JSON URL for a search queury, set `searchFormat: "json"`. You should set the `format`
depending on what the resulting product URLs return.

For example, the sample provider (`providers/sample.js`) assumes the parameter to be `$` (aka HTML content) for both scraping functions.
Therefore, if you use this provider in products/search queries, those must have `format: "html"` (and `searchFormat: "html"` on top of that for search queries).

# How it works

1. All products from the config are added to the database
2. Each search query from the config has one or more results
3. Each result is added to the database
4. Each product's page will be scraped; if anything changes, the script will send notifications and will update the entry in the database
5. Go back to step 2; if you're running the script with the `populate` command, the script stops here

If you remove products/seach queries from the config, keep in mind that those products will still be stored in the database
(and, therefore, they will be watched). If you don't want this to happen, simply run a `clean` command followed by `populate`,
and then just use the script normally with `start`.

# License <a href="https://github.com/UnexomWid/SniperMAG/blob/master/LICENSE"><img align="right" src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>

This project is licensed under the [MIT license](https://github.com/UnexomWid/SniperMAG/blob/master/LICENSE).