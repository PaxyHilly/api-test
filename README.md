# AI Hub Chat

A static ChatGPT-style UI for GitHub Pages that supports multiple providers and model lists.

## New: File & Image Uploading
This update adds client-side file and image attachments. You can attach images or files (up to 4 MB each) from the composer. Attachments will be displayed inline in the conversation and sent to the provider as base64-encoded attachments in the request body under an "attachments" field.

Notes:
- Because this is a static front-end app (GitHub Pages), attachments are encoded in the browser and included in the request payload. Some providers may ignore attachments unless you use a backend that understands them. If you use a proxy server, it can extract the attachments and forward them to multimodal endpoints.
- File size is limited to 4 MB per file to avoid huge payloads in a browser environment.

## How to use attachments
1. Click Attach and choose files or images.
2. They appear next to the composer. You can remove them before sending.
3. Click Send — the message plus attachments will be sent to the selected provider.

## Deploy to GitHub Pages
1. Push these files to the repository root.
2. Settings → Pages → set source to the default branch.

## Security
- API keys and attachments are handled in-browser and stored in localStorage for settings. Do not use this in production with secret keys or sensitive files — prefer a backend proxy.
