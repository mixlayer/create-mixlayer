# create-mixlayer

`npm create` script for mixlayer apps.

This script will set up your project with 2 compilation targets:

- `api/` a [Hono](https://hono.dev) streaming backend API for chat
- `app/` a simple React frontend with a chat UI

## Requirements

- **node.js** version >= 20.18
- **Mixlayer CLI** a local Mixlayer installation, install using `brew tap mixlayer/tap && brew install mixlayer-cli`.

## Example

```bash
$ npm create mixlayer@latest

◆  Create Mixlayer Project
│
◇  Project name or path
│  my-project
│
◇  Initialize git repository?
│  No
│
◇  Next steps ────────╮
│                     │
│  1. cd my-project   │
│  2. npm install     │
│  3. npm run dev     │
│                     │
├─────────────────────╯
│
└  All set, happy coding!
```
