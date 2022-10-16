# About <a href="https://nodejs.org/en"><img align="right" src="https://img.shields.io/badge/NodeJS-16+-339933?logo=node.js" alt="NodeJS" /></a>
**SniperMAG** is a product sniper. Basically, it notifies you when a product's stock/price changes,
and when new products are added. It can be modified to work with any website.

# Setting up

1. Rename the `config.sample.json` file to `config.json`
2. Enter your email details in the config file (the email address that will send the notifications)
3. Add products/search queries in the config

# Running

If you're running the script for the first time, or you're adding new products/search queries, it's recommended
to run the `populate` command. This populates the database with the products, and doesn't send any notifications.

```sh
npm run populate
```

In any other cases, just run the script normally:

```sh
npm start 
```

All of the products are cached in an SQLite3 database. If you don't want the script to watch those products anymore,
simply run the `clean` command.

```sh
npm run clean
```

# How it works

1. All products from the config are added to the database
2. Each search query from the config has one or more results
3. Each result from each query search is added to the database
4. Each product's page will be scraped; if anything changes, the script will send notifications and will update the entry in the database
5. Go back to step 2; if you're running the script with the `populate` command, the script stops here

If you remove products/seach queries from the config, keep in mind that those products will still be stored in the database
(and, therefore, they will be watched). If you don't want this to happen, simply run a `clean` command followed by `populate`,
and then just use the script normally with `start`.

# License <a href="https://github.com/UnexomWid/SniperMAG/blob/master/LICENSE"><img align="right" src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>

This project is licensed under the [MIT license](https://github.com/UnexomWid/SniperMAG/blob/master/LICENSE).