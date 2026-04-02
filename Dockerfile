FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy everything
COPY . .

# install backend deps
WORKDIR /app/backend
RUN npm install

# install frontend deps and build
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# set up prisma and seed
WORKDIR /app/backend
RUN npx prisma generate
RUN npx prisma db push
RUN npx prisma db seed

# start the server
EXPOSE ${PORT:-3000}
CMD ["sh", "-c", "node src/server.js ${PORT:-3000}"]
