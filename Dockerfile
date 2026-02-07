# Wir nutzen Node.js 20
FROM node:20-slim

# Arbeitsordner im Container erstellen
WORKDIR /app

# Kopiere die package.json, um Abhängigkeiten zu installieren
COPY package*.json ./
RUN npm install --production

# Kopiere den restlichen Code (app.js)
COPY . .

# Wir sagen dem Container, dass er auf Port 3000 hören soll
EXPOSE 3000

# Der Befehl, um die App zu starten
CMD ["node", "app.js"]
