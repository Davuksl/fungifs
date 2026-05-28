# Discord GIF Rotator

A simple Express server that serves random GIFs from a GitHub-hosted list. Designed to bypass Discord's image caching by appending a random byte to each GIF response.

## Features

- **Random GIF Serving**: Serves a random GIF from a remote text list.
- **Cache Bypassing**: Uses random byte injection and cache-control headers to prevent Discord and clients from caching the image.
- **Dynamic List Updates**: Automatically refreshes the GIF list from GitHub every minute.
- **Health Check**: Endpoint to monitor the server status.
- **Graceful Shutdown**: Properly closes the server and clears intervals on termination.

## Configuration

You can configure the server using environment variables:

- `PORT`: The port the server will listen on (default: `3000`).
- `GIF_LIST_URL`: The URL to the text file containing the list of GIF URLs (default: GitHub `Davuksl/giflist`).

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

## Endpoints

- `GET /fun.gif`: Serves a random GIF.
- `GET /health`: Returns server status and GIF count.
