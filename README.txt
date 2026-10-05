NODEX STORE
===========

A static storefront (HTML, CSS and JavaScript). It has two modes, chosen in
js/config.js:

  mode: 'demo'      Simulated. Runs entirely in the visitor's browser with no
                    database. Use this to show the site to a client.
  mode: 'supabase'  Live. Connected to a Supabase project. No server of your
                    own is required.

The files are delivered in demo mode.


FILES
-----

index.html              Page shell; loads the scripts below in order.
css/style.css           All styling (dark theme, with a light variant).
js/config.js            Mode, Supabase URL and anon key, currency, defaults.
                        This is the only file you must edit.
js/utils.js             Helpers (formatting, storage, toast messages).
js/art.js               Generated placeholder product art.
js/images.js            Product photographs: first-image helper and in-browser resizing.
js/backend-supabase.js  Live backend: products, orders, settings, sign-in.
js/backend-demo.js      Demo backend: the same functions, simulated in the
                        browser (localStorage).
js/backend.js           Chooses the backend according to the mode.
js/state.js             Application state, cart and totals.
js/hero.js              Hero banner slider: autoplay, arrows, dots, swipe.
js/gallery.js           Product page image gallery: arrows, thumbnails, swipe.
js/views-store.js       Home, catalogue, product page, cart, checkout and
                        order confirmation.
js/views-account.js     Sign in, registration and order history.
js/views-admin.js       Admin: products, orders and settings.
js/app.js               Router, event handlers, form submission and start-up.
sql/schema.sql          Database schema, security rules and sample data
                        (for Supabase; not used in demo mode).
.nojekyll               Tells GitHub Pages to serve the files as they are.

The scripts share one global scope and must stay in the order listed in
index.html.


PRODUCT IMAGES
--------------

In Admin > Products, the Add product / Edit form has an Images field. Choose
one or more photos (up to 6 per product, set by images.maxPerProduct in
js/config.js). Each photo is resized in the browser before it is saved. Use the
arrow buttons under a thumbnail to change the order and the cross to remove
it. The first image is the main one:
- the catalogue, the hero banner and the cart show the first image only;
- the product page shows all images, which visitors can cycle through with the
  arrows, the thumbnails, a swipe on a phone, or the keyboard arrow keys.
A product with no images keeps its generated placeholder.

Tip: landscape photos in a 3:2 shape fill the catalogue cards best. Photos of
other shapes are cropped to fit on the cards, but are shown whole on the
product page.

Where the images are kept:
- Live mode: in a Supabase Storage bucket named product-images, created by
  sql/schema.sql. Anyone can view the images; only administrators can add or
  remove them. Removing an image, or deleting a product, also deletes the
  stored files. The free Supabase plan includes 1 GB of file storage.
- Demo mode: inside the visitor's browser, which only has a few megabytes of
  room, so demo images are resized smaller. If the browser is full, the
  admin portal says so; remove some images or use "Reset demo data".


DEMO MODE (SHOWING THE SITE TO A CLIENT)
----------------------------------------

Upload the files to GitHub and enable GitHub Pages (see below). Nothing else
is needed: no Supabase account, no keys.

What the demo simulates: browsing and searching the catalogue, product pages,
add to cart, cart, guest checkout (Male' and island delivery, with the
delivery fee rule), customer registration and sign-in, order history, and the
admin portal (add, edit and delete products, change price and stock, view
orders, change order status, change delivery and tax settings). Cancelling an
order returns its items to stock, as in the live system.

The home page opens with a rotating hero banner. It shows every in-stock
product ticked "Show in hero banner" in the admin product form (up to the
heroMax setting in js/config.js), changing every heroInterval milliseconds.
Visitors can use the arrows, dots, keyboard arrows, or swipe on a phone.
The banner pauses on hover and does not auto-advance for visitors who have
asked their device to reduce motion.

Demo accounts:
  Administrator   admin@demo.mv   password: demo1234
  Customer        use Create account: name, phone number, any email address
                  and a password of 6 or more characters

If you already ran sql/schema.sql in Supabase before this version, run it again
(it is safe to repeat): it adds the images column and the storage bucket.

Things the client should know:
- Data is stored in the visitor's own browser only. Changes made in the admin
  portal are not seen by anyone else, including you, and they disappear if the
  browser data is cleared.
- The banner at the top of the page has a "Reset demo data" link that returns
  everything to the starting state.
- Passwords are neither stored nor checked in the demo. Visitors are told not
  to enter a real password.
- No emails are sent, no payments are taken and no real orders exist.
- Products, prices and images are placeholders.


GOING LIVE WITH SUPABASE
------------------------

1. Create a project at supabase.com. In the SQL Editor, run the whole of
   sql/schema.sql.

2. Open js/config.js. Enter the project URL and the anon (publishable) key
   from Project Settings > API, and change mode to 'supabase'.

3. Create an account through the store (Account > Create account). If
   Supabase asks for email confirmation, confirm it (or switch confirmation
   off for testing, and back on for live use).

4. Make that account the administrator by running the following in the
   Supabase SQL Editor, with your own email address:

       update public.profiles set role = 'admin'
        where id = (select id from auth.users where email = 'you@example.com');

5. In Supabase, go to Authentication > URL Configuration and set the Site
   URL to the address where the store is hosted.


UPDATING THE SITE AND SEEING THE CHANGES
----------------------------------------

Browsers keep copies of the site's files, and GitHub Pages tells them they may
keep those copies for a short while (as far as I know, about ten minutes). So
after an update you may still be shown the old version.

To check an update quickly:
- Wait until GitHub has finished publishing (the repository's Actions tab shows
  "pages build and deployment" with a green tick; usually a minute or two).
- Chrome: press Ctrl+Shift+R (Cmd+Shift+R on a Mac) to reload without the
  stored copies. Alternatively open a private window (Ctrl+Shift+N), which
  always starts clean and also shows what a first-time visitor will see.
- The footer shows the build number (for example "v0.4"). If it is the old
  number, you are still looking at the old files.

To preview changes before uploading: double-click index.html on your computer
and it opens in your browser without GitHub. (Demo mode needs no server.)

If you edit any file by hand, change the version number in index.html (every
"?v=" and the footer text) so that browsers fetch the new files instead of the
stored copies.


DEPLOYING ON GITHUB PAGES
-------------------------

1. Create a repository and upload the contents of this folder so that
   index.html is at the top level.

2. In the repository, open Settings > Pages and choose to deploy from the
   main branch, root folder.

3. The store is then served at the address GitHub shows on that page.


SECURITY NOTES
--------------

- In live mode, the anon key is designed to be public. Security rests on the
  row-level security rules and the place_order function in sql/schema.sql, not
  on hiding the key.

- Never put the service_role (secret) key in any file of this repository.

- In live mode, prices, stock and delivery fees are decided by the database.
  Changes to products, settings and order status are restricted to
  administrators.

- Demo mode has no real security: its sign-in is simulated in the browser and
  must never be used for a live site.

- The delivery threshold, delivery fee and tax rate are stored in the
  settings table (live mode) and are edited in Admin > Settings.


NOT YET INCLUDED
----------------

Order notifications to the store, card payments, and search-engine-friendly
product pages.
