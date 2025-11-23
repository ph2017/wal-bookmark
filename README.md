# walrus-bookmark

A bookmark management tool used to associate Sui objects with Walrus blob objects and perform related operations on the blobs.

## Development

To start the development server, run:

```bash
# install packages
pnpm install
# start dev
pnpm dev 
```

## Building for Production

To build the application for production, run:

```bash
pnpm build
```

## Features Roadmap

- [x] Search for Sui objects and add them to bookmarks
- [ ] Add Walrus blob object operations, such as extending validity, downloading, and deleting
- [ ] Add subscription for Walrus blob object expiration time, with email notifications for expiring blobs