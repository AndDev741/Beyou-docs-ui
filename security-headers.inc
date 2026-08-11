# Included into every location rather than set once on the server block.
#
# nginx's add_header does not merge across contexts: the moment a location
# declares one header, it stops inheriting every add_header from its parent. So
# a server-level block would silently vanish from exactly the responses that set
# their own Cache-Control -- which was happening to /assets/, the favicon and the
# social image. Including the list keeps them on every response.
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
