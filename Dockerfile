# ───── ساخت ─────
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npx tsc -b && npx vite build --mode remote && npm run build:server

# ───── اجرا ─────
FROM node:22-bookworm-slim
ENV NODE_ENV=production TZ=Asia/Tehran DATA_DIR=/data STATIC_DIR=/app/dist PORT=8080
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--no-warnings", "dist-server/index.mjs"]
