# Tubenode

A video streaming and social media backend API built with Node.js, Express, MongoDB, and Cloudinary.

[Database Schema Design](https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj)

---

## Features

- **Authentication**: JWT access & refresh tokens, bcrypt password hashing.
- **Users**: Registration with avatar and cover uploads (Cloudinary), profile updates, and watch history.
- **Videos**: Upload, pagination, search, update, delete, and publish toggling.
- **Tweets & Comments**: Create, edit, delete, and view tweets and video comments.
- **Likes & Subscriptions**: Like videos, tweets, and comments; subscribe to channels.
- **Playlists**: Create, update, and manage videos in custom playlists.
- **Dashboard**: Channel statistics (subscribers, total views, likes, videos).

---

## Tech Stack

- **Runtime & Framework**: Node.js (ES Modules), Express.js
- **Database**: MongoDB, Mongoose (`mongoose-aggregate-paginate-v2`)
- **Media Storage**: Multer, Cloudinary
- **Authentication**: JWT, bcrypt

---

## Getting Started

### 1. Installation
```bash
git clone https://github.com/parthvyas7/tubenode.git
cd tubenode
pnpm install
```

### 2. Environment Setup
Configure your environment variables by creating a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### 3. Run
```bash
# Development
pnpm dev

# Production
pnpm start
```

---

## API Routes

Base URL: `http://localhost:8000/api/v1`

| Resource | Methods & Paths | Description |
| :--- | :--- | :--- |
| **Healthcheck** | `GET /healthcheck` | Server health check |
| **Users** | `POST /users/register`<br>`POST /users/login`<br>`POST /users/refresh-token`<br>`POST /users/logout`<br>`POST /users/change-password`<br>`GET /users/current-user`<br>`PATCH /users/update-account`<br>`PATCH /users/avatar`<br>`PATCH /users/cover-image`<br>`GET /users/c/:username`<br>`GET /users/history` | Auth, profile updates, media uploads, channel profile, watch history |
| **Videos** | `GET /videos`<br>`POST /videos`<br>`GET /videos/:videoId`<br>`PATCH /videos/:videoId`<br>`DELETE /videos/:videoId`<br>`PATCH /videos/toggle/publish/:videoId` | Feed, upload, view, edit, delete, toggle publish status |
| **Comments** | `GET /comments/:videoId`<br>`POST /comments/:videoId`<br>`PATCH /comments/c/:commentId`<br>`DELETE /comments/c/:commentId` | Comment feed, add, edit, delete |
| **Tweets** | `POST /tweets`<br>`GET /tweets/user/:userId`<br>`PATCH /tweets/:tweetId`<br>`DELETE /tweets/:tweetId` | Create, view, edit, delete tweets |
| **Likes** | `POST /likes/toggle/v/:videoId`<br>`POST /likes/toggle/c/:commentId`<br>`POST /likes/toggle/t/:tweetId`<br>`GET /likes/videos` | Toggle likes on videos/comments/tweets, view liked videos |
| **Subscriptions** | `POST /subscriptions/c/:channelId`<br>`GET /subscriptions/c/:channelId`<br>`GET /subscriptions/u/:subscriberId` | Toggle subscriptions, view channel subscribers and subscribed channels |
| **Playlists** | `POST /playlist`<br>`GET /playlist/:playlistId`<br>`PATCH /playlist/:playlistId`<br>`DELETE /playlist/:playlistId`<br>`PATCH /playlist/add/:videoId/:playlistId`<br>`PATCH /playlist/remove/:videoId/:playlistId`<br>`GET /playlist/user/:userId` | Create, view, update, delete playlists; add/remove videos |
| **Dashboard** | `GET /dashboard/stats`<br>`GET /dashboard/videos` | Channel statistics and uploaded videos |

---

## Postman Collection

Import [`tubenode.postman_collection.json`](./tubenode.postman_collection.json) into Postman to test all routes with pre-configured variables and request bodies.