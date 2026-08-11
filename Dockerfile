FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
# Canonical origin baked into every canonical, hreflang and og:url tag, plus the
# sitemap. Wrong here means the whole site advertises URLs that do not exist.
ARG SITE_URL=https://docs.beyouweb.com
# Where the prerenderer reads content from. The public docs API, because that is
# what the running app reads -- see the header of scripts/prerender.mts.
ARG PRERENDER_API_URL=https://api.beyouweb.com/api/v1
ENV SITE_URL=${SITE_URL}
ENV PRERENDER_API_URL=${PRERENDER_API_URL}
ENV VITE_SITE_URL=${SITE_URL}
# VITE_BACKEND_URL is deliberately NOT set: unset, the client derives the API
# base from its own origin (src/lib/apiBase.ts) and reaches the backend through
# this image's nginx proxy. Baking an absolute URL would pin the image to one
# hostname and turn every request cross-origin.
COPY . .
# `build` runs vite build and then the prerender, which needs the docs API to be
# reachable from the builder. It fails loudly on an empty collection rather than
# publishing a site with blank sections.
RUN npm run build

FROM nginx:1.27-alpine AS nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Not a server block, just a header list that each location includes -- see the
# file for why it cannot live on the server block instead. Kept out of conf.d
# and off the .conf extension, because the base image auto-includes
# conf.d/*.conf into the http context and this is meant to be pulled in
# explicitly, once per location.
COPY security-headers.inc /etc/nginx/security-headers.inc
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
